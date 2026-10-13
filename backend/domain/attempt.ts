export const ATTEMPT_STATUSES = ["DRAFT", "SUBMITTED", "EVALUATING", "COMPLETED", "FAILED"] as const;
export type AttemptStatus = typeof ATTEMPT_STATUSES[number];
const transitions: Record<AttemptStatus, readonly AttemptStatus[]> = {
 DRAFT: ["SUBMITTED"], SUBMITTED: ["EVALUATING"], EVALUATING: ["COMPLETED", "FAILED"], FAILED: ["EVALUATING"], COMPLETED: []
};
export function assertCanTransition(from: AttemptStatus, to: AttemptStatus): void {
 if (!transitions[from].includes(to)) throw new Error("Invalid attempt transition: " + from + " -> " + to);
}
export const EVALUATION_STALE_MS = 120_000;
