# Kinomaster AI Server

Серверный мост между Киномастер-Ай 2.0 и SYNTX.

## Требования

- Node.js 20+
- SYNTX API token
- Render или другой Node.js hosting

## Установка

В настройках Render:

Root Directory:
server

Build Command:
npm install

Start Command:
npm start

## Переменные окружения

SYNTX_TOKEN
Токен доступа к SYNTX.

KINOMASTER_ACCESS_KEY
Секретный ключ для доступа Киномастера к серверу.

FRONTEND_ORIGIN
Адрес опубликованного интерфейса Киномастера.

## Проверка сервера

GET /health

## Запуск генерации

POST /api/video/start

Заголовок:
X-Kino-Key: YOUR_ACCESS_KEY

JSON:

{
  "chat_id": "CHAT_ID",
  "ai_name": "MODEL_NAME",
  "prompt": "Описание видео",
  "settings": {},
  "file_urls": [],
  "audio_url": null
}

## Проверка статуса

GET /api/video/status?chat_id=CHAT_ID

Заголовок:
X-Kino-Key: YOUR_ACCESS_KEY
