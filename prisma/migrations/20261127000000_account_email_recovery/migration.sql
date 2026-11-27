ALTER TABLE "User"
ADD COLUMN "email" TEXT,
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "pendingEmail" TEXT,
ADD COLUMN "requiresEmailVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "verificationTokenHash" TEXT,
ADD COLUMN "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_verificationTokenHash_key" ON "User"("verificationTokenHash");
CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");
