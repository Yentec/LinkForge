-- CreateTable
CREATE TABLE "clicks" (
    "id" UUID NOT NULL,
    "linkId" UUID NOT NULL,
    "country" TEXT,
    "deviceType" TEXT NOT NULL,
    "browser" TEXT,
    "referrerHost" TEXT,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clicks_linkId_createdAt_idx" ON "clicks"("linkId", "createdAt");

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
