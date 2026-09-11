-- CreateEnum
CREATE TYPE "RecurringDocType" AS ENUM ('sales_invoice', 'purchase_invoice');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('monthly', 'weekly');

-- CreateEnum
CREATE TYPE "RecurringDraftStatus" AS ENUM ('pending', 'confirmed', 'discarded');

-- CreateTable
CREATE TABLE "recurring_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RecurringDocType" NOT NULL,
    "payload" JSONB NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "next_run_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "recurring_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_generated_drafts" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "type" "RecurringDocType" NOT NULL,
    "payload" JSONB NOT NULL,
    "template_run_date" TIMESTAMP(3) NOT NULL,
    "status" "RecurringDraftStatus" NOT NULL DEFAULT 'pending',
    "confirmed_ref_id" INTEGER,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" INTEGER,

    CONSTRAINT "recurring_generated_drafts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "recurring_generated_drafts" ADD CONSTRAINT "recurring_generated_drafts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "recurring_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

