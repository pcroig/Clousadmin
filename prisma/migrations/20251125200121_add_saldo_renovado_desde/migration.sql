-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('month', 'year');

-- AlterTable
ALTER TABLE "ausencias" ADD COLUMN     "diasDesdeCarryOver" DECIMAL(4,1) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "empleado_saldo_ausencias" ADD COLUMN     "carryOverAsignado" DECIMAL(4,1) NOT NULL DEFAULT 0,
ADD COLUMN     "carryOverExpiraEn" TIMESTAMP(3),
ADD COLUMN     "carryOverFuenteAnio" SMALLINT,
ADD COLUMN     "carryOverPendiente" DECIMAL(4,1) NOT NULL DEFAULT 0,
ADD COLUMN     "carryOverUsado" DECIMAL(4,1) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "empleados" ADD COLUMN     "saldoRenovadoDesde" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "eventos_nomina" ALTER COLUMN "estado" SET DEFAULT 'abierto';

-- AlterTable
ALTER TABLE "nominas" ALTER COLUMN "estado" SET DEFAULT 'pendiente';

-- AlterTable
ALTER TABLE "solicitudes_correccion_fichaje" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "billing_products" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "imagen" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_prices" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "unitAmount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'eur',
    "intervalo" "BillingInterval" NOT NULL DEFAULT 'month',
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "trialDays" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(255),
    "direccion" JSONB,
    "taxId" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "priceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_products_activo_idx" ON "billing_products"("activo");

-- CreateIndex
CREATE INDEX "billing_products_orden_idx" ON "billing_products"("orden");

-- CreateIndex
CREATE INDEX "billing_prices_productoId_idx" ON "billing_prices"("productoId");

-- CreateIndex
CREATE INDEX "billing_prices_activo_idx" ON "billing_prices"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_empresaId_key" ON "billing_customers"("empresaId");

-- CreateIndex
CREATE INDEX "billing_customers_empresaId_idx" ON "billing_customers"("empresaId");

-- CreateIndex
CREATE INDEX "subscriptions_empresaId_idx" ON "subscriptions"("empresaId");

-- CreateIndex
CREATE INDEX "subscriptions_customerId_idx" ON "subscriptions"("customerId");

-- CreateIndex
CREATE INDEX "subscriptions_priceId_idx" ON "subscriptions"("priceId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- AddForeignKey
ALTER TABLE "billing_prices" ADD CONSTRAINT "billing_prices_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "billing_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "billing_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
