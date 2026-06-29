# Spec — Agent Office

> Бриф для агентов-исполнителей. Строим **отдельное локальное web-приложение**, а не просто дополнительную страницу внутри Hermes dashboard.
> Главная цель демо: визуально показать, как Hermes Kanban + Profiles работают как «офис сотрудников».

## Главная идея

**Agent Office** — отдельное приложение, которое открывается в браузере и выглядит как офис.

Каждый Hermes profile — это сотрудник/персонаж:

- `frontend` — сидит за frontend-столом и делает frontend-задачи;
- `backend` — сидит за backend-столом и делает backend/API-задачи;
- `reviewer` / tester — проверяет задачи за review/test desk;
- свободный worker (`idle`) стоит у кофемашины / в lounge зоне;
- заблокированный worker (`blocked`) подсвечен и стоит/сидит в зоне problem/help.

Позже кружочки заменим на картинки/аватары, но в MVP можно использовать круги с initials/icon.

## Что НЕ является финальной целью

Не делать просто таблицу, список или набор карточек.
Не делать обычную вкладку Hermes dashboard как финальный UX.
Не ограничиваться card UI вида «5 карточек профилей».

Допускается использовать Hermes dashboard/API как источник данных, но сам Agent Office должен быть отдельным приложением с собственным visual office layout.

## MVP — обязательный минимум

1. **Standalone app**
   - Запускается локально командой вроде `npm run dev`.
   - Открывается в браузере отдельным URL, например `http://127.0.0.1:5173`.
   - Может проксировать запросы к Hermes dashboard/API на `127.0.0.1:9119`.

2. **Visual office scene**
   - На экране есть офисный план: desks, coffee machine, review/test area, maybe meeting/blocked area.
   - Это не список карточек, а визуальная сцена.
   - Можно реализовать через CSS grid/absolute positioning/SVG — без тяжёлого canvas/game engine на MVP.

3. **Profiles as workers**
   - Каждый Hermes profile отображается как круг/иконка/человечек.
   - Персонаж имеет имя профиля и статус.
   - В MVP можно использовать initials: `FE`, `BE`, `RV` или первую букву профиля.

4. **Status-driven placement**
   - `working`: сотрудник сидит за своим рабочим столом.
   - `reviewer/testing`: сотрудник находится у review/test desk.
   - `idle`: сотрудник находится у кофемашины/lounge и «отдыхает».
   - `blocked`: сотрудник визуально выделен и находится в problem/help zone.

5. **Real data, no final mocks**
   - Профили брать из реального Hermes API, если доступно.
   - Статусы/задачи брать из Kanban API.
   - Если endpoint недоступен, показывать честное error/degraded state, а не фейковые данные.

6. **Agent interaction**
   - Клик по сотруднику открывает drawer/панель.
   - В панели: текущая задача, статус, последние runs/events/heartbeat, если доступны.

7. **States**
   - loading;
   - error;
   - empty;
   - degraded/API unavailable.

## Stretch после MVP

- Анимация движения сотрудника от кофемашины к столу при появлении задачи.
- Typing/thinking animation за столом.
- Reviewer visually checks task: magnifier/checklist animation.
- Speech bubbles: «working», «reviewing», «blocked», «idle».
- Live event stream через WebSocket/SSE, если доступно.
- Замена кругов на картинки/персонажей.

## Data sources

Основные данные можно брать из Hermes dashboard/API:

- Profiles: `/api/profiles`.
- Kanban board: `/api/plugins/kanban/board`.
- Task details: `/api/plugins/kanban/tasks/{id}`.
- General status: `/api/status`.

Для standalone app нужен Vite proxy или dev-server proxy:

```ts
server: {
  proxy: {
    "/api": "http://127.0.0.1:9119"
  }
}
```

## Suggested app structure

```text
agent-office/
├── app/                    # standalone local web app
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── types.ts
│       ├── officeLayout.ts
│       ├── components/
│       │   ├── OfficeScene.tsx
│       │   ├── WorkerAvatar.tsx
│       │   ├── Desk.tsx
│       │   ├── CoffeeMachine.tsx
│       │   └── AgentDrawer.tsx
│       └── styles.css
├── dashboard/              # optional plugin wrapper/prototype, not final UX
├── spec.md
├── review.md
└── README.md
```

## Acceptance for MVP

- `npm --prefix app install` works.
- `npm --prefix app run build` works.
- `npm --prefix app run dev -- --host 127.0.0.1` starts a local app.
- Browser opens standalone app URL.
- UI looks like an office scene, not profile cards.
- Profiles are shown as people/icons positioned in the office.
- Idle worker appears near coffee machine/lounge.
- Working worker appears at desk.
- Reviewer/tester appears at review/test area.
- Blocked worker is visually distinguishable.
- Clicking a worker opens details drawer.
- No secrets, no `node_modules`, no junk committed.
