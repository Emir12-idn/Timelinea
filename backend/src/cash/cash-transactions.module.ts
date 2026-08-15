import { Module } from "@nestjs/common";
import { CashTransactionsService } from "./cash-transactions.service";
import { CashTransactionsController } from "./cash-transactions.controller";

@Module({
  providers: [CashTransactionsService],
  controllers: [CashTransactionsController],
  exports: [CashTransactionsService],
})
export class CashTransactionsModule {}
