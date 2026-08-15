import { Module } from "@nestjs/common";
import { WorkReportsService } from "./work-reports.service";
import { WorkReportsController } from "./work-reports.controller";

@Module({
  providers: [WorkReportsService],
  controllers: [WorkReportsController],
  exports: [WorkReportsService],
})
export class WorkReportsModule {}
