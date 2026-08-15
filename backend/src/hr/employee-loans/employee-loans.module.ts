import { Module } from "@nestjs/common";
import { EmployeeLoansService } from "./employee-loans.service";
import { EmployeeLoansController } from "./employee-loans.controller";

@Module({
  providers: [EmployeeLoansService],
  controllers: [EmployeeLoansController],
  exports: [EmployeeLoansService],
})
export class EmployeeLoansModule {}
