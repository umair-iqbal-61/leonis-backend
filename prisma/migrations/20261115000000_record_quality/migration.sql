CREATE TYPE "DairyRecordKind" AS ENUM ('MILK_YIELD', 'BREEDING', 'CALVING');
CREATE TYPE "QualityStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED');

CREATE TABLE "DairyRecord" (
    "id" SERIAL PRIMARY KEY,
    "petId" INTEGER NOT NULL REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "kind" "DairyRecordKind" NOT NULL,
    "recordedOn" DATE NOT NULL,
    "liters" DECIMAL(65,30),
    "notes" TEXT
);

CREATE TABLE "QualityFinding" (
    "id" SERIAL PRIMARY KEY,
    "petId" INTEGER NOT NULL REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "fingerprint" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "records" JSONB NOT NULL,
    "explanationKey" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "status" "QualityStatus" NOT NULL DEFAULT 'OPEN',
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "reviewedAt" TIMESTAMP(3)
);

CREATE INDEX "DairyRecord_petId_recordedOn_idx" ON "DairyRecord"("petId", "recordedOn");
CREATE UNIQUE INDEX "QualityFinding_petId_fingerprint_key" ON "QualityFinding"("petId", "fingerprint");
CREATE INDEX "QualityFinding_petId_active_idx" ON "QualityFinding"("petId", "active");
