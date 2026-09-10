import { Module } from "@nestjs/common";
import { ChequeGiroService } from "./cheque-giro.service";
import { ChequeGiroController } from "./cheque-giro.controller";
import { CashTransactionsModule } from "../cash-transactions.module";

@Module({
  imports: [CashTransactionsModule],
  providers: [ChequeGiroService],
  controllers: [ChequeGiroController],
  exports: [ChequeGiroService],
})
export class ChequeGiroModule {}
