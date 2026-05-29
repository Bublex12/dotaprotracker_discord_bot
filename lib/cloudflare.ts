import type { Page } from 'playwright-core';
import { cloudflareCookiesHelp } from './cookies';

export async function isCloudflareChallenge(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes('challenges.cloudflare.com')) return true;

  const probe = await page.evaluate(() => {
    const text = document.body?.innerText ?? '';
    const title = document.title ?? '';
    return {
      text,
      title,
      hasTurnstile: !!document.querySelector('.cf-turnstile, #cf-turnstile, iframe[src*="challenges.cloudflare"]'),
    };
  });

  if (probe.hasTurnstile) return true;

  const markers = [
    'Performing security verification',
    'Verify you are human',
    'Just a moment',
    'Checking your browser',
    'Attention Required',
  ];

  return markers.some(
    (m) => probe.text.includes(m) || probe.title.includes(m),
  );
}

export async function waitForHeroContent(
  page: Page,
  timeoutMs = 45000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let reloaded = false;

  while (Date.now() < deadline) {
    if (!(await isCloudflareChallenge(page))) {
      try {
        await page.waitForSelector('.flex.flex-col.gap-1', {
          state: 'visible',
          timeout: 5000,
        });
        return;
      } catch {
        // контент ещё грузится
      }
    }

    if (!reloaded && Date.now() > deadline - timeoutMs + 15000) {
      reloaded = true;
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    await page.waitForTimeout(2000);
  }

  if (await isCloudflareChallenge(page)) {
    throw new Error(cloudflareCookiesHelp());
  }

  throw new Error('Не удалось дождаться загрузки страницы героя');
}
