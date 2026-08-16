import { Injectable } from "@nestjs/common";
import { BrowserService } from "./browser.service";

@Injectable()
export class PdfService {
  constructor(private browserService: BrowserService) {}

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.browserService.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "a4",
        printBackground: true,
        margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }
}
