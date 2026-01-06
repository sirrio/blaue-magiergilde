# AI Agent Documentation

## 1. Overview
This project is a Laravel 12 web application paired with a React 19 front-end using InertiaJS. It manages RPG related data such as characters, items, spells and games. No AI or ML models are integrated.
The repository also contains a Discord bot under `bot/` that is part of the same product and shares configuration with the app.

## 2. Architecture
- **Backend:** PHP 8.3 with Laravel framework.
- **Frontend:** React and TypeScript compiled through Vite with server-side rendering enabled via InertiaJS.
- **Discord Bot:** Node.js bot located in `bot/`, using the same root `.env` and database as the app.
- **Database:** Migrations define tables for users, characters, adventures and related entities.
- **Queue & Cache:** Default connection is database driven.

## 3. Data Flow
Requests hit Laravel route files which map to controller classes. Controllers interact with Eloquent models for CRUD operations and render React pages via Inertia. Queued jobs and cached data use the database backend configured in `.env`.

## 4. Components & Modules
- **Models:** Character, Item, Spell, Game, etc.
- **Controllers:** Resource controllers for characters, items, shops and more.
- **Routes:** REST style endpoints grouped in `routes/web/*`. Authentication routes are in `routes/auth.php`.
- **React Components:** Located under `resources/js` for UI and forms.
- **Bot Commands:** Located under `bot/commands`, with shared configuration from the root `.env`.

## 5. Models & Data Pipelines
No ML models or data pipelines are defined in this repository.

## 6. APIs & Integrations
- **Discord OAuth:** Configured via Socialite, requiring `DISCORD_CLIENT_ID` and related secrets【F:config/services.php†L17-L25】.
- **Inertia SSR:** Enabled with a local Node server at `http://127.0.0.1:13714`【F:config/inertia.php†L15-L23】.

## 7. Configuration & Deployment
- Environment variables are provided in `.env.example` with defaults for database, session, queue and cache drivers【F:.env.example†L11-L40】.
- Queues default to the database driver【F:config/queue.php†L9-L24】.
- `vite.config.ts` configures React, Tailwind and SSR builds.

## 8. Security & Compliance
- Laravel’s authentication system is used with session guard and Eloquent provider【F:config/auth.php†L20-L47】.
- Secrets are expected via environment variables; no secrets are committed.
- OAuth with Discord requires client credentials.

## 9. Logging & Monitoring
Logging defaults to a stack of channels with daily file logs and optional Slack or Papertrail integration【F:config/logging.php†L13-L132】.

## 10. Testing
- PHP tests use Pest; feature tests cover authentication and profile management【F:tests/Feature/Auth/RegistrationTest.php†L1-L20】.
- `npm run lint` executes ESLint, and TypeScript types can be checked via `npm run types`.
- Current test run shows multiple failing assertions【6b0f08†L1-L19】【808791†L1-L10】.

## 11. Performance & Scalability
- Database-backed queues and caching may become bottlenecks under load. Consider Redis for higher throughput.
- Server Side Rendering is enabled for faster first paint.

## 12. Dependencies & Licensing
- Composer packages include Laravel, Socialite and InertiaJS with MIT license declared in `composer.json`【F:composer.json†L5-L18】.
- Node packages include React, Vite and TailwindCSS【F:package.json†L4-L57】.

## 13. Maintenance & Next Steps
- Resolve failing Pest tests to ensure application integrity.
- Evaluate moving queue and cache to Redis for scalability.
- Document deployment steps for SSR and queue workers.

## 14. Coordination Rule
When implementing new features, always update both the Laravel app and the Discord bot as needed so they stay in sync.
