import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

// Настройка для Vercel: максимальное время выполнения функции
export const maxDuration = 60;

// Логирование
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SCREENSHOT] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export async function POST(request: NextRequest) {
  try {
    const { heroName, interactionToken, applicationId } = await request.json();

    log('📥 Получен запрос на создание скриншота', { heroName, hasToken: !!interactionToken, hasAppId: !!applicationId });

    if (!heroName) {
      log('❌ Не указано имя героя');
      return NextResponse.json(
        { error: 'Hero name is required' },
        { status: 400 }
      );
    }

    log('🌐 Запускаю браузер...');
    // Запускаем браузер в serverless режиме
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    log('✅ Браузер запущен');

    const page = await browser.newPage();
    await page.setViewportSize({ width: 1920, height: 1080 });

    const url = `https://dota2protracker.com/hero/${heroName.toLowerCase()}`;
    log('🔗 Открываю страницу', { url });
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      log('✅ Страница загружена');
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

      log('🍪 Ищу и закрываю уведомление о согласии...');
      let consentClosed = false;
      for (const selector of consentSelectors) {
        try {
          // Пробуем кликнуть напрямую через page.click
          await page.click(selector, { timeout: 1000 });
          log('✅ Уведомление о согласии закрыто');
          // Если клик прошел успешно, ждем и выходим
          await page.waitForTimeout(300);
          consentClosed = true;
          break;
        } catch {
          // Элемент не найден или не кликабелен, продолжаем
          continue;
        }
      }
      if (!consentClosed) {
        log('⚠️ Уведомление о согласии не найдено');
      }

      await page.waitForTimeout(300);

      // Кликаем на вкладку Builds
      const buildsTabSelectors = [
        'button:has-text("Builds")',
        'a:has-text("Builds")',
        '[role="tab"]:has-text("Builds")',
        'text="Builds"',
      ];

      log('📑 Ищу и активирую вкладку Builds...');
      let buildsTabClicked = false;
      for (const selector of buildsTabSelectors) {
        try {
          // Пробуем кликнуть напрямую через page.click
          await page.click(selector, { timeout: 1000 });
          log('✅ Вкладка Builds активирована');
          // Если клик прошел успешно, ждем и выходим
          await page.waitForTimeout(500);
          buildsTabClicked = true;
          break;
        } catch {
          // Элемент не найден или не кликабелен, продолжаем
          continue;
        }
      }
      if (!buildsTabClicked) {
        log('⚠️ Вкладка Builds не найдена, продолжаю...');
      }

      // Ищем контент вкладки Builds
      log('📸 Ищу контент вкладки Builds и делаю скриншот...');
      let screenshotBuffer: Buffer;
      
      try {
        // Ждем появления элемента
        await page.waitForSelector('.flex.flex-col.gap-1', { timeout: 2000, state: 'attached' });
        log('✅ Элемент найден, получаю координаты...');
        
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
          log('📐 Делаю скриншот области', { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height });
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
          log('✅ Скриншот области создан');
        } else {
          log('⚠️ Не удалось получить координаты, пробую скриншот элемента...');
          // Если не удалось получить bbox, делаем скриншот элемента через evaluate
          const element = await page.$('.flex.flex-col.gap-1');
          if (element) {
            screenshotBuffer = await element.screenshot();
            log('✅ Скриншот элемента создан');
          } else {
            throw new Error('Element not found');
          }
        }
      } catch (error: any) {
        log('⚠️ Ошибка при создании скриншота области, делаю скриншот всей страницы', { error: error.message });
        // Запасной вариант - скриншот всей страницы
        screenshotBuffer = await page.screenshot({ fullPage: true });
        log('✅ Скриншот всей страницы создан');
      }

      await browser.close();
      log('🔒 Браузер закрыт');

      // Конвертируем Buffer в base64
      const base64Image = screenshotBuffer.toString('base64');
      const imageDataUrl = `data:image/png;base64,${base64Image}`;
      log('📦 Скриншот конвертирован в base64', { size: screenshotBuffer.length });

      // Отправляем результат через Discord Webhook API
      if (interactionToken && applicationId && interactionToken !== 'test' && applicationId !== 'test') {
        log('📤 Отправляю скриншот в Discord...');
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
          log('❌ Ошибка при отправке в Discord', { status: response.status, error: errorText });
        } else {
          log('✅ Скриншот успешно отправлен в Discord');
        }
      } else {
        log('⚠️ Тестовый запрос - пропущена отправка в Discord');
      }

      log('✅ Запрос успешно обработан');
      return NextResponse.json({
        success: true,
        image: imageDataUrl,
      });
    } catch (error: any) {
      log('❌ Ошибка в try блоке', { error: error.message });
      await browser.close();
      throw error;
    }
  } catch (error: any) {
    log('❌ Критическая ошибка при создании скриншота', { error: error.message, stack: error.stack });
    return NextResponse.json(
      {
        error: 'Failed to create screenshot',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

