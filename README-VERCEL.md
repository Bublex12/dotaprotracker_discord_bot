# Dota 2 Hero Screenshot Bot - Vercel Deployment

Discord бот для создания скриншотов билдов героев с сайта [dota2protracker.com](https://dota2protracker.com/hero), адаптированный для размещения на Vercel.

## 🚀 Особенности для Vercel

- ✅ Использует Discord Interactions API (slash commands) вместо традиционных команд
- ✅ Serverless архитектура - работает через API routes
- ✅ Поддержка Playwright в serverless режиме
- ✅ Автоматический деплой через Vercel

## 📋 Предварительные требования

1. **Node.js 18+** установлен локально
2. **Discord Application** создана на [Discord Developer Portal](https://discord.com/developers/applications)
3. **Vercel аккаунт** (бесплатный план подойдет)

## 🔧 Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Установка браузеров Playwright

```bash
npx playwright install chromium
npx playwright install-deps chromium
```

### 3. Настройка Discord бота

1. Перейдите на [Discord Developer Portal](https://discord.com/developers/applications)
2. Создайте новое приложение или выберите существующее
3. Перейдите в раздел **Bot** и создайте бота
4. Скопируйте следующие данные:
   - **Token** (в разделе Bot) → `DISCORD_BOT_TOKEN`
   - **Application ID** (в разделе General Information) → `DISCORD_APPLICATION_ID`
   - **Public Key** (в разделе General Information) → `DISCORD_PUBLIC_KEY`

5. В разделе **OAuth2 → URL Generator**:
   - Выберите Scopes: `bot`, `applications.commands`
   - Выберите Bot Permissions: `Send Messages`, `Attach Files`, `Read Message History`
   - Используйте сгенерированную ссылку для приглашения бота на сервер

### 4. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_APPLICATION_ID=your_application_id_here
DISCORD_PUBLIC_KEY=your_public_key_here

# Опционально: для быстрой регистрации команд на одном сервере
DISCORD_GUILD_ID=your_guild_id_here
```

### 5. Регистрация slash команд

Перед деплоем зарегистрируйте команды в Discord:

```bash
npm run register-commands
```

Или используйте TypeScript версию:

```bash
npx tsx scripts/register-commands.ts
```

**Примечание:**
- Если указан `DISCORD_GUILD_ID`, команды зарегистрируются только на этом сервере (мгновенно)
- Если `DISCORD_GUILD_ID` не указан, команды зарегистрируются глобально (может занять до 1 часа)

### 6. Настройка Discord Webhook URL

После деплоя на Vercel вам нужно указать URL вашего приложения в Discord:

1. Перейдите в раздел **General Information** вашего Discord приложения
2. В поле **Interactions Endpoint URL** укажите:
   ```
   https://your-app.vercel.app/api/interactions
   ```
3. Нажмите **Save Changes**

Discord автоматически проверит ваш endpoint (отправит ping запрос).

## 🚀 Деплой на Vercel

### Вариант 1: Через Vercel CLI

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Войдите в аккаунт:
```bash
vercel login
```

3. Деплой:
```bash
vercel
```

4. Добавьте переменные окружения:
```bash
vercel env add DISCORD_BOT_TOKEN
vercel env add DISCORD_APPLICATION_ID
vercel env add DISCORD_PUBLIC_KEY
```

### Вариант 2: Через GitHub

1. Создайте репозиторий на GitHub
2. Загрузите код:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

3. Перейдите на [vercel.com](https://vercel.com)
4. Нажмите **New Project**
5. Импортируйте ваш GitHub репозиторий
6. В настройках проекта добавьте переменные окружения:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_APPLICATION_ID`
   - `DISCORD_PUBLIC_KEY`
   - Опционально: `DISCORD_GUILD_ID`

7. Нажмите **Deploy**

### Вариант 3: Через Vercel Dashboard

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите **Add New Project**
3. Импортируйте репозиторий или загрузите код
4. В настройках проекта:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Добавьте переменные окружения в разделе **Environment Variables**
6. Нажмите **Deploy**

## ⚙️ Настройка после деплоя

После успешного деплоя:

1. Скопируйте URL вашего приложения (например: `https://your-app.vercel.app`)
2. Обновите **Interactions Endpoint URL** в Discord Developer Portal:
   ```
   https://your-app.vercel.app/api/interactions
   ```
3. Discord автоматически проверит endpoint

## 📝 Использование

После настройки бот будет работать через slash commands:

- `/hero название` - Получить скриншот билда героя
  - Примеры: `/hero mars`, `/hero pudge`, `/hero invoker`
- `/help_hero` - Показать справку

## 🔍 Локальная разработка

Для локальной разработки используйте [ngrok](https://ngrok.com) или аналогичный сервис для туннелирования:

```bash
# Установите ngrok
npm i -g ngrok

# Запустите Next.js
npm run dev

# В другом терминале запустите ngrok
ngrok http 3000

# Используйте URL от ngrok в Discord Interactions Endpoint URL
# Например: https://abc123.ngrok.io/api/interactions
```

## ⚠️ Важные замечания

1. **Таймауты**: На бесплатном плане Vercel максимальный таймаут функции - 60 секунд. Для Pro плана - до 300 секунд.

2. **Playwright на Vercel**: используется `@sparticuz/chromium` + `playwright-core` (браузер встроен в пакет, отдельный `playwright install` на деплое не нужен). Для локальной разработки: `npm run playwright:install`

3. **Cold Start**: Первый запрос после периода бездействия может быть медленнее из-за cold start serverless функций.

4. **Лимиты Vercel**:
   - Hobby план: 100GB bandwidth/месяц, 100 часов выполнения функций/день
   - Pro план: больше лимитов

## 🐛 Решение проблем

### Бот не отвечает на команды

1. Проверьте, что Interactions Endpoint URL правильно настроен в Discord
2. Проверьте логи в Vercel Dashboard
3. Убедитесь, что команды зарегистрированы: `npm run register-commands`

### Ошибки при создании скриншотов

1. Проверьте логи в Vercel Dashboard
2. Убедитесь, что Playwright установлен: `npx playwright install chromium`
3. Проверьте, что переменные окружения правильно установлены

### Команды не появляются в Discord

- Если команды регистрируются глобально, подождите до 1 часа
- Для быстрого тестирования используйте `DISCORD_GUILD_ID` для регистрации на одном сервере

## 📚 Структура проекта

```
dota-discord-bot/
├── app/
│   └── api/
│       ├── interactions/route.ts  # Обработка Discord interactions
│       ├── screenshot/route.ts    # Создание скриншотов
│       └── followup/route.ts      # Отправка followup сообщений
├── lib/
│   └── discord.ts                 # Утилиты для Discord API
├── scripts/
│   ├── register-commands.ts       # Регистрация slash команд (TS)
│   └── register-commands.js       # Регистрация slash команд (JS)
├── package.json
├── next.config.js
├── vercel.json
└── .env.local                      # Переменные окружения (не в git)
```

## 🔄 Миграция с Python версии

Основные изменения:
- ✅ Используются slash commands вместо команд с префиксом `!`
- ✅ Serverless архитектура вместо долгоживущего процесса
- ✅ TypeScript/Next.js вместо Python
- ✅ Работает через webhooks вместо постоянного подключения

## 📄 Лицензия

MIT

