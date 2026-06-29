# Spec — Agent Office (Hermes dashboard plugin)

> Бриф для агентов-исполнителей. Строим **MVP**, который реально работает в дашборде.
> Не выдумывай лишнего — сначала рабочий минимум, потом украшения.

## Цель

Вкладка в Hermes-дашборде **«Agent Office»**: визуальный офис, где каждый профиль —
персонаж за столом с живым статусом. Клик по персонажу → панель с его текущей
активностью.

## MVP (обязательный минимум)

1. **Вкладка** «Agent Office» появляется в дашборде (через manifest + register).
2. **Список профилей** как персонажи/столы. Профили берём из API дашборда
   (не хардкодить).
3. **Живой статус** на каждом агенте: `idle` / `working` / `blocked` + заголовок
   текущей задачи. Обновление каждые ~5 сек (поллинг) или по событиям.
4. **Клик по персонажу** → drawer/панель: текущая задача, последние события/логи
   этого агента (история «runs», heartbeat-заметки).
5. Внятные состояния **loading / error / empty**. Никаких моков в финале.

## Стретч (если останется время)

- Геймификация: офисный «план», анимация «печатает/думает».
- **Живые рассуждения**: токен-стрим через API-сервер
  `/api/sessions/{id}/chat/stream` (SSE: `assistant.delta`, `tool.started`,
  `tool.completed`, `run.completed`). Включить `API_SERVER_ENABLED` + ключ.

## Технические рамки (важно)

- **Стек:** React 19 + TypeScript + Tailwind v4 + shadcn.
- **React НЕ бандлить.** Берём из SDK дашборда: `window.__HERMES_PLUGIN_SDK__`
  (React + shadcn + `fetchJSON`). Бандл должен быть маленьким.
- Сборка в **IIFE** → `dashboard/dist/index.js`. Регистрация:
  `window.__HERMES_PLUGINS__.register("agent-office", Component)` (есть ~2 сек
  после загрузки скрипта, чтобы вызвать register).
- `manifest.json` — сверить поля с актуальным примером (см. ссылки ниже), не
  полагаться вслепую на скелет в репо.
- Локальные plugin-роуты на localhost **обходят авторизацию** — это норм для локалки.

## Источники данных (проверены)

- **Профили:** API дашборда (вкладка Profiles) / `hermes profile list`.
- **Статусы/задачи:** kanban REST `/api/plugins/kanban/` + WebSocket `task_events`;
  общий `/api/status` (интервал ~5 сек).
- **Активность агента:** `hermes kanban runs/log/context <id>`, heartbeat-заметки.
- **Рассуждения (стретч):** API-сервер SSE (см. выше).

## Установка/проверка

Готовый бандл кладётся в `~/.hermes/plugins/agent-office/dashboard/`. Хот-релоад:
`curl 127.0.0.1:9119/api/dashboard/plugins/rescan`. Проверка: вкладка появилась,
в консоли нет ошибок, `window.__HERMES_PLUGINS__` определён, в Network нет 404 на
`manifest.json` / `index.js` / css.

## Ссылки

- Доку: https://hermes-agent.nousresearch.com/docs/user-guide/features/extending-the-dashboard
- Пример: https://github.com/NousResearch/hermes-example-plugins/tree/main/example-dashboard
