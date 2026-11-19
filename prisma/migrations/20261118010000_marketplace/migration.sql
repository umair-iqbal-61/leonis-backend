CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD');
CREATE TABLE "Listing" (
  "id" SERIAL NOT NULL, "userId" INTEGER NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL, "species" TEXT NOT NULL,
  "breed" TEXT, "age" INTEGER, "price" DECIMAL(12,2) NOT NULL,
  "location" TEXT NOT NULL, "phone" TEXT NOT NULL, "whatsapp" TEXT NOT NULL,
  "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "publishedAt" TIMESTAMP(3),
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ListingPhoto" (
  "id" SERIAL NOT NULL, "listingId" INTEGER NOT NULL, "url" TEXT NOT NULL, "storageKey" TEXT NOT NULL,
  CONSTRAINT "ListingPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ListingPhoto_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Listing_status_publishedAt_id_idx" ON "Listing"("status", "publishedAt", "id");
CREATE INDEX "Listing_userId_updatedAt_idx" ON "Listing"("userId", "updatedAt");
CREATE INDEX "ListingPhoto_listingId_idx" ON "ListingPhoto"("listingId");
