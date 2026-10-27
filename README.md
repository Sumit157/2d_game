# Desi Fighter — Project Pack

A browser-based 2D fighting game built around Indian political satire. This pack is the blueprint for building the game, not the finished game.

## Product direction
- Tekken-inspired 2D side-view combat for browsers.
- Solo mode against AI and online 1v1 multiplayer using private room codes.
- Selectable stages: Indian Parliament and Jantar Mantar.
- Modular characters with individual moves, animations, special abilities and ultimate attacks.
- Original artwork, UI, sound and animations. Do not copy Tekken assets or branding.

## Start here
1. Read `docs/00_PRODUCT_BRIEF.md`.
2. Read `docs/01_TECH_STACK.md` and `docs/02_ARCHITECTURE.md`.
3. Read `docs/04_DATABASE_AND_DATA.md` carefully: MongoDB is intentionally not used in the MVP.
4. Read `docs/08_PHASE_PLAN.md`.
5. Give `MASTER_PROMPT_OPENCODE.md` to OpenCode.
6. Ask OpenCode to implement **Phase 0 only** first and wait for review.

## MVP storage decision
No database is required or planned for the MVP. There are no accounts, saved match history or leaderboards. Colyseus keeps live room and match state in server memory. Rooms expire after play or inactivity. Browser settings may be stored locally on the player's device. MongoDB is not part of the MVP; it can be reconsidered only if a future approved feature needs durable server-side data.

## Local development (Phase 0 scaffold)
Requires Node.js 20.19+ and npm. No database, API keys or paid services.

```bash
npm install        # install workspace dependencies
npm run dev        # shared watcher + web (http://localhost:5173) + server (http://localhost:2567)
```

Scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Builds `packages/shared`, then runs web + server in watch mode |
| `npm run build` | Typecheck all packages, then production build of web + server |
| `npm run typecheck` | TypeScript check across all workspaces |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run format` / `npm run format:check` | Prettier write / verify |

Health checks after `npm run dev`:
- Web: `http://localhost:5173` renders the Phaser placeholder scene.
- Server: `http://localhost:2567/healthz` returns `{"status":"ok",...}`.

Copy `.env.example` to `.env` for local overrides. Never commit `.env`.

## Project principles
- Satire is fictional gameplay, not factual reporting.
- Use original, stylised caricatures rather than photorealistic impersonations.
- Clearly label allegations as allegations when referenced.
- Avoid defamatory claims, private information, hate, threats or unsupported claims that a real person committed a crime.
- Treat commentators and less widely known individuals carefully. Keep optional guest characters configurable and easy to remove.
- Do not use real politician likenesses, cloned voices, campaign logos or copyrighted media without checking permissions and applicable law.
