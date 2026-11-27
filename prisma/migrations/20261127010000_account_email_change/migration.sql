ALTER TABLE "User" ADD COLUMN "emailChangeApprovalHash" TEXT;

CREATE UNIQUE INDEX "User_emailChangeApprovalHash_key" ON "User"("emailChangeApprovalHash");
