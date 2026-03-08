-- Extend Asset for real asset-pipeline metadata
ALTER TABLE "Asset"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready',
ADD COLUMN "originalObjectKey" TEXT,
ADD COLUMN "normalizedObjectKey" TEXT,
ADD COLUMN "sizeBytes" INTEGER,
ADD COLUMN "dpiX" DOUBLE PRECISION,
ADD COLUMN "dpiY" DOUBLE PRECISION,
ADD COLUMN "colorSpace" TEXT,
ADD COLUMN "iccProfileRef" TEXT,
ADD COLUMN "sha256" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- CreateTable
CREATE TABLE "AssetVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "variantKind" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FontFamily" (
    "id" TEXT NOT NULL,
    "familyKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FontFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FontFile" (
    "id" TEXT NOT NULL,
    "fontFamilyId" TEXT NOT NULL,
    "assetId" TEXT,
    "fileKey" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "weight" TEXT,
    "style" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FontFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetVariant_assetId_variantKind_key" ON "AssetVariant"("assetId", "variantKind");

-- CreateIndex
CREATE INDEX "AssetVariant_variantKind_idx" ON "AssetVariant"("variantKind");

-- CreateIndex
CREATE UNIQUE INDEX "FontFamily_familyKey_key" ON "FontFamily"("familyKey");

-- CreateIndex
CREATE INDEX "FontFile_fontFamilyId_idx" ON "FontFile"("fontFamilyId");

-- CreateIndex
CREATE INDEX "FontFile_assetId_idx" ON "FontFile"("assetId");

-- AddForeignKey
ALTER TABLE "AssetVariant" ADD CONSTRAINT "AssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FontFile" ADD CONSTRAINT "FontFile_fontFamilyId_fkey" FOREIGN KEY ("fontFamilyId") REFERENCES "FontFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FontFile" ADD CONSTRAINT "FontFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
