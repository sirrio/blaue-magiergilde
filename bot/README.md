# Westwatch Tales Bot

## Befehle

Standard-Prefix ist `wwt` (z.B. `/wwt-list-characters`).

### Charaktere (App)

Diese Commands verwalten **deine App-Charaktere** (Tabelle `characters`) direkt über Discord.
Voraussetzung: dein App-Account ist in `settings/profile` mit Discord verbunden (damit `users.discord_id` gesetzt ist).
Der Bot erstellt **keinen** User automatisch.

- `/[prefix]-register-character` - erstellt einen Charakter (Modal: Name, Start-Tier, External Link, Notizen).
- `/[prefix]-list-characters` - listet deine Charaktere inkl. ID.
- `/[prefix]-update-character` - aktualisiert einen Charakter per ID (Modal).
- `/[prefix]-unregister-character` - löscht einen Charakter per ID (mit Bestätigung, soft delete).

Wenn Discord nicht verbunden ist, zeigt der Bot in Discord einen **Join-Button** an, mit dem ein neuer App-Account erstellt werden kann (explizite Bestätigung nötig).

### Shop

- `/[prefix]-post-shop` - postet den neuesten (oder eine angegebene) Shop in einen Thread (oder erstellt einen Thread in einem Text-Channel).

## Konfiguration (ein einziges Env)

Der Bot nutzt die **gleiche** Root-`.env` wie die Laravel-App (ein einziges Env-File im Projekt-Hauptordner).
`bot/config.json` wird nicht mehr unterstützt.

### Root `.env` (empfohlen)

Setze folgende Variablen in der Root-`.env`:

- `DISCORD_BOT_TOKEN` - Bot Token
- `DISCORD_CLIENT_ID` - Discord Application ID (wird auch für OAuth in der App genutzt)
- `DISCORD_GUILD_IDS` - kommaseparierte Liste (für Guild-Commands, meist sofort sichtbar)
- `DISCORD_COMMAND_PREFIX` - z.B. `wwt`
- `DISCORD_OWNER_IDS` - kommaseparierte Discord User IDs (Owner-only Commands)

DB nutzt die gleichen Laravel-Variablen:
- `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`

### Kein `bot/config.json`

Wenn du noch `bot/config.json` hast: löschen und alles in der Root-`.env` pflegen.

## Commands deployen

Registriere/aktualisiere Slash-Commands mit `node deploy-commands.js` und starte danach den Bot neu.

- Wenn du `DISCORD_GUILD_IDS` setzt, werden Commands als **Guild Commands** deployed (meist sofort sichtbar).
- Ohne `DISCORD_GUILD_IDS` werden **Global Commands** deployed (kann bis zu ~1h dauern, bis sie in Discord auftauchen).

## Security / Sharing

- Poste niemals Tokens (oder DB-Passwörter) in Chat/Issues/Screenshots.
- Wenn du Konfiguration teilen musst, nutze den Redaction-Helper (liest aus `.env`):
  - `node redact-config.js > config.redacted.json`
  - Teile dann `config.redacted.json` statt echter Secrets.
