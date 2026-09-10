-- CreateEnum
CREATE TYPE "ChequeGiroType" AS ENUM ('cek', 'giro');

-- CreateEnum
CREATE TYPE "ChequeGiroDirection" AS ENUM ('incoming', 'outgoing');

-- CreateEnum
CREATE TYPE "ChequeGiroStatus" AS ENUM ('pending', 'cleared', 'bounced');

-- CreateTable
CREATE TABLE "cheque_giros" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "type" "ChequeGiroType" NOT NULL,
    "bank_account" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "direction" "ChequeGiroDirection" NOT NULL,
    "status" "ChequeGiroStatus" NOT NULL DEFAULT 'pending',
    "account_id" INTEGER NOT NULL,
    "partner_id" INTEGER,
    "sales_invoice_id" INTEGER,
    "purchase_invoice_id" INTEGER,
    "company_id" INTEGER,
    "cash_transaction_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cheque_giros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cheque_giros_no_key" ON "cheque_giros"("no");

-- CreateIndex
CREATE UNIQUE INDEX "cheque_giros_cash_transaction_id_key" ON "cheque_giros"("cash_transaction_id");

-- AddForeignKey
ALTER TABLE "cheque_giros" ADD CONSTRAINT "cheque_giros_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_giros" ADD CONSTRAINT "cheque_giros_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_giros" ADD CONSTRAINT "cheque_giros_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_giros" ADD CONSTRAINT "cheque_giros_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_giros" ADD CONSTRAINT "cheque_giros_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_giros" ADD CONSTRAINT "cheque_giros_cash_transaction_id_fkey" FOREIGN KEY ("cash_transaction_id") REFERENCES "cash_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
