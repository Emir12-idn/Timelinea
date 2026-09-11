-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" INTEGER;

