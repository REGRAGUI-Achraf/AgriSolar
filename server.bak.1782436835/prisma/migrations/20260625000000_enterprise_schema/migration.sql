-- Create enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES');
CREATE TYPE "ProductCategory" AS ENUM ('PANEL', 'PUMP', 'INVERTER', 'ACCESSORY');
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Create tables
CREATE TABLE "User" (
	"id" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"password" TEXT NOT NULL,
	"role" "UserRole" NOT NULL DEFAULT 'SALES',
	"fullName" TEXT,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"lastLoginAt" TIMESTAMP(3),
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Client" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"phone" TEXT,
	"email" TEXT,
	"address" TEXT,
	"city" TEXT,
	"region" TEXT,
	"country" TEXT,
	"notes" TEXT,
	"latitude" DOUBLE PRECISION NOT NULL,
	"longitude" DOUBLE PRECISION NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"deletedAt" TIMESTAMP(3),

	CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
	"id" TEXT NOT NULL,
	"sku" TEXT,
	"name" TEXT NOT NULL,
	"brand" TEXT,
	"category" "ProductCategory" NOT NULL,
	"unit" TEXT NOT NULL DEFAULT 'piece',
	"stock" INTEGER NOT NULL DEFAULT 0,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"price" DOUBLE PRECISION NOT NULL,
	"specifications" JSONB NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"deletedAt" TIMESTAMP(3),

	CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quote" (
	"id" TEXT NOT NULL,
	"quoteNumber" TEXT NOT NULL,
	"clientId" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
	"totalPrice" DOUBLE PRECISION NOT NULL,
	"currency" TEXT NOT NULL DEFAULT 'MAD',
	"validUntil" TIMESTAMP(3),
	"notes" TEXT,
	"deletedAt" TIMESTAMP(3),
	"wellDepth" DOUBLE PRECISION NOT NULL,
	"irrigationSurface" DOUBLE PRECISION NOT NULL,
	"cropType" TEXT NOT NULL,
	"dailyWaterNeed" DOUBLE PRECISION NOT NULL,
	"requiredPower" DOUBLE PRECISION NOT NULL,
	"panelCount" INTEGER NOT NULL,
	"pumpModel" TEXT NOT NULL,
	"basinVolume" DOUBLE PRECISION NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- Indexes / unique constraints
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

CREATE INDEX "Client_name_idx" ON "Client"("name");
CREATE INDEX "Client_deletedAt_idx" ON "Client"("deletedAt");

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_deletedAt_idx" ON "Quote"("deletedAt");

-- Foreign keys
ALTER TABLE "Quote"
ADD CONSTRAINT "Quote_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Quote"
ADD CONSTRAINT "Quote_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
