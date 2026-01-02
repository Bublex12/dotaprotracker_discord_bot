import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

// Настройка для Vercel: максимальное время выполнения функции
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { heroName, interactionToken, applicationId } = await request.json();

    if (!heroName) {
      return NextResponse.json(
        { error: 'Hero name is required' },
        { status: 400 }
      );
    }

    // Запускаем браузер в serverless режиме
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    const url = `https://dota2protracker.com/hero/${heroName.toLowerCase()}`;
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(500);

      // Закрываем уведомление о согласии
      const consentSelectors = [
        'button:has-text("Consent")',
        'button:has-text("Accept")',
        'button:has-text("Согласиться")',
        'button:has-text("Принять")',
        '[id*="consent"]',
        '[class*="consent"]',
        '[id*="cookie"]',
        '[class*="cookie"]',
      ];

      for (const selector of consentSelectors) {
        try {
          const buttonLocator = page.locator(selector);
          const buttonCount = await buttonLocator.count();
          if (buttonCount > 0) {
            try {
              const firstButton = buttonLocator.first;
              await firstButton.click({ timeout: 1000 });
              // Если клик прошел успешно, ждем и выходим
              await page.waitForTimeout(300);
              break;
            } catch {
              // Элемент не найден или не кликабелен, продолжаем
              continue;
            }
          }
        } catch {
          // Продолжаем поиск следующего селектора
          continue;
        }
      }

      await page.waitForTimeout(300);

      // Кликаем на вкладку Builds
      const buildsTabSelectors = [
        'button:has-text("Builds")',
        'a:has-text("Builds")',
        '[role="tab"]:has-text("Builds")',
        'text="Builds"',
      ];

      for (const selector of buildsTabSelectors) {
        try {
          const tabLocator = page.locator(selector);
          const tabCount = await tabLocator.count();
          if (tabCount > 0) {
            try {
              const firstTab = tabLocator.first;
              await firstTab.click({ timeout: 1000 });
              // Если клик прошел успешно, ждем и выходим
              await page.waitForTimeout(500);
              break;
            } catch {
              // Элемент не найден или не кликабелен, продолжаем
              continue;
            }
          }
        } catch {
          // Продолжаем поиск следующего селектора
          continue;
        }
      }

      // Ищем контент вкладки Builds
      const buildsElement = page.locator('.flex.flex-col.gap-1').first;
      
      let screenshotBuffer: Buffer;
      
      try {
        await buildsElement.waitFor({ state: 'attached', timeout: 2000 });
        
        const bbox = await page.evaluate(() => {
          const element = document.querySelector('.flex.flex-col.gap-1');
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height,
          };
        });

        if (bbox && bbox.width > 0 && bbox.height > 0) {
          await page.evaluate(`window.scrollTo(0, ${bbox.y - 100})`);
          await page.waitForTimeout(300);
          
          screenshotBuffer = await page.screenshot({
            clip: {
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height,
            },
          });
        } else {
          screenshotBuffer = await buildsElement.screenshot();
        }
      } catch {
        // Запасной вариант - скриншот всей страницы
        screenshotBuffer = await page.screenshot({ fullPage: true });
      }

      await browser.close();

      // Конвертируем Buffer в base64
      const base64Image = screenshotBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${base64Image}`;

      // Отправляем результат через Discord Webhook API
      if (interactionToken && applicationId) {
        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;
        
        // Создаем multipart/form-data для отправки файла
        const boundary = `----WebKitFormBoundary${Date.now()}`;
        const CRLF = '\r\n';
        const formDataParts: Buffer[] = [];
        
        // Добавляем файл
        const fileHeader = [
          `--${boundary}`,
          `Content-Disposition: form-data; name="files[0]"; filename="${heroName}_builds.png"`,
          `Content-Type: image/png`,
          '',
          '',
        ].join(CRLF);
        formDataParts.push(Buffer.from(fileHeader, 'utf-8'));
        formDataParts.push(Buffer.from(screenshotBuffer));
        formDataParts.push(Buffer.from(CRLF, 'utf-8'));
        
        // Добавляем payload_json
        const payloadHeader = [
          `--${boundary}`,
          `Content-Disposition: form-data; name="payload_json"`,
          `Content-Type: application/json`,
          '',
          '',
        ].join(CRLF);
        const payload = JSON.stringify({
          content: `✅ Скриншот билда для **${heroName}** готов!`,
        });
        
        formDataParts.push(Buffer.from(payloadHeader, 'utf-8'));
        formDataParts.push(Buffer.from(payload, 'utf-8'));
        formDataParts.push(Buffer.from(CRLF, 'utf-8'));
        formDataParts.push(Buffer.from(`--${boundary}--`, 'utf-8'));

        const formDataBody = Buffer.concat(formDataParts);

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: formDataBody,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Discord webhook error:', errorText);
        }
      }

      return NextResponse.json({
        success: true,
        image: imageDataUrl,
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating screenshot:', error);
    return NextResponse.json(
      {
        error: 'Failed to create screenshot',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

