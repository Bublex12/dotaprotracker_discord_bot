import { NextRequest, NextResponse } from 'next/server';
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from 'discord-interactions';

// Захардкоженные токены для тестирования (тестовый бот)
const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY || 'YOUR_PUBLIC_KEY_HERE';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || 'YOUR_APPLICATION_ID_HERE';

// TODO: Замените на реальные значения вашего тестового бота
// DISCORD_PUBLIC_KEY - из Discord Developer Portal → General Information → Public Key
// DISCORD_BOT_TOKEN - из Discord Developer Portal → Bot → Token
// DISCORD_APPLICATION_ID - из Discord Developer Portal → General Information → Application ID

// Логирование
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Настройка для Vercel: максимальное время выполнения функции
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    log('📥 Получен interaction запрос', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      bodyLength: body.length
    });

    // Для тестирования пропускаем проверку подписи, если это тестовый запрос
    const isTestRequest = signature === 'test' || !signature;
    
    if (!isTestRequest) {
      if (!signature || !timestamp) {
        log('❌ Отсутствуют заголовки подписи');
        return NextResponse.json(
          { error: 'Missing signature headers' },
          { status: 401 }
        );
      }

      // Проверяем подпись Discord
      const isValid = verifyKey(body, signature, timestamp, DISCORD_PUBLIC_KEY);

      if (!isValid) {
        log('❌ Неверная подпись');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else {
      log('⚠️ Тестовый запрос - пропущена проверка подписи');
    }

    const interaction = JSON.parse(body);
    log('📋 Тип interaction:', interaction.type);

    // Обработка ping (для верификации)
    if (interaction.type === InteractionType.PING) {
      log('🏓 PING запрос - отправляю PONG');
      return NextResponse.json({
        type: InteractionResponseType.PONG,
      });
    }

    // Обработка slash команд
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = interaction.data;

      if (name === 'hero') {
        const heroName = options?.[0]?.value as string;

        log('🎮 Команда /hero', { heroName });

        if (!heroName) {
          log('❌ Не указано имя героя');
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Пожалуйста, укажите название героя.\nПример: `/hero mars` или `/hero pudge`',
            },
          });
        }

        log('⏳ Отправляю deferred response и запускаю обработку скриншота');
        
        // Отправляем ответ о том, что обрабатываем запрос (deferred response)
        const response = NextResponse.json({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });

        // Асинхронно обрабатываем создание скриншота
        processScreenshotAsync(
          heroName,
          interaction.token,
          interaction.application_id
        ).catch((error) => {
          log('❌ Ошибка при обработке скриншота', { error: error.message });
        });

        return response;
      }

      if (name === 'help_hero') {
        log('📖 Команда /help_hero');
        return NextResponse.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [
              {
                title: '🤖 Dota 2 Hero Screenshot Bot',
                description: 'Бот для получения скриншотов билдов героев с dota2protracker.com',
                color: 0x5865f2,
                fields: [
                  {
                    name: 'Команды',
                    value: '`/hero <название>` - Получить скриншот билда героя\nПримеры: `/hero mars`, `/hero pudge`, `/hero invoker`',
                    inline: false,
                  },
                ],
              },
            ],
          },
        });
      }
    }

    log('⚠️ Неизвестный тип interaction');
    return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
  } catch (error: any) {
    log('❌ Ошибка при обработке interaction', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Асинхронная обработка создания скриншота
async function processScreenshotAsync(
  heroName: string,
  interactionToken: string,
  applicationId: string
) {
  log('🚀 Начинаю обработку скриншота', { heroName, applicationId });
  
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    log('📡 Отправляю запрос на создание скриншота', { baseUrl, heroName });

    const screenshotResponse = await fetch(`${baseUrl}/api/screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        heroName,
        interactionToken,
        applicationId,
      }),
    });

    if (!screenshotResponse.ok) {
      const error = await screenshotResponse.json();
      log('❌ Ошибка при создании скриншота', error);
      throw new Error(error.message || 'Failed to create screenshot');
    }

    log('✅ Скриншот успешно создан');
  } catch (error: any) {
    log('❌ Ошибка в processScreenshotAsync', { error: error.message });
    
    // Отправляем сообщение об ошибке через Discord Webhook
    if (applicationId && interactionToken && applicationId !== 'test') {
      const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `❌ Произошла ошибка при создании скриншота для **${heroName}**:\n\`${error.message}\``,
        }),
      }).catch((err) => {
        log('❌ Не удалось отправить сообщение об ошибке', { error: err.message });
      });
    }
  }
}

