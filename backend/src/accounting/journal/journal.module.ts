import { Global, Module } from "@nestjs/common";
import { JournalService } from "./journal.service";
import { JournalEntriesController } from "./journal-entries.controller";

@Global()
@Module({
  providers: [JournalService],
  controllers: [JournalEntriesController],
  exports: [JournalService],
})
export class JournalModule {}
