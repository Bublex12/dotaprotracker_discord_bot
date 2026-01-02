/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  // Увеличиваем таймаут для serverless функций (максимум 60 секунд на Hobby плане)
  // Для Pro плана можно до 300 секунд
  serverRuntimeConfig: {
    maxDuration: 60,
  },
}

module.exports = nextConfig

