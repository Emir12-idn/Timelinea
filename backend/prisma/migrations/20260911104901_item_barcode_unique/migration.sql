/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `items` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "items_barcode_key" ON "items"("barcode");
