import { Global, Module } from "@nestjs/common";
import { BrowserService } from "./browser.service";
import { PdfService } from "./pdf.service";

@Global()
@Module({
  providers: [BrowserService, PdfService],
  exports: [PdfService],
})
export class PrintingModule {}
