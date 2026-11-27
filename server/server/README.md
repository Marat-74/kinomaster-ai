
# Kinomaster AI Server

Серверный мост между Киномастер-Ай 2.0 и SYNTX.

## Требования

- Node.js 20+
- SYNTX API token
- Render или другой Node.js hosting

## Установка

Настройки Render:

Root Directory:
server

Build Command:
npm install

Start Command:
npm start

## Переменные окружения

SYNTX_TOKEN — токен доступа к SYNTX.

KINOMASTER_ACCESS_KEY — секретный ключ Киномастера.

FRONTEND_ORIGIN — адрес опубликованного интерфейса Киномастера.

## Проверка сервера

GET /health

## Запуск генерации

POST /api/video/start

Заголовок:
X-Kino-Key: YOUR_ACCESS_KEY

## Проверка статуса

GET /api/video/status?chat_id=CHAT_ID
