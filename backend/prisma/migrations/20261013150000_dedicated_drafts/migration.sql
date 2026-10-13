CREATE TABLE "drafts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "problem_id" UUID NOT NULL,
  "based_on_attempt_id" UUID,
  "submission" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

INSERT INTO "drafts" (
  "id", "user_id", "problem_id", "based_on_attempt_id", "submission", "created_at", "updated_at"
)
SELECT DISTINCT ON ("user_id", "problem_id")
  gen_random_uuid(), "user_id", "problem_id", "based_on_attempt_id", "submission", "created_at", "updated_at"
FROM "attempts"
WHERE "status" = 'DRAFT'
ORDER BY "user_id", "problem_id", "updated_at" DESC, "created_at" DESC;

ALTER TABLE "drafts"
  ADD CONSTRAINT "drafts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "drafts"
  ADD CONSTRAINT "drafts_problem_id_fkey"
  FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "drafts_one_per_user_problem" ON "drafts"("user_id", "problem_id");
CREATE INDEX "drafts_user_id_updated_at_idx" ON "drafts"("user_id", "updated_at");

DROP INDEX IF EXISTS "attempts_one_active_draft_per_user_problem";
ALTER TABLE "attempts" DROP COLUMN IF EXISTS "draft_key";
DELETE FROM "attempts" WHERE "status" = 'DRAFT';
