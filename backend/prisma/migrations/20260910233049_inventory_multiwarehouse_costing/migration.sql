-- CreateEnum
CREATE TYPE "CostingMethod" AS ENUM ('average', 'fifo');

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "costing_method" "CostingMethod" NOT NULL DEFAULT 'average';

-- AlterTable
ALTER TABLE "stock_moves" ADD COLUMN     "batch_no" TEXT,
ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "serial_no" TEXT,
ADD COLUMN     "unit_cost" BIGINT,
ADD COLUMN     "warehouse_id" INTEGER;

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_layers" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "qty_remaining" DECIMAL(14,3) NOT NULL,
    "unit_cost" BIGINT NOT NULL,
    "in_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_layers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "stock_layers_item_id_warehouse_id_idx" ON "stock_layers"("item_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_moves_warehouse_id_idx" ON "stock_moves"("warehouse_id");

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_layers" ADD CONSTRAINT "stock_layers_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
