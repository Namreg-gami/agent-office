# Agent Office

Геймифицированный **плагин для Hermes-дашборда**: офис, где профили Hermes —
человечки за столами с живым статусом «кто что делает». Клик по человечку → активность
и рассуждения этого агента.

Это **демо-проект для видео** (NAMREG, «AI Agents на практике», part 2). Цель —
показать, как одну и ту же задачу строят на трёх уровнях оркестрации:

1. **Subagents** (`delegate_task`)
2. **Profiles** (`hermes profile`)
3. **Kanban + Profiles** (`hermes kanban`)

> Код пишут сами агенты на камеру. Этот репозиторий — только «стройплощадка»:
> спека ([spec.md](spec.md)), критерии ревью ([review.md](review.md)) и скелет плагина.

## Параллельная работа в git-ветках (worktree)

Чтобы воркеры пилили проект **параллельно без конфликтов**, используем воркспейс
`worktree`: на каждую задачу Hermes создаёт git-worktree в `.worktrees/<id>/` — своя
ветка под задачу. Поэтому репо уже инициализирован и имеет initial commit (worktree
ответвляется от существующего репозитория).

- **Kanban (способ 3):** в задаче ставим workspace `worktree` — ветки раздаются сами.
- **Profiles (способ 2):** каждому профилю даём свою ветку/worktree вручную
  (через `terminal.cwd` или `git worktree add`).

## Структура

```
agent-office/
├── spec.md             # ЧТО строить (бриф для агентов)
├── review.md           # критерии проверки (для reviewer-профиля)
└── dashboard/
    ├── manifest.json   # манифест плагина (скелет — сверять с актуальным примером)
    └── src/            # сюда агенты пишут React-исходники
```

Сборка даёт `dashboard/dist/index.js` (IIFE-бандл), который кладётся в
`~/.hermes/plugins/agent-office/dashboard/` и появляется вкладкой в дашборде.

## Ссылки

- Доку по плагинам: https://hermes-agent.nousresearch.com/docs/user-guide/features/extending-the-dashboard
- Официальный пример: https://github.com/NousResearch/hermes-example-plugins/tree/main/example-dashboard
