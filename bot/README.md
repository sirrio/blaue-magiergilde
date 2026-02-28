# blauer-magiergilde-bot

## Commands

Default prefix is `mg` (example: `/mg-characters`).

### Characters (App)

These commands manage **your app characters** (table `characters`) directly via Discord.
Requirement: your app account is connected to Discord in `settings/profile` (so `users.discord_id` is set).
The bot does **not** create a user automatically.

- `/[prefix]-characters` - shows your characters in a dashboard view with **Edit**, **Delete**, and **New**.
  - If the character has an avatar in the app (for example `avatars/foo.webp`), the bot shows it as a thumbnail.
  - Avatar and starting tier cannot be changed in the bot (starting tier only during creation).

If Discord is not connected, the bot shows a **Join** button in Discord to create a new app account (explicit confirmation required).

### Shop

- Shops are posted from the app (Shop page). The bot handles the HTTP request and creates a thread when needed.

### Voice Sync

- Voice channel candidates are synced from the app via an HTTP endpoint (no slash command).

### Discord Backup (App)

- The app admin panel can start a manual backup of selected text channels and threads.
- The app decides which channels to back up (selection in the admin panel).
- The bot reads history, downloads attachments, and stores everything in the app.
- Requirements: enable `GuildMessages` + `MessageContent` intents in the Discord Developer Portal.

### Auctions (App)

- Auctions are managed in the app; closing an auction automatically creates a new one.
- If no auction exists, the app creates one automatically on first visit.
- Hidden bids are managed in the app; the bot has no role here.
- The bot has no auction commands and is passive for auctions.

### Support Tickets (Bot DMs)

- If a user sends a DM to the bot, a support ticket thread is created in the channel configured in app `admin/settings` (Bot settings).
- Avatar upload DM flows for character creation/update are handled first and do not create tickets.
- Staff replies in the ticket thread are forwarded back to the user DM.
- User and staff relays are posted as clear plain messages.
- Each ticket has one pinned header embed that is auto-updated with current state + assignee.
- The pinned header has buttons for `Claim`, `Unclaim`, `Close`, and `Reopen`.
- States: `open`, `pending_staff`, `pending_user`, `closed`.
- Ticket controls should be used via the header buttons.
- DM shortcuts still exist: `close` and `reopen`.

## Configuration (single .env)

The bot uses the **same** root `.env` as the Laravel app (one env file in the project root).
`bot/config.json` is no longer supported.

### Root `.env` (recommended)

Set these in the root `.env`:

- `DISCORD_BOT_TOKEN` - bot token
- `DISCORD_CLIENT_ID` - Discord application ID (also used for OAuth in the app)
- `DISCORD_GUILD_IDS` - comma-separated list (for guild commands, visible immediately)
- `DISCORD_COMMAND_PREFIX` - for example `mg`
- `DISCORD_SUPPORT_STAFF_ROLE_IDS` - optional comma-separated role IDs allowed to relay/close tickets in threads. Empty means everyone with thread access.
- `BOT_APP_URL` - internal base URL for bot → app API calls (for example `http://127.0.0.1:8000` or a private hostname).
- `BOT_PUBLIC_APP_URL` - optional public base URL for links/avatars in Discord (for example `https://blaue-magiergilde.de`). Overrides `APP_URL` for links only.

- `BOT_HTTP_TOKEN` - shared secret for bot HTTP control (voice sync + shop/auction posting + backup)
- `BOT_HTTP_URL` - base URL for the bot HTTP server (no path, for example `http://127.0.0.1:3125`)
- `BOT_HTTP_HOST` - optional listen host override (default: 127.0.0.1)
- `BOT_HTTP_PORT` - optional listen port override (default: 3125)
- `BOT_HTTP_RATE_LIMIT_MS` - optional throttle for inbound bot HTTP requests (default: 15000)
- `BOT_BACKUP_BATCH_SIZE` - optional message batch size per channel (default: 100)
- `BOT_BACKUP_DELAY_MS` - optional delay between message batches (default: 1200)
- `BOT_BACKUP_ATTACHMENT_DELAY_MS` - optional delay between attachment uploads (default: 250)

Database uses the same Laravel variables:

- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

### No `bot/config.json`

If you still have `bot/config.json`, delete it and use the root `.env` only.

## Deploying commands

Register or update slash commands with `node deploy-commands.js` and then restart the bot.

- With `DISCORD_GUILD_IDS`, commands are deployed as **Guild Commands** (usually immediate).
- Without `DISCORD_GUILD_IDS`, commands are **Global Commands** (can take up to ~1 hour to appear).

## Security / Sharing

- Never post tokens (or DB passwords) in chat/issues/screenshots.
- If you must share config, use the redaction helper (reads from `.env`):
  - `node redact-config.js > config.redacted.json`
  - Share `config.redacted.json` instead of real secrets.
