'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [heroName, setHeroName] = useState('mars');

  const testScreenshot = async () => {
    setLoading(true);
    setMessage('🔄 Обрабатываю запрос...');
    setScreenshotUrl(null);

    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heroName,
          interactionToken: 'test',
          applicationId: 'test',
        }),
      });

      const data = await response.json();

      if (data.success && data.image) {
        setMessage(`✅ Скриншот билда для ${heroName}`);
        setScreenshotUrl(data.image);
      } else {
        const parts = [
          `❌ Ошибка: ${data.message || data.error}`,
          data.hint ? `\n\n💡 ${data.hint}` : '',
        ];
        setMessage(parts.join(''));
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      setMessage(`❌ Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testInteraction = async () => {
    setLoading(true);
    setMessage('🔄 Тестирую interaction endpoint...');
    setScreenshotUrl(null);

    try {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature-ed25519': 'test',
          'x-signature-timestamp': Date.now().toString(),
        },
        body: JSON.stringify({
          type: 1,
        }),
      });

      const data = await response.json();

      if (data.type === 1) {
        setMessage('✅ Interaction endpoint работает! (PONG получен)');
      } else {
        setMessage(`⚠️ Неожиданный ответ: ${JSON.stringify(data)}`);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      setMessage(`❌ Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '960px',
        margin: '0 auto',
      }}
    >
      <h1>🤖 Dota 2 Hero Screenshot Bot</h1>
      <p>Discord бот для получения скриншотов билдов героев с dota2protracker.com</p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h2>🧪 Тестирование</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
            }}
          >
            Название героя:
          </label>
          <input
            type="text"
            value={heroName}
            onChange={(e) => setHeroName(e.target.value)}
            placeholder="mars"
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
              width: '200px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={testScreenshot}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#5865F2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⏳ Обработка...' : '📸 Тест скриншота'}
          </button>

          <button
            onClick={testInteraction}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#57F287',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⏳ Тестирование...' : '🔌 Тест Interaction'}
          </button>
        </div>

        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '4px',
            minHeight: '50px',
          }}
        >
          <p style={{ margin: '0 0 1rem 0' }}>
            {message || 'Нажмите кнопку для тестирования'}
          </p>

          {screenshotUrl && (
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: '#1a1a1a',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshotUrl}
                alt={`Скриншот билда ${heroName}`}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#e8f4f8',
          borderRadius: '8px',
        }}
      >
        <h3>📋 Информация</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>
            <strong>API Endpoints:</strong>
          </li>
          <li>
            • <code>/api/interactions</code> - Discord webhook endpoint
          </li>
          <li>
            • <code>/api/screenshot</code> - Создание скриншотов
          </li>
          <li>
            • <code>/api/followup</code> - Отправка followup сообщений
          </li>
        </ul>
      </div>
    </div>
  );
}
