# Review — критерии проверки Agent Office

> Для reviewer-профиля. Проверяй по пунктам. Каждую находку верифицируй: открой файл, запусти команду, проверь в браузере/API, если возможно.

## Главный критерий

Agent Office должен быть **отдельным локальным web-приложением с визуальным офисом**, а не просто дополнительной вкладкой/страницей Hermes dashboard и не набором карточек.

## Сборка и запуск

- [ ] Есть standalone app в `app/`.
- [ ] `npm --prefix app install` работает.
- [ ] `npm --prefix app run build` работает без TypeScript/Vite ошибок.
- [ ] `npm --prefix app run dev -- --host 127.0.0.1` запускает локальный dev server.
- [ ] Приложение открывается в браузере отдельным URL, например `http://127.0.0.1:5173`.

## Visual office UX

- [ ] На экране виден офисный layout: desks, coffee/lounge area, review/test area, blocked/help area.
- [ ] Профили выглядят как сотрудники/иконки/кружочки-человечки, а не как обычные cards.
- [ ] Каждый worker визуально расположен в офисе в зависимости от статуса.
- [ ] Idle worker находится у кофемашины/lounge.
- [ ] Working worker находится за своим рабочим столом.
- [ ] Reviewer/tester визуально находится в review/test зоне.
- [ ] Blocked worker визуально выделен и находится в problem/help зоне.

## Реальные данные

- [ ] Профили подтягиваются из реального API (`/api/profiles`) или есть честный degraded/error state, если API недоступен.
- [ ] Kanban tasks/status берутся из реального API (`/api/plugins/kanban/board`, `/api/plugins/kanban/tasks/{id}`) или есть честный degraded/error state.
- [ ] Нет финального hardcoded списка профилей как основного источника данных.
- [ ] Нет mock data в финальном пути, кроме явно помеченного fallback/demo mode, если API недоступен.

## Interaction

- [ ] Клик по сотруднику открывает drawer/side panel.
- [ ] Drawer показывает имя профиля, статус, текущую задачу, последние runs/events/heartbeat, если доступны.
- [ ] Есть loading / error / empty / degraded states.

## Гигиена

- [ ] Нет закоммиченных секретов/ключей (`.env`, токены).
- [ ] Нет `node_modules`, build trash или временных файлов в git.
- [ ] README/spec/review совпадают с тем, что реально сделано.
- [ ] Старый `dashboard/` plugin не выдаётся за финальный UX, если standalone app уже реализуется.

## Вывод ревью

Если приложение выглядит как карточки/таблица, а не офис — BLOCK.
Если нет standalone app — BLOCK.
Если данные полностью hardcoded без честного API/degraded path — BLOCK.
Иначе — PASS с кратким саммари команд, результата сборки и визуальной проверки.
