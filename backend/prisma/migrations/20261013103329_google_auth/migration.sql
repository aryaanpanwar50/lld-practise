/*
  Warnings:

  - You are about to drop the column `score_breakdown` on the `evaluation_results` table. All the data in the column will be lost.
  - You are about to drop the column `picture_url` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "attempts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "discussions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "evaluation_results" DROP COLUMN "score_breakdown",
ADD COLUMN     "scoreBreakdown" JSONB;

-- AlterTable
ALTER TABLE "problems" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "picture_url",
ADD COLUMN     "pictureUrl" TEXT;
