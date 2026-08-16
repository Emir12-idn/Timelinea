import { Injectable, InternalServerErrorException, Logger, OnModuleDestroy } from "@nestjs/common";
import { existsSync } from "fs";
import puppeteer, { Browser } from "puppeteer-core";

const COMMON_CHROMIUM_PATHS = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
];

function resolveExecutablePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const found = COMMON_CHROMIUM_PATHS.find((p) => existsSync(p));
  if (found) return found;
  throw new InternalServerErrorException(
    "Chromium tidak ditemukan untuk cetak PDF. Set PUPPETEER_EXECUTABLE_PATH ke path binary Chromium/Chrome " +
      "(di Docker image ini sudah terpasang lewat apk add chromium — lihat Dockerfile).",
  );
}

/**
 * One shared headless Chromium instance for the whole app (launching per-request
 * is slow and memory-hungry). Uses puppeteer-core against a system-installed
 * Chromium instead of bundling one — see Dockerfile for the Alpine package.
 */
@Injectable()
export class BrowserService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;
    if (this.launching) return this.launching;

    this.launching = puppeteer
      .launch({
        executablePath: resolveExecutablePath(),
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      })
      .then((browser) => {
        this.browser = browser;
        this.launching = null;
        browser.on("disconnected", () => {
          this.logger.warn("Chromium disconnected, will relaunch on next request");
          this.browser = null;
        });
        return browser;
      });

    return this.launching;
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }
}
