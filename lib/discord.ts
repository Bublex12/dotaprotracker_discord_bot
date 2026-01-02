/**
 * Утилиты для работы с Discord API
 */

export async function sendFollowupMessage(
  applicationId: string,
  interactionToken: string,
  content: string,
  file?: Buffer,
  filename?: string
) {
  const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}`;

  if (file) {
    // Отправка с файлом через multipart/form-data
    const formData = new FormData();
    const blob = new Blob([file], { type: 'image/png' });
    formData.append('files[0]', blob, filename || 'screenshot.png');
    formData.append(
      'payload_json',
      JSON.stringify({
        content,
      })
    );

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  } else {
    // Отправка только текста
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }
}

