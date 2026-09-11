import { Module } from "@nestjs/common";
import { ClosedPeriodsService } from "./closed-periods.service";
import { ClosedPeriodsController } from "./closed-periods.controller";

@Module({
  providers: [ClosedPeriodsService],
  controllers: [ClosedPeriodsController],
  exports: [ClosedPeriodsService],
})
export class ClosedPeriodsModule {}
