-- CreateTable
CREATE TABLE "closed_periods" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_by" INTEGER,

    CONSTRAINT "closed_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "closed_periods_company_id_period_key" ON "closed_periods"("company_id", "period");
