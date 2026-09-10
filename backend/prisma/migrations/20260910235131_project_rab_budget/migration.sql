-- CreateTable
CREATE TABLE "project_budgets" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_budget_lines" (
    "id" SERIAL NOT NULL,
    "project_budget_id" INTEGER NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "planned_amount" BIGINT NOT NULL,

    CONSTRAINT "project_budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_budgets_project_id_key" ON "project_budgets"("project_id");

-- AddForeignKey
ALTER TABLE "project_budgets" ADD CONSTRAINT "project_budgets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_project_budget_id_fkey" FOREIGN KEY ("project_budget_id") REFERENCES "project_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
