import { Module } from "@nestjs/common";
import { ProjectBudgetsService } from "./project-budgets.service";
import { ProjectBudgetsController } from "./project-budgets.controller";

@Module({
  providers: [ProjectBudgetsService],
  controllers: [ProjectBudgetsController],
  exports: [ProjectBudgetsService],
})
export class ProjectBudgetsModule {}
