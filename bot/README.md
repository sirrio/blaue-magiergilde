# Westwatch Tales Bot

## Befehle

Standard-Prefix ist `wwt` (z.B. `/wwt-list-characters`). Du kannst es per `COMMAND_PREFIX` ändern.

- `/[prefix]-register-character` - Öffnet ein Formular mit den Feldern **Name**, **Tier**, **URL** und **Notizen** (in dieser Reihenfolge). Das Tier muss `bt`, `lt` oder `ht` sein und die URL muss auf `dndbeyond.com` oder einer seiner Subdomains liegen. Bei der Registrierung werden sowohl `start_tier` als auch `tier` mit dem angegebenen Wert gefüllt sowie optionale Notizen gespeichert. Zusätzlich werden dein Discord-Name und deine Discord-ID gesichert.
- `/[prefix]-list-characters` - Schickt dir eine private Nachricht mit allen von dir registrierten Charakteren inklusive Start-Tier, aktuellem Tier, URL und Notizen.
- `/[prefix]-unregister-character` - Entfernt einen Charakter anhand der ID aus `/[prefix]-list-characters`.
- `/[prefix]-update-character` - Öffnet ein Formular, um einen bestehenden Charakter zu aktualisieren. Benötigt die ID aus `/[prefix]-list-characters`.
- `/[prefix]-post-shop` - Postet den neuesten (oder eine angegebene) Shop in einen auswählbaren Text-Channel (benötigt **Manage Server** Berechtigung).

## Umgebungsvariablen

Der Bot kann entweder per `config.json` (empfohlen) oder optional per `.env` konfiguriert werden (Env-Variablen überschreiben `config.json`).

### config.json (empfohlen)

Kopiere `config.json.example` nach `config.json` und setze mindestens `clientId` und `token`.

Optional:
- `commandPrefix` (z.B. `wwt` → `/wwt-list-characters`)
- `ownerIds` (Array von Discord User IDs; wenn gesetzt, sind Commands owner-only)
- `db` (DB-Zugriff für die Character-Commands und Shop-Posting)

### .env (optional)

Für den Datenbankzugriff werden folgende Variablen unterstützt. Kopiere die Datei `.env.example` nach `.env` und passe die Werte an:

- `DB_HOST`
- `DB_USER` (oder `DB_USERNAME`)
- `DB_PASSWORD`
- `DB_NAME` (oder `DB_DATABASE`)
- optional: `DB_PORT`
- `COMMAND_PREFIX` (optional, überschreibt `config.json.commandPrefix`)
- `OWNER_DISCORD_IDS` (optional, Komma-separiert, überschreibt `config.json.ownerIds`)

Installiere Abhängigkeiten mit `npm install`. Beim Start des Bots werden die Werte aus `.env` automatisch geladen.

## Owner-only

Wenn du `OWNER_DISCORD_IDS` setzt (z.B. `OWNER_DISCORD_IDS=123456789012345678`), kann **nur** diese Discord-User-ID Commands ausführen.

## Commands deployen

Registriere/aktualisiere Slash-Commands mit `node deploy-commands.js` und starte danach den Bot neu.

- Wenn du in `config.json` eine `guildId` setzt, werden Commands als **Guild Commands** deployed (meist sofort sichtbar).
- Ohne `guildId` werden **Global Commands** deployed (kann bis zu ~1h dauern, bis sie in Discord auftauchen).
