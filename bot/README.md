# Westwatch Tales Bot

## Befehle

Standard-Prefix ist `wwt` (z.B. `/wwt-list-characters`). Du kannst es per `COMMAND_PREFIX` oder `config.json.commandPrefix` ändern.

### Charaktere (App)

Diese Commands verwalten **deine App-Charaktere** (Tabelle `characters`) direkt über Discord. Voraussetzung: dein App-Account ist in `settings/profile` mit Discord verbunden (damit `users.discord_id` gesetzt ist). Der Bot erstellt **keinen** User automatisch.

- `/[prefix]-register-character` – erstellt einen Charakter (Modal: Name, Start-Tier, External Link, Notizen).
- `/[prefix]-list-characters` – listet deine Charaktere inkl. ID.
- `/[prefix]-update-character` – aktualisiert einen Charakter per ID (Modal).
- `/[prefix]-unregister-character` – löscht einen Charakter per ID (mit Bestätigung, soft delete).

### Shop

- `/[prefix]-post-shop` – postet den neuesten (oder eine angegebene) Shop in einen Thread (oder erstellt einen Thread in einem Text-Channel).

## Konfiguration

Der Bot kann entweder per `config.json` (empfohlen) oder optional per `.env` konfiguriert werden (Env-Variablen überschreiben `config.json`).

### config.json (empfohlen)

Kopiere `config.json.example` nach `config.json` und setze mindestens `clientId` und `token`.

Optional:
- `commandPrefix` (z.B. `wwt` → `/wwt-list-characters`)
- `ownerIds` (Array von Discord User IDs; wirkt nur für Commands mit `ownerOnly`, z.B. `reload`)
- `db` (DB-Zugriff für Character- und Shop-Commands)
- `guildId` oder `guildIds` (Guild Commands für sofortige Updates)

### .env (optional)

Kopiere `.env.example` nach `.env` und passe die Werte an:

- `COMMAND_PREFIX` (optional, überschreibt `config.json.commandPrefix`)
- `OWNER_DISCORD_IDS` (optional, überschreibt `config.json.ownerIds`)
- `DB_HOST`, `DB_USER`/`DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`/`DB_DATABASE`, optional `DB_PORT`

## Commands deployen

Registriere/aktualisiere Slash-Commands mit `node deploy-commands.js` und starte danach den Bot neu.

- Wenn du in `config.json` eine `guildId` (oder `guildIds`) setzt, werden Commands als **Guild Commands** deployed (meist sofort sichtbar).
- Ohne `guildId`/`guildIds` werden **Global Commands** deployed (kann bis zu ~1h dauern, bis sie in Discord auftauchen).

## Security / Sharing

- Poste niemals `token` (oder DB-Passwörter) in Chat/Issues/Screenshots.
- Wenn du `config.json` teilen musst, nutze den Redaction-Helper:
  - `node redact-config.js > config.redacted.json`
  - Teile dann `config.redacted.json` statt `config.json`.
