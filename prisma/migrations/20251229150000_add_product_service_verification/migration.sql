-- AlterTable
ALTER TABLE "Product" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "createdBy" TEXT;

-- CreateIndex
CREATE INDEX "Product_isVerified_idx" ON "Product"("isVerified");

-- CreateIndex
CREATE INDEX "Product_createdBy_idx" ON "Product"("createdBy");

-- CreateIndex
CREATE INDEX "Service_isVerified_idx" ON "Service"("isVerified");

-- CreateIndex
CREATE INDEX "Service_createdBy_idx" ON "Service"("createdBy");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

