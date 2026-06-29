-- DropIndex
DROP INDEX "Product_isActive_idx";

-- DropIndex
DROP INDEX "User_isActive_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "unit" DROP NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "culture" TEXT,
ADD COLUMN     "inclinaison" DOUBLE PRECISION,
ADD COLUMN     "profondeur" DOUBLE PRECISION,
ADD COLUMN     "surfaceHa" DOUBLE PRECISION,
ADD COLUMN     "tensionSysteme" TEXT,
ADD COLUMN     "totalHT" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalTTC" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "tva" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "typeInstall" TEXT,
ADD COLUMN     "volumeJour" DOUBLE PRECISION,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "marque" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixUnitaireHT" DOUBLE PRECISION NOT NULL,
    "totalLigneHT" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanneauPhotovoltaique" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "puissanceCrete" DECIMAL(65,30) NOT NULL,
    "technologie" TEXT NOT NULL,
    "tensionVmp" DECIMAL(65,30) NOT NULL,
    "courantImp" DECIMAL(65,30) NOT NULL,
    "prixIndicatif" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanneauPhotovoltaique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PompeHydraulique" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "puissance" DECIMAL(65,30) NOT NULL,
    "debitNominal" DECIMAL(65,30) NOT NULL,
    "hmtMax" DECIMAL(65,30) NOT NULL,
    "prixIndicatif" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PompeHydraulique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariateurSolaire" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "puissanceMax" DECIMAL(65,30) NOT NULL,
    "plageMpptMin" DECIMAL(65,30) NOT NULL,
    "plageMpptMax" DECIMAL(65,30) NOT NULL,
    "courantSortieMax" DECIMAL(65,30) NOT NULL,
    "prixIndicatif" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariateurSolaire_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
