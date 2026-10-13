import { afterEach, describe, expect, it, vi } from "vitest";
import { AIEvaluator, type AIInput } from "./ai";

const structuredInvoke = vi.hoisted(() => vi.fn());
vi.mock("@langchain/google", () => ({
  ChatGoogle: class {
    withStructuredOutput() { return { invoke: structuredInvoke }; }
  }
}));

const input: AIInput = {
  problem: { title: "Parking Lot", description: "Park cars.", requirements: ["Park cars"], constraints: [], checklist: ["Check allocation"], rubric: [{ criterion: "Allocation", description: "Spot allocation" }, { criterion: "Responsibilities", description: "Focused classes" }] },
  submission: { classes: [{ name: "ParkingLot", kind: "class", responsibilities: ["assign spots"], attributes: [], methods: ["park"] }], relationships: [], designNotes: "Uses a first available spot." },
  ruleFindings: []
};
const reply = (overrides: Record<string, unknown> = {}) => ({
  strengths: [{ title: "Clear owner", detail: "ParkingLot owns allocation." }],
  issues: [{ severity: "minor", title: "Allocation policy", explanation: "The policy may need flexibility.", evidence: "ParkingLot" }],
  suggestions: [{ title: "Consider policy boundaries", detail: "Review allocation changes." }],
  acknowledgesMultipleValidDesigns: true,
  replacementSolution: false,
  scoreBreakdown: [{ criterion: "Allocation", score: 4, comment: "Clear" }, { criterion: "Responsibilities", score: 3, comment: "Reasonable" }],
  ...overrides
});
function mock(payload: unknown) { structuredInvoke.mockResolvedValue(payload); }

describe("AIEvaluator validation", () => {
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("accepts structured feedback and computes the total itself", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test"); vi.stubEnv("LLM_MODEL", "test-model");
    mock(reply());
    const out = await new AIEvaluator().evaluate(input);
    expect(out.totalScore).toBe(7);
    expect(out.issues[0].source).toBe("ai");
  });

  it("drops an issue whose evidence is absent from the saved submission", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test"); vi.stubEnv("LLM_MODEL", "x");
    mock(reply({ issues: [{ severity: "major", title: "Unsupported", explanation: "Claim", evidence: "Not in design" }] }));
    const out = await new AIEvaluator().evaluate(input);
    expect(out.issues).toEqual([]);
  });

  it("keeps written feedback when only the score breakdown is invalid", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test"); vi.stubEnv("LLM_MODEL", "x");
    mock(reply({ scoreBreakdown: [{ criterion: "Allocation", score: 9, comment: "bad" }] }));
    const out = await new AIEvaluator().evaluate(input);
    expect(out.strengths).toHaveLength(1);
    expect(out.scoreBreakdown).toBeNull();
    expect(out.totalScore).toBeNull();
  });

  it("rejects unsafe acknowledgement values", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test"); vi.stubEnv("LLM_MODEL", "x");
    mock(reply({ acknowledgesMultipleValidDesigns: false }));
    await expect(new AIEvaluator().evaluate(input)).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });

  it("requires Gemini credentials", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(new AIEvaluator().evaluate(input)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });
});
