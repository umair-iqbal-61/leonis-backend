CREATE TABLE "Barn" (
 "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "location" TEXT, "notes" TEXT, "archived" BOOLEAN NOT NULL DEFAULT false,
 "version" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Barn_userId_requestId_key" UNIQUE ("userId", "requestId")
);
CREATE TABLE "BarnMembership" (
 "id" SERIAL PRIMARY KEY, "barnId" INTEGER NOT NULL REFERENCES "Barn"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "petId" INTEGER REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "animalReference" INTEGER NOT NULL, "animalName" TEXT NOT NULL, "requestId" TEXT NOT NULL,
 "startedOn" DATE NOT NULL, "endedOn" DATE,
 CONSTRAINT "BarnMembership_animalReference_requestId_key" UNIQUE ("animalReference", "requestId"),
 CONSTRAINT "BarnMembership_dates_check" CHECK ("endedOn" IS NULL OR "endedOn" >= "startedOn")
);
CREATE UNIQUE INDEX "BarnMembership_current_pet_key" ON "BarnMembership"("petId") WHERE "endedOn" IS NULL AND "petId" IS NOT NULL;
CREATE TABLE "BarnEntry" (
 "id" SERIAL PRIMARY KEY, "barnId" INTEGER NOT NULL REFERENCES "Barn"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "petId" INTEGER REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "animalReference" INTEGER, "animalName" TEXT, "requestId" TEXT NOT NULL, "occurredOn" DATE NOT NULL,
 "category" TEXT NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "quantity" DECIMAL(12,3), "unit" TEXT,
 "description" TEXT NOT NULL, "receipt" TEXT, "version" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "BarnEntry_barnId_requestId_key" UNIQUE ("barnId", "requestId"),
 CONSTRAINT "BarnEntry_amount_check" CHECK ("amount" > 0),
 CONSTRAINT "BarnEntry_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0)
);
CREATE TABLE "BarnPayment" (
 "id" SERIAL PRIMARY KEY, "entryId" INTEGER NOT NULL REFERENCES "BarnEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "requestId" TEXT NOT NULL, "paidOn" DATE NOT NULL, "amount" DECIMAL(14,2) NOT NULL, "note" TEXT,
 CONSTRAINT "BarnPayment_entryId_requestId_key" UNIQUE ("entryId", "requestId"),
 CONSTRAINT "BarnPayment_amount_check" CHECK ("amount" > 0)
);
CREATE INDEX "Barn_userId_archived_idx" ON "Barn"("userId", "archived");
CREATE INDEX "BarnMembership_barnId_startedOn_idx" ON "BarnMembership"("barnId", "startedOn");
CREATE INDEX "BarnMembership_petId_endedOn_idx" ON "BarnMembership"("petId", "endedOn");
CREATE INDEX "BarnEntry_barnId_occurredOn_idx" ON "BarnEntry"("barnId", "occurredOn");
CREATE INDEX "BarnEntry_barnId_animalReference_idx" ON "BarnEntry"("barnId", "animalReference");
CREATE INDEX "BarnPayment_entryId_paidOn_idx" ON "BarnPayment"("entryId", "paidOn");
