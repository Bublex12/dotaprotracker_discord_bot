export const metadata = {
  title: 'Dota 2 Hero Screenshot Bot',
  description: 'Discord бот для получения скриншотов билдов героев',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}

