/**
 * Скрипт для регистрации slash команд в Discord (JavaScript версия)
 * Запуск: node scripts/register-commands.js
 */

// Загружаем переменные окружения
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Сначала пробуем .env.local, потом .env
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
  console.log('✅ Загружен .env.local');
} else if (fs.existsSync('.env')) {
  dotenv.config();
  console.log('✅ Загружен .env');
} else {
  dotenv.config();
  console.log('⚠️ Файл .env.local не найден, используем переменные окружения системы');
}

const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Опционально, для регистрации только на одном сервере

const commands = [
  {
    name: 'hero',
    description: 'Получить скриншот билда героя с dota2protracker.com',
    options: [
      {
        name: 'название',
        description: 'Название героя (например: mars, pudge, invoker)',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'help_hero',
    description: 'Показать справку по использованию бота',
  },
];

async function registerCommands() {
  if (!DISCORD_APPLICATION_ID || !DISCORD_BOT_TOKEN) {
    console.error('❌ Ошибка: DISCORD_APPLICATION_ID и DISCORD_BOT_TOKEN должны быть установлены в переменных окружения');
    process.exit(1);
  }

  const url = GUILD_ID
    ? `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`;

  console.log(`📝 Регистрация команд${GUILD_ID ? ` для сервера ${GUILD_ID}` : ' глобально'}...`);

  for (const command of commands) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
        body: JSON.stringify(command),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Команда "${command.name}" успешно зарегистрирована`);
      } else {
        const error = await response.text();
        console.error(`❌ Ошибка при регистрации команды "${command.name}":`, error);
      }
    } catch (error) {
      console.error(`❌ Ошибка при регистрации команды "${command.name}":`, error);
    }
  }

  console.log('\n✨ Регистрация команд завершена!');
  console.log('💡 Примечание: Глобальные команды могут обновляться до 1 часа.');
}

registerCommands();

