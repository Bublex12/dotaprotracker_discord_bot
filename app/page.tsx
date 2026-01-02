'use client';

import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [heroName, setHeroName] = useState('mars');

  const testScreenshot = async () => {
    setLoading(true);
    setResult('🔄 Обрабатываю запрос...');
    
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heroName,
          // Тестовые данные для webhook
          interactionToken: 'test',
          applicationId: 'test',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult('✅ Скриншот успешно создан!');
        // Показываем изображение
        if (data.image) {
          const img = document.createElement('img');
          img.src = data.image;
          img.style.maxWidth = '100%';
          img.style.marginTop = '20px';
          const resultDiv = document.getElementById('result');
          if (resultDiv) {
            resultDiv.innerHTML = '✅ Скриншот успешно создан!<br>';
            resultDiv.appendChild(img);
          }
        }
      } else {
        setResult(`❌ Ошибка: ${data.message || data.error}`);
      }
    } catch (error: any) {
      setResult(`❌ Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testInteraction = async () => {
    setLoading(true);
    setResult('🔄 Тестирую interaction endpoint...');
    
    try {
      // Симулируем ping запрос от Discord
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature-ed25519': 'test',
          'x-signature-timestamp': Date.now().toString(),
        },
        body: JSON.stringify({
          type: 1, // PING
        }),
      });

      const data = await response.json();
      
      if (data.type === 1) { // PONG
        setResult('✅ Interaction endpoint работает! (PONG получен)');
      } else {
        setResult(`⚠️ Неожиданный ответ: ${JSON.stringify(data)}`);
      }
    } catch (error: any) {
      setResult(`❌ Ошибка: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>🤖 Dota 2 Hero Screenshot Bot</h1>
      <p>Discord бот для получения скриншотов билдов героев с dota2protracker.com</p>
      
      <div style={{ 
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h2>🧪 Тестирование</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
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
              border: '1px solid #ccc'
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
              opacity: loading ? 0.6 : 1
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
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Тестирование...' : '🔌 Тест Interaction'}
          </button>
        </div>

        <div
          id="result"
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '4px',
            minHeight: '50px',
            whiteSpace: 'pre-wrap'
          }}
        >
          {result || 'Нажмите кнопку для тестирования'}
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h3>📋 Информация</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>API Endpoints:</strong></li>
          <li>• <code>/api/interactions</code> - Discord webhook endpoint</li>
          <li>• <code>/api/screenshot</code> - Создание скриншотов</li>
          <li>• <code>/api/followup</code> - Отправка followup сообщений</li>
        </ul>
      </div>
    </div>
  );
}
