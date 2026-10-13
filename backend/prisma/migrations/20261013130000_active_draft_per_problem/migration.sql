ALTER TABLE "attempts" ADD COLUMN "draft_key" TEXT;

WITH ranked_drafts AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "user_id", "problem_id"
    ORDER BY "updated_at" DESC, "created_at" DESC
  ) AS position
  FROM "attempts"
  WHERE "status" = 'DRAFT'
)
UPDATE "attempts" AS attempt
SET "draft_key" = 'active'
FROM ranked_drafts
WHERE attempt."id" = ranked_drafts."id"
  AND ranked_drafts.position = 1;

CREATE UNIQUE INDEX "attempts_one_active_draft_per_user_problem"
ON "attempts"("user_id", "problem_id", "draft_key");
