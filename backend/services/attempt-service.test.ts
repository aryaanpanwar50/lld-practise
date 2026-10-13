import { beforeEach, describe, expect, it, vi } from "vitest";
const { db, aiEvaluate } = vi.hoisted(() => ({ db: vi.fn(), aiEvaluate: vi.fn() }));
vi.mock("../runtime", () => ({ db, ApiError: class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } } }));
const { evaluateAttempt, createDraft, saveDraft, submitAttempt } = await import("./attempt-service");
import { AIEvaluator } from "../evaluation/ai";
vi.mock("../evaluation/ai", () => ({ AIEvaluator: class { evaluate(...args: any[]) { return aiEvaluate(...args); } } }));

const design = { classes: [{ name: "Car", kind: "class", responsibilities: [], attributes: [], methods: [] }], relationships: [], designNotes: "" };
const problem = { id: "p", title: "Parking", description: "Design parking", requirements: [], constraints: [], checklist: [], rubric: [{ criterion: "Core", description: "Core" }] };
let p: any;

beforeEach(() => {
  vi.clearAllMocks();
  p = {
    problem: { findUnique: vi.fn().mockResolvedValue(problem) },
    draft: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "draft", submission: design }),
      create: vi.fn().mockResolvedValue({ id: "draft", draftKey: "active", submission: design }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: "a", status: "SUBMITTED", submission: design }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirst: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ id: "a", status: "SUBMITTED", submission: design, problem }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "a", status: "SUBMITTED", submission: design, problem, evaluationResult: null })
    },
    evaluationResult: { upsert: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn({ attempt: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "a", status: "COMPLETED", evaluationResult: { totalScore: 4 } }) }, evaluationResult: { upsert: vi.fn() } }))
  };
  db.mockResolvedValue(p);
});

describe("AttemptService", () => {
  it("creates an isolated retry draft from an owned prior submission", async () => {
    p.attempt.findFirst.mockResolvedValue({ id: "prior", submission: design });
    await createDraft("u", "p", "prior");
    expect(p.draft.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ basedOnAttemptId: "prior", draftKey: "retry:prior", submission: design }) }));
  });

  it("reopens the active draft for the same user and problem", async () => {
    const active = { id: "draft", draftKey: "active" };
    p.draft.findUnique.mockResolvedValue(active);
    await expect(createDraft("u", "p")).resolves.toBe(active);
    expect(p.draft.create).not.toHaveBeenCalled();
  });

  it("refuses to copy another user's attempt", async () => {
    p.attempt.findFirst.mockResolvedValue(null);
    await expect(createDraft("u", "p", "private")).rejects.toMatchObject({ status: 404 });
  });

  it("does not expose or update another user's draft", async () => {
    p.draft.updateMany.mockResolvedValue({ count: 0 });
    await expect(saveDraft("u", "other", design)).rejects.toMatchObject({ status: 404, code: "DRAFT_NOT_FOUND" });
  });

  it("creates a submitted snapshot while leaving the draft editable", async () => {
    p.draft.findFirst.mockResolvedValue({ id: "draft", problemId: "p", basedOnAttemptId: null, submission: design });
    await submitAttempt("u", "draft", design);
    expect(p.attempt.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "u", problemId: "p", basedOnAttemptId: null, submission: design, status: "SUBMITTED", submittedAt: expect.any(Date) }) }));
    expect(p.draft.updateMany).not.toHaveBeenCalled();
  });

  it("requires named classes before submission", async () => {
    const unnamed = { ...design, classes: [{ ...design.classes[0], name: "" }] };
    p.draft.findFirst.mockResolvedValue({ id: "draft", problemId: "p", submission: design });
    await expect(submitAttempt("u", "draft", unnamed)).rejects.toMatchObject({ status: 400 });
    expect(p.attempt.create).not.toHaveBeenCalled();
  });

  it("claims evaluation atomically and saves result with completion in one transaction", async () => {
    p.attempt.findUniqueOrThrow.mockResolvedValue({ id: "a", status: "EVALUATING", submission: design, problem });
    aiEvaluate.mockResolvedValue({ strengths: [], issues: [], suggestions: [], scoreBreakdown: [{ criterion: "Core", score: 4, comment: "ok" }], totalScore: 4 });
    const out = await evaluateAttempt("u", "a");
    expect(p.attempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }), data: expect.objectContaining({ status: "EVALUATING", evaluationToken: expect.any(String) }) }));
    expect(p.$transaction).toHaveBeenCalledOnce();
    expect(out.status).toBe("COMPLETED");
  });

  it("returns in-progress for a duplicate concurrent claim", async () => {
    p.attempt.updateMany.mockResolvedValue({ count: 0 });
    p.attempt.findFirst.mockResolvedValue({ id: "a", status: "EVALUATING" });
    await expect(evaluateAttempt("u", "a")).rejects.toMatchObject({ status: 409, code: "EVALUATION_IN_PROGRESS" });
  });

  it("marks failure and permits retry after an AI failure", async () => {
    p.attempt.findUniqueOrThrow.mockResolvedValue({ id: "a", status: "EVALUATING", submission: design, problem });
    aiEvaluate.mockRejectedValue(Object.assign(new Error("offline"), { code: "AI_UNAVAILABLE" }));
    await expect(evaluateAttempt("u", "a")).rejects.toMatchObject({ status: 502, code: "AI_UNAVAILABLE" });
    expect(p.attempt.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", failureCode: "AI_UNAVAILABLE" }) }));
  });

  it("does not let a superseded run store an old result", async () => {
    p.attempt.findUniqueOrThrow.mockResolvedValue({ id: "a", status: "EVALUATING", submission: design, problem });
    vi.spyOn(AIEvaluator.prototype, "evaluate").mockResolvedValue({ strengths: [], issues: [], suggestions: [], scoreBreakdown: null, totalScore: null });
    const upsert = vi.fn();
    p.$transaction.mockImplementation(async (fn: any) => fn({ attempt: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findUniqueOrThrow: vi.fn() }, evaluationResult: { upsert } }));
    p.attempt.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await expect(evaluateAttempt("u", "a")).rejects.toMatchObject({ status: 409, code: "EVALUATION_SUPERSEDED" });
    expect(upsert).not.toHaveBeenCalled();
  });
});
