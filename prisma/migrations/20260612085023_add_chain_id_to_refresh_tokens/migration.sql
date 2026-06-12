/*
  Warnings:

  - Added the required column `chainId` to the `refresh_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "chainId" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE INDEX "refresh_tokens_chainId_idx" ON "refresh_tokens"("chainId");
