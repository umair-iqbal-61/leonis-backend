ALTER TABLE "User" ADD COLUMN "isStoreAdmin" BOOLEAN NOT NULL DEFAULT false;
CREATE TYPE "StoreOrderStatus" AS ENUM ('PENDING', 'AWAITING_QUOTE', 'AWAITING_ACCEPTANCE', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "DeliveryMode" AS ENUM ('STANDARD', 'QUOTE');
CREATE TABLE "Product" (
  "id" SERIAL PRIMARY KEY, "sellerId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" TEXT NOT NULL, "description" TEXT NOT NULL, "category" TEXT NOT NULL, "species" TEXT[] NOT NULL,
  "price" DECIMAL(12,2) NOT NULL, "stock" INTEGER NOT NULL DEFAULT 0, "weightGrams" INTEGER NOT NULL,
  "requiresQuote" BOOLEAN NOT NULL DEFAULT false, "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_stock_check" CHECK ("stock" >= 0),
  CONSTRAINT "Product_price_check" CHECK ("price" > 0),
  CONSTRAINT "Product_weight_check" CHECK ("weightGrams" > 0)
);
CREATE TABLE "ProductPhoto" (
  "id" SERIAL PRIMARY KEY, "productId" INTEGER NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "url" TEXT NOT NULL, "storageKey" TEXT NOT NULL
);
CREATE TABLE "StoreSettings" (
  "id" INTEGER PRIMARY KEY DEFAULT 1, "standardFee" DECIMAL(12,2), "standardWeightLimitGrams" INTEGER,
  "checkoutEnabled" BOOLEAN NOT NULL DEFAULT false, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreSettings_singleton" CHECK ("id" = 1)
);
CREATE TABLE "StoreOrder" (
  "id" SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestId" TEXT NOT NULL, "status" "StoreOrderStatus" NOT NULL, "deliveryMode" "DeliveryMode" NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL, "shippingFee" DECIMAL(12,2), "total" DECIMAL(14,2), "weightGrams" INTEGER NOT NULL,
  "quoteVersion" INTEGER NOT NULL DEFAULT 0, "recipientName" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL, "city" TEXT NOT NULL, "province" TEXT NOT NULL, "postalCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreOrder_userId_requestId_key" UNIQUE ("userId", "requestId")
);
CREATE TABLE "StoreOrderItem" (
  "id" SERIAL PRIMARY KEY, "orderId" INTEGER NOT NULL REFERENCES "StoreOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" INTEGER NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL(12,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL, "weightGrams" INTEGER NOT NULL
);
CREATE INDEX "Product_active_category_id_idx" ON "Product"("active", "category", "id");
CREATE INDEX "ProductPhoto_productId_idx" ON "ProductPhoto"("productId");
CREATE INDEX "StoreOrder_userId_createdAt_idx" ON "StoreOrder"("userId", "createdAt");
CREATE INDEX "StoreOrder_status_createdAt_idx" ON "StoreOrder"("status", "createdAt");
CREATE INDEX "StoreOrderItem_orderId_idx" ON "StoreOrderItem"("orderId");
