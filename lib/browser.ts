import { chromium as playwrightChromium, type Browser } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
}
