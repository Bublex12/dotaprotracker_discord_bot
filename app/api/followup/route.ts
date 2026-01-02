import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { interactionToken, applicationId, heroName, success, error } =
      await request.json();

    if (!interactionToken || !applicationId) {
      return NextResponse.json(
        { error: 'Missing interaction token or application ID' },
        { status: 400 }
      );
    }

    const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;

    if (success) {
      // Успешный ответ уже отправлен из screenshot route
      return NextResponse.json({ success: true });
    } else {
      // Отправляем сообщение об ошибке
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `❌ Произошла ошибка при создании скриншота для **${heroName}**:\n\`${error}\``,
        }),
      });

      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    console.error('Error sending followup:', error);
    return NextResponse.json(
      { error: 'Failed to send followup' },
      { status: 500 }
    );
  }
}

