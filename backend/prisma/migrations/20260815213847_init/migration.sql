-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'hrd_keuangan', 'pic_proyek', 'karyawan');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('customer', 'supplier', 'both');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('tetap', 'harian', 'kontrak');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('stock', 'service');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('draft', 'running', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('draft', 'sent', 'received', 'cancelled');

-- CreateEnum
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('open', 'paid');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('draft', 'sent', 'fulfilled', 'cancelled');

-- CreateEnum
CREATE TYPE "DeliveryOrderStatus" AS ENUM ('draft', 'sent', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('draft', 'sent', 'accepted', 'paid');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('hadir', 'izin', 'sakit', 'alpha');

-- CreateEnum
CREATE TYPE "CashAdvanceStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('straight_line');

-- CreateEnum
CREATE TYPE "CashTransactionType" AS ENUM ('receipt', 'payment');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'karyawan',
    "employee_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL DEFAULT 0,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "npwp" TEXT,
    "address" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "npwp" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "term_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" SERIAL NOT NULL,
    "nik" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "employment_status" "EmploymentStatus" NOT NULL,
    "base_salary" BIGINT NOT NULL,
    "join_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_groups" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "group_id" INTEGER,
    "min_stock" DECIMAL(14,3),
    "last_cost" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "contract_value" BIGINT,
    "start_date" TIMESTAMP(3),
    "target_date" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "project_id" INTEGER,
    "status" "PoStatus" NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" SERIAL NOT NULL,
    "po_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "po_id" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" SERIAL NOT NULL,
    "gr_id" INTEGER NOT NULL,
    "po_line_id" INTEGER NOT NULL,
    "qty_received" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_invoices" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "gr_id" INTEGER,
    "dpp" BIGINT NOT NULL,
    "ppn" BIGINT NOT NULL,
    "total" BIGINT NOT NULL,
    "status" "PurchaseInvoiceStatus" NOT NULL DEFAULT 'open',
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "project_id" INTEGER,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" SERIAL NOT NULL,
    "so_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "so_id" INTEGER,
    "project_id" INTEGER,
    "status" "DeliveryOrderStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_order_lines" (
    "id" SERIAL NOT NULL,
    "delivery_order_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "delivery_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "tax_invoice_no" TEXT,
    "po_ref" TEXT,
    "project_id" INTEGER,
    "dpp" BIGINT NOT NULL,
    "ppn" BIGINT NOT NULL,
    "total" BIGINT NOT NULL,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_invoice_lines" (
    "id" SERIAL NOT NULL,
    "sales_invoice_id" INTEGER NOT NULL,
    "item_id" INTEGER,
    "part_no" TEXT,
    "name" TEXT NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "sales_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_validations" (
    "id" SERIAL NOT NULL,
    "sales_invoice_id" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "input_value" TEXT NOT NULL,
    "system_value" TEXT NOT NULL,
    "is_match" BOOLEAN NOT NULL,

    CONSTRAINT "document_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_logs" (
    "id" SERIAL NOT NULL,
    "sales_invoice_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_moves" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" INTEGER,
    "qty_in" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "qty_out" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "project_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "stock_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "pic_id" INTEGER,
    "plan_start" TIMESTAMP(3),
    "plan_end" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "depends_on_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_reports" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "progress" INTEGER NOT NULL,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basts" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "project_id" INTEGER,
    "po_ref" TEXT,
    "customer_id" INTEGER NOT NULL,
    "source_invoice_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "basts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bast_lines" (
    "id" SERIAL NOT NULL,
    "bast_id" INTEGER NOT NULL,
    "item_id" INTEGER,
    "part_no" TEXT,
    "name" TEXT NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "uom" TEXT NOT NULL,

    CONSTRAINT "bast_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "clock_in" TIMESTAMP(3),
    "clock_out" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overtime" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "rate" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "approved_by" INTEGER,

    CONSTRAINT "overtime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_advances" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CashAdvanceStatus" NOT NULL DEFAULT 'pending',
    "approved_by" INTEGER,
    "remaining" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_loans" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "principal" BIGINT NOT NULL,
    "remaining" BIGINT NOT NULL,
    "installment" BIGINT NOT NULL,

    CONSTRAINT "employee_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "base_salary" BIGINT NOT NULL,
    "allowance" BIGINT NOT NULL DEFAULT 0,
    "overtime_amount" BIGINT NOT NULL DEFAULT 0,
    "gross" BIGINT NOT NULL,
    "bpjs" BIGINT NOT NULL DEFAULT 0,
    "tax_pph21" BIGINT NOT NULL DEFAULT 0,
    "kasbon_installment" BIGINT NOT NULL DEFAULT 0,
    "loan_installment" BIGINT NOT NULL DEFAULT 0,
    "deduction_total" BIGINT NOT NULL,
    "net_pay" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "tax_code" TEXT,
    "tax_name" TEXT,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" INTEGER NOT NULL,
    "ref_no" TEXT,
    "type" TEXT NOT NULL,
    "is_auto" BOOLEAN NOT NULL DEFAULT true,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" SERIAL NOT NULL,
    "entry_id" INTEGER NOT NULL,
    "account_id" INTEGER NOT NULL,
    "debit" BIGINT NOT NULL DEFAULT 0,
    "credit" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acquisition_date" TIMESTAMP(3) NOT NULL,
    "cost" BIGINT NOT NULL,
    "useful_life_months" INTEGER NOT NULL,
    "method" "DepreciationMethod" NOT NULL DEFAULT 'straight_line',
    "accumulated_depreciation" BIGINT NOT NULL DEFAULT 0,
    "book_value" BIGINT NOT NULL,
    "last_depreciated_period" TEXT,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" SERIAL NOT NULL,
    "no" TEXT NOT NULL,
    "type" "CashTransactionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "partner_id" INTEGER,
    "account_id" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "sales_invoice_id" INTEGER,
    "purchase_invoice_id" INTEGER,
    "company_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "counters_key_year_company_id_key" ON "counters"("key", "year", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "partners_code_key" ON "partners"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nik_key" ON "employees"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "item_groups_code_key" ON "item_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "items_code_key" ON "items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_no_key" ON "purchase_orders"("no");

-- CreateIndex
CREATE INDEX "purchase_orders_project_id_idx" ON "purchase_orders"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_no_key" ON "goods_receipts"("no");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_invoices_no_key" ON "purchase_invoices"("no");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_no_key" ON "sales_orders"("no");

-- CreateIndex
CREATE INDEX "sales_orders_project_id_idx" ON "sales_orders"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_orders_no_key" ON "delivery_orders"("no");

-- CreateIndex
CREATE INDEX "delivery_orders_project_id_idx" ON "delivery_orders"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_no_key" ON "sales_invoices"("no");

-- CreateIndex
CREATE INDEX "sales_invoices_project_id_idx" ON "sales_invoices"("project_id");

-- CreateIndex
CREATE INDEX "stock_moves_item_id_idx" ON "stock_moves"("item_id");

-- CreateIndex
CREATE INDEX "stock_moves_project_id_idx" ON "stock_moves"("project_id");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "basts_no_key" ON "basts"("no");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_date_key" ON "attendance"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_employee_id_period_key" ON "payslips"("employee_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_no_key" ON "journal_entries"("no");

-- CreateIndex
CREATE INDEX "journal_entries_ref_type_ref_id_idx" ON "journal_entries"("ref_type", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_code_key" ON "fixed_assets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_no_key" ON "cash_transactions"("no");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_groups" ADD CONSTRAINT "item_groups_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "item_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "item_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_gr_id_fkey" FOREIGN KEY ("gr_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_gr_id_fkey" FOREIGN KEY ("gr_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_order_lines" ADD CONSTRAINT "delivery_order_lines_delivery_order_id_fkey" FOREIGN KEY ("delivery_order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_order_lines" ADD CONSTRAINT "delivery_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_validations" ADD CONSTRAINT "document_validations_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_logs" ADD CONSTRAINT "document_logs_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "project_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_reports" ADD CONSTRAINT "work_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basts" ADD CONSTRAINT "basts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basts" ADD CONSTRAINT "basts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "basts" ADD CONSTRAINT "basts_source_invoice_id_fkey" FOREIGN KEY ("source_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bast_lines" ADD CONSTRAINT "bast_lines_bast_id_fkey" FOREIGN KEY ("bast_id") REFERENCES "basts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bast_lines" ADD CONSTRAINT "bast_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime" ADD CONSTRAINT "overtime_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_loans" ADD CONSTRAINT "employee_loans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
