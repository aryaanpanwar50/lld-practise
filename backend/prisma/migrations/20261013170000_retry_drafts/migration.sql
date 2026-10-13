ALTER TABLE "drafts" ADD COLUMN "draft_key" TEXT NOT NULL DEFAULT 'active';

DROP INDEX IF EXISTS "drafts_one_per_user_problem";
CREATE UNIQUE INDEX "drafts_one_per_user_problem_key"
ON "drafts"("user_id", "problem_id", "draft_key");