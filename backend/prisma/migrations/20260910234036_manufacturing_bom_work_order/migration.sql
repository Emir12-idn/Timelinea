-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('draft', 'in_progress', 'done', 'cancelled');

-- CreateTable
CREATE TABLE "bill_of_materials" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bill_of_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_of_material_lines" (
    "id" SERIAL NOT NULL,
    "bom_id" INTEGER NOT NULL,
    "material_item_id" INTEGER NOT NULL,
    "qty_per_unit" DECIMAL(14,4) NOT NULL,
    "uom" TEXT NOT NULL,

    CONSTRAINT "bill_of_material_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "product_item_id" INTEGER NOT NULL,
    "bom_id" INTEGER NOT NULL,
    "planned_qty" DECIMAL(14,3) NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "conversion_cost" BIGINT NOT NULL DEFAULT 0,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'draft',
    "project_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bill_of_materials_item_id_version_key" ON "bill_of_materials"("item_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_no_key" ON "work_orders"("no");

-- CreateIndex
CREATE INDEX "work_orders_project_id_idx" ON "work_orders"("project_id");

-- AddForeignKey
ALTER TABLE "bill_of_materials" ADD CONSTRAINT "bill_of_materials_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_material_lines" ADD CONSTRAINT "bill_of_material_lines_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "bill_of_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_of_material_lines" ADD CONSTRAINT "bill_of_material_lines_material_item_id_fkey" FOREIGN KEY ("material_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_product_item_id_fkey" FOREIGN KEY ("product_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "bill_of_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
