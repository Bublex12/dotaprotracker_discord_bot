#!/usr/bin/env python3
"""
Discord бот для создания скриншотов героев с dota2protracker.com
"""

import os
import asyncio
import discord
from discord.ext import commands
from pathlib import Path
import sys
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

# Импортируем функцию из screenshot_hero.py
from screenshot_hero import screenshot_hero, ensure_browser_installed

# Настройки бота
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

# Папка для скриншотов
SCREENSHOTS_DIR = "screenshots"


@bot.event
async def on_ready():
    print(f'{bot.user} подключен к Discord!')
    print(f'Бот готов к работе!')
    # Проверяем наличие браузера при запуске
    ensure_browser_installed()


@bot.command(name='hero', aliases=['h', 'герой'])
async def hero_screenshot(ctx, hero_name: str = None):
    """
    Команда для создания скриншота героя.
    Использование: !hero <название_героя>
    Пример: !hero mars
    """
    if hero_name is None:
        await ctx.send("❌ Пожалуйста, укажите название героя.\n"
                      "Пример: `!hero mars` или `!hero pudge`")
        return
    
    hero_name = hero_name.lower().strip()
    
    # Показываем что бот обрабатывает запрос
    await ctx.send(f"🔄 Обрабатываю запрос для героя **{hero_name}**...")
    
    try:
        # Запускаем скрипт создания скриншота в отдельном потоке
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, 
            screenshot_hero, 
            hero_name, 
            SCREENSHOTS_DIR, 
            200  # wait_time
        )
        
        # Путь к скриншоту
        screenshot_path = Path(SCREENSHOTS_DIR) / f"{hero_name}.png"
        
        if screenshot_path.exists():
            # Отправляем скриншот в канал
            file = discord.File(str(screenshot_path), filename=f"{hero_name}_builds.png")
            await ctx.send(
                f"✅ Скриншот билда для **{hero_name}** готов!",
                file=file
            )
        else:
            await ctx.send(f"❌ Не удалось создать скриншот для героя **{hero_name}**")
            
    except Exception as e:
        error_msg = str(e)
        print(f"Ошибка при создании скриншота: {error_msg}")
        import traceback
        traceback.print_exc()
        await ctx.send(
            f"❌ Произошла ошибка при создании скриншота для **{hero_name}**:\n"
            f"`{error_msg[:200]}`\n\n"
            f"Попробуйте еще раз через несколько секунд."
        )


@bot.command(name='help_hero')
async def help_command(ctx):
    """Показывает справку по использованию бота"""
    embed = discord.Embed(
        title="🤖 Dota 2 Hero Screenshot Bot",
        description="Бот для получения скриншотов билдов героев с dota2protracker.com",
        color=0x5865F2
    )
    embed.add_field(
        name="Команды",
        value="`!hero <название>` - Получить скриншот билда героя\n"
              "Примеры: `!hero mars`, `!hero pudge`, `!hero invoker`",
        inline=False
    )
    embed.add_field(
        name="Алиасы",
        value="`!h <название>`, `!герой <название>`",
        inline=False
    )
    await ctx.send(embed=embed)


@bot.event
async def on_command_error(ctx, error):
    """Обработка ошибок команд"""
    if isinstance(error, commands.MissingRequiredArgument):
        await ctx.send("❌ Вы забыли указать название героя!\n"
                      "Пример: `!hero mars`")
    elif isinstance(error, commands.CommandNotFound):
        pass  # Игнорируем неизвестные команды
    else:
        await ctx.send(f"❌ Произошла ошибка: {str(error)}")


def main():
    """Запуск бота"""
    # Получаем токен из переменной окружения
    token = os.getenv('DISCORD_BOT_TOKEN')
    
    if not token:
        print("❌ ОШИБКА: Токен Discord бота не найден!")
        print("Пожалуйста, установите переменную окружения DISCORD_BOT_TOKEN")
        print("Или создайте файл .env с содержимым: DISCORD_BOT_TOKEN=ваш_токен")
        sys.exit(1)
    
    # Запускаем бота
    bot.run(token)


if __name__ == "__main__":
    main()
