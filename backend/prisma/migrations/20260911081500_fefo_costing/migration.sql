-- AlterTable
ALTER TABLE "items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "tracks_expiry" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "stock_layers" ADD COLUMN     "batch_no" TEXT,
ADD COLUMN     "expiry_date" TIMESTAMP(3);

