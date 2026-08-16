/*
  Warnings:

  - You are about to drop the column `gr_id` on the `purchase_invoices` table. All the data in the column will be lost.
  - You are about to drop the `goods_receipt_lines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `goods_receipts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "goods_receipt_lines_gr_id_fkey";

-- DropForeignKey
ALTER TABLE "goods_receipt_lines" DROP CONSTRAINT "goods_receipt_lines_po_line_id_fkey";

-- DropForeignKey
ALTER TABLE "goods_receipts" DROP CONSTRAINT "goods_receipts_po_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_invoices" DROP CONSTRAINT "purchase_invoices_gr_id_fkey";

-- AlterTable
ALTER TABLE "purchase_invoices" DROP COLUMN "gr_id",
ADD COLUMN     "po_id" INTEGER;

-- DropTable
DROP TABLE "goods_receipt_lines";

-- DropTable
DROP TABLE "goods_receipts";

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
