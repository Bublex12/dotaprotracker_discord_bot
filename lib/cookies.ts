import type { Cookie } from 'playwright-core';

const SITE_URL = 'https://dota2protracker.com';

export function getDota2ProtrackerCookies(): Cookie[] {
  const json = process.env.DOTA2PROTRACKER_COOKIES_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Cookie[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c) => ({
          ...c,
          domain: c.domain ?? '.dota2protracker.com',
          path: c.path ?? '/',
        }));
      }
    } catch {
      // fall through to string format
    }
  }

  const raw = process.env.DOTA2PROTRACKER_COOKIES?.trim();
  if (!raw) return [];

  const cookies: Cookie[] = [];
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name || !value) continue;
    cookies.push({
      name,
      value,
      domain: '.dota2protracker.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    });
  }
  return cookies;
}

export function hasDota2ProtrackerCookies(): boolean {
  return getDota2ProtrackerCookies().length > 0;
}

export function cloudflareCookiesHelp(): string {
  return (
    'Сайт защищён Cloudflare. Добавьте в Vercel переменную DOTA2PROTRACKER_COOKIES: ' +
    'откройте dota2protracker.com в Chrome, пройдите проверку, F12 → Application → Cookies → ' +
    'скопируйте cf_clearance и __cf_bm в формате cf_clearance=...; __cf_bm=...'
  );
}

export { SITE_URL };
