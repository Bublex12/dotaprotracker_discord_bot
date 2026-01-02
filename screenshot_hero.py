#!/usr/bin/env python3
"""
Скрипт для создания скриншотов страниц героев с dota2protracker.com
Измените переменную HERO_NAME в коде для указания нужного героя
"""

import sys
import os
from pathlib import Path
from playwright.sync_api import sync_playwright


def ensure_browser_installed():
    """Проверяет и устанавливает браузер Chromium, если он не установлен"""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            # Пробуем запустить браузер для проверки
            browser = p.chromium.launch(headless=True)
            browser.close()
    except Exception:
        print("Браузер Chromium не установлен. Устанавливаю...")
        import subprocess
        result = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✓ Браузер успешно установлен!")
        else:
            print(f"✗ Ошибка при установке браузера: {result.stderr}")
            print("Попробуйте вручную выполнить: python -m playwright install chromium")
            sys.exit(1)


def screenshot_hero(hero_name: str, output_dir: str = "screenshots", wait_time: int = 5000):
    """
    Делает скриншот вкладки Builds для героя с dota2protracker.com
    
    Args:
        hero_name: Название героя (например, 'mars')
        output_dir: Директория для сохранения скриншотов
        wait_time: Время ожидания загрузки страницы в миллисекундах
    """
    # Формируем URL
    url = f"https://dota2protracker.com/hero/{hero_name.lower()}"
    
    # Создаем директорию для скриншотов, если её нет
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Формируем путь к файлу скриншота
    screenshot_path = output_path / f"{hero_name.lower()}.png"
    
    print(f"Открываю страницу: {url}")
    
    with sync_playwright() as p:
        # Запускаем браузер (headless=False для отладки, можно поставить True)
        browser = p.chromium.launch(headless=True)
        
        # Создаем новую страницу
        page = browser.new_page()
        
        # Устанавливаем размер окна
        page.set_viewport_size({"width": 1920, "height": 1080})
        
        try:
            # Переходим на страницу
            page.goto(url, wait_until="networkidle", timeout=15000)
            
            # Ждем немного для появления уведомления о cookies/GDPR
            page.wait_for_timeout(500)
            
            # Закрываем уведомление о согласии (cookie consent)
            print("Проверяю наличие уведомления о согласии...")
            consent_selectors = [
                'button:has-text("Consent")',
                'button:has-text("Accept")',
                'button:has-text("Согласиться")',
                'button:has-text("Принять")',
                '[id*="consent"]',
                '[class*="consent"]',
                '[id*="cookie"]',
                '[class*="cookie"]',
                'button[aria-label*="Consent"]',
                'button[aria-label*="Accept"]',
            ]
            
            consent_clicked = False
            for selector in consent_selectors:
                try:
                    consent_button = page.locator(selector).first
                    if consent_button.is_visible(timeout=1000):
                        consent_button.click()
                        print("✓ Закрыл уведомление о согласии")
                        consent_clicked = True
                        page.wait_for_timeout(300)  # Ждем исчезновения уведомления
                        break
                except:
                    continue
            
            if not consent_clicked:
                print("⚠ Уведомление о согласии не найдено (возможно, уже закрыто или отсутствует)")
            
            # Ждем минимальное время для загрузки контента
            page.wait_for_timeout(300)
            
            # Сначала кликаем на вкладку Builds, чтобы контент стал видимым
            print("Ищу и активирую вкладку 'Builds'...")
            builds_tab_selectors = [
                'button:has-text("Builds")',
                'a:has-text("Builds")',
                '[role="tab"]:has-text("Builds")',
                'text="Builds"',
                'button >> text="Builds"',
                'a >> text="Builds"',
            ]
            
            builds_tab_clicked = False
            for selector in builds_tab_selectors:
                try:
                    builds_tab = page.locator(selector).first
                    if builds_tab.is_visible(timeout=1000):
                        builds_tab.click()
                        print("✓ Кликнул на вкладку 'Builds'")
                        builds_tab_clicked = True
                        # Ждем загрузки контента вкладки
                        page.wait_for_timeout(500)
                        break
                except:
                    continue
            
            if not builds_tab_clicked:
                print("⚠ Вкладка 'Builds' не найдена, пробую найти контент напрямую...")
                page.wait_for_timeout(300)
            
            # Ищем контейнер с контентом вкладки Builds напрямую по классу
            print("Ищу контент вкладки Builds...")
            builds_element = page.locator('.flex.flex-col.gap-1').first
            
            # Проверяем, что элемент существует в DOM
            try:
                builds_element.wait_for(state="attached", timeout=2000)
                print("✓ Найден контент вкладки Builds")
            except:
                builds_element = None
                print("⚠ Контент вкладки Builds не найден")
            
            if builds_element:
                # Используем JavaScript для получения координат элемента
                try:
                    # Получаем координаты через JavaScript (работает даже для скрытых элементов)
                    bbox = page.evaluate("""() => {
                        const element = document.querySelector('.flex.flex-col.gap-1');
                        if (!element) return null;
                        const rect = element.getBoundingClientRect();
                        return {
                            x: rect.x + window.scrollX,
                            y: rect.y + window.scrollY,
                            width: rect.width,
                            height: rect.height
                        };
                    }""")
                    
                    if bbox and bbox['width'] > 0 and bbox['height'] > 0:
                        # Прокручиваем к элементу
                        page.evaluate(f"window.scrollTo(0, {bbox['y'] - 100})")
                        page.wait_for_timeout(300)
                        
                        # Делаем скриншот области
                        page.screenshot(
                            path=str(screenshot_path),
                            clip={
                                "x": bbox['x'],
                                "y": bbox['y'],
                                "width": bbox['width'],
                                "height": bbox['height']
                            }
                        )
                        print(f"✓ Скриншот вкладки Builds сохранен: {screenshot_path}")
                    else:
                        # Если JavaScript не сработал, пробуем обычный метод
                        builds_element.screenshot(path=str(screenshot_path))
                        print(f"✓ Скриншот вкладки Builds сохранен: {screenshot_path}")
                except Exception as e:
                    print(f"⚠ Ошибка при скриншоте через JavaScript: {e}")
                    # Пробуем обычный метод как запасной вариант
                    try:
                        builds_element.screenshot(path=str(screenshot_path), timeout=2000)
                        print(f"✓ Скриншот вкладки Builds сохранен: {screenshot_path}")
                    except:
                        raise Exception(f"Не удалось сделать скриншот: {e}")
            else:
                # Если не удалось найти конкретный элемент, пробуем найти через родительский контейнер
                print("⚠ Контент не найден по стандартным селекторам...")
                try:
                    # Ищем любой контейнер с классом flex flex-col
                    parent_element = page.locator('div.flex.flex-col').first
                    if parent_element.is_visible(timeout=1000):
                        parent_element.screenshot(path=str(screenshot_path))
                        print(f"✓ Скриншот родительского контейнера сохранен: {screenshot_path}")
                    else:
                        raise Exception("Родительский контейнер не найден")
                except:
                    # В крайнем случае делаем скриншот всей страницы
                    print("⚠ Делаю скриншот всей страницы как запасной вариант...")
                    page.screenshot(path=str(screenshot_path), full_page=True)
                    print(f"✓ Скриншот сохранен: {screenshot_path}")
            
        except Exception as e:
            print(f"✗ Ошибка при создании скриншота: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            browser.close()


def main():
    # ========================================
    # НАСТРОЙКИ - измените эти переменные
    # ========================================
    HERO_NAME = "pudge"  # Название героя (например: "mars", "pudge", "invoker")
    OUTPUT_DIR = "screenshots"  # Папка для сохранения скриншотов
    WAIT_TIME = 200  # Время ожидания загрузки страницы в миллисекундах (уменьшено для ускорения)
    # ========================================
    
    # Проверяем и устанавливаем браузер при необходимости
    ensure_browser_installed()
    
    screenshot_hero(HERO_NAME, OUTPUT_DIR, WAIT_TIME)


if __name__ == "__main__":
    main()

