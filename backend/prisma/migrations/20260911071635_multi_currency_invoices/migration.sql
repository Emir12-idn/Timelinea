-- AlterTable
ALTER TABLE "cash_transactions" ADD COLUMN     "exchange_rate" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "purchase_invoices" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'IDR',
ADD COLUMN     "exchange_rate" DECIMAL(18,4) NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'IDR',
ADD COLUMN     "exchange_rate" DECIMAL(18,4) NOT NULL DEFAULT 1;
