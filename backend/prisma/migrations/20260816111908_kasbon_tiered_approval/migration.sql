-- AlterEnum
ALTER TYPE "CashAdvanceStatus" ADD VALUE 'tier1_approved';

-- AlterTable
ALTER TABLE "cash_advances" ADD COLUMN     "tier1_by" INTEGER;
