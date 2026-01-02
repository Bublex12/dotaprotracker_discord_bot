import { NextRequest, NextResponse } from 'next/server';
import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from 'discord-interactions';

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing signature headers' },
        { status: 401 }
      );
    }

    // Проверяем подпись Discord
    const isValid = verifyKey(body, signature, timestamp, DISCORD_PUBLIC_KEY);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const interaction = JSON.parse(body);

    // Обработка ping (для верификации)
    if (interaction.type === InteractionType.PING) {
      return NextResponse.json({
        type: InteractionResponseType.PONG,
      });
    }

    // Обработка slash команд
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = interaction.data;

      if (name === 'hero') {
        const heroName = options?.[0]?.value as string;

        if (!heroName) {
          return NextResponse.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Пожалуйста, укажите название героя.\nПример: `/hero mars` или `/hero pudge`',
            },
          });
        }

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
          console.error('Error processing screenshot:', error);
        });

        return response;
      }

      if (name === 'help_hero') {
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

    return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
  } catch (error) {
    console.error('Error handling interaction:', error);
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
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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
      throw new Error(error.message || 'Failed to create screenshot');
    }
  } catch (error: any) {
    // Отправляем сообщение об ошибке через Discord Webhook
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
      console.error('Failed to send error message:', err);
    });
  }
}

