# Agent Office

Отдельное локальное web-приложение для демо Hermes Kanban + Profiles как визуального офиса.

## Идея

Agent Office должен выглядеть как офис, где каждый Hermes profile — отдельный сотрудник:

- frontend сидит за своим столом и делает frontend-задачи;
- backend сидит за backend/API-столом;
- reviewer/tester проверяет задачи в review/test зоне;
- idle worker отдыхает у кофемашины/lounge;
- blocked worker подсвечен и находится в problem/help зоне.

Это **не просто карточки профилей** и не финальная «страница внутри Hermes dashboard». Dashboard/API можно использовать как источник данных, но основной UX — standalone office app.

## Для чего проект

Это демо-проект для видео NAMREG про AI Agents на практике:

1. Как Hermes Profiles работают как разные сотрудники.
2. Как Kanban диспетчеризует задачи между профилями.
3. Как reviewer проверяет работу.
4. Как всё это можно визуализировать как офисную сцену.

## Структура

```text
agent-office/
├── app/                    # standalone local web app — основное приложение
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
├── dashboard/              # старый plugin/prototype; не финальный UX
├── spec.md                 # актуальный бриф
├── review.md               # критерии проверки
└── README.md
```

## Источники данных

Приложение может использовать Hermes dashboard/API:

- profiles: `/api/profiles`;
- kanban board: `/api/plugins/kanban/board`;
- task detail: `/api/plugins/kanban/tasks/{id}`;
- status: `/api/status`.

В dev mode Vite может проксировать `/api` на локальный Hermes dashboard:

```ts
server: {
  proxy: {
    "/api": "http://127.0.0.1:9119"
  }
}
```

## Проверка

```bash
npm --prefix app install
npm --prefix app run build
npm --prefix app run dev -- --host 127.0.0.1
```

Ожидаемый результат: браузер открывает отдельное приложение с визуальным офисом, где профили отображаются как сотрудники в разных зонах офиса в зависимости от текущего Kanban-статуса.
