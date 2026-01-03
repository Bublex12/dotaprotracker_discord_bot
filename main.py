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
import aiohttp

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

# URL API для получения данных о матче
MATCH_API_URL = "https://dotaspectator-production.up.railway.app/players"


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


@bot.command(name='match')
async def match_command(ctx):
    """
    Команда для получения списка игроков текущего матча Dota 2.
    Использование: !match
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(MATCH_API_URL, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Проверяем статус ответа
                    if data.get("status") == "no_match":
                        await ctx.send("❌ Нет активного матча. Убедитесь, что матч запущен и сервер GSI получает данные.")
                        return
                    
                    if data.get("status") == "error":
                        error_msg = data.get("message", "Неизвестная ошибка")
                        await ctx.send(f"❌ Ошибка при получении данных о матче: {error_msg}")
                        return
                    
                    players = data.get("players", [])
                    
                    if not players:
                        await ctx.send("❌ Игроки не найдены в данных матча.")
                        return
                    
                    # Формируем сообщение в формате "Ник - Dotabuff ссылка"
                    lines = []
                    for player in players:
                        name = player.get('name', 'Unknown')
                        dotabuff_url = player.get('dotabuff_url')
                        
                        if dotabuff_url:
                            lines.append(f"{name} - {dotabuff_url}")
                        else:
                            steamid = player.get('steamid', 'N/A')
                            if steamid != 'N/A':
                                # Пытаемся создать ссылку вручную
                                if steamid and str(steamid).isdigit() and len(str(steamid)) == 17:
                                    dotabuff_url = f"https://www.dotabuff.com/players/{steamid}"
                                    lines.append(f"{name} - {dotabuff_url}")
                                else:
                                    lines.append(f"{name} - (SteamID: {steamid})")
                            else:
                                lines.append(f"{name} - (нет SteamID)")
                    
                    message_text = "\n".join(lines)
                    
                    # Discord имеет лимит на длину сообщения (2000 символов)
                    # Если сообщение слишком длинное, разбиваем на части
                    if len(message_text) > 2000:
                        chunks = []
                        current_chunk = []
                        current_length = 0
                        
                        for line in lines:
                            line_length = len(line) + 1  # +1 для переноса строки
                            
                            if current_length + line_length > 1900:
                                chunks.append("\n".join(current_chunk))
                                current_chunk = [line]
                                current_length = line_length
                            else:
                                current_chunk.append(line)
                                current_length += line_length
                        
                        if current_chunk:
                            chunks.append("\n".join(current_chunk))
                        
                        # Отправляем первое сообщение
                        await ctx.send(chunks[0])
                        
                        # Отправляем остальные части
                        for chunk in chunks[1:]:
                            await ctx.send(chunk)
                    else:
                        await ctx.send(message_text)
                        
                else:
                    await ctx.send(f"❌ Ошибка при обращении к API матча (код {response.status})")
                    
    except aiohttp.ClientError as e:
        await ctx.send(f"❌ Ошибка при подключении к серверу матча: {str(e)}")
    except asyncio.TimeoutError:
        await ctx.send("❌ Превышено время ожидания ответа от сервера матча.")
    except Exception as e:
        error_msg = str(e)
        print(f"Ошибка при получении данных о матче: {error_msg}")
        import traceback
        traceback.print_exc()
        await ctx.send(f"❌ Произошла ошибка при получении данных о матче:\n`{error_msg[:200]}`")


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
              "Примеры: `!hero mars`, `!hero pudge`, `!hero invoker`\n\n"
              "`!match` - Получить список игроков текущего матча Dota 2",
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
