# Westwatch Tales Bot

## Neue Befehle

- `/wwt-register-character` - Öffnet ein Formular mit den Feldern **Name**, **Tier**, **URL** und **Notizen** (in dieser Reihenfolge). Das Tier muss `bt`, `lt` oder `ht` sein und die URL muss auf `dndbeyond.com` oder einer seiner Subdomains liegen. Bei der Registrierung werden sowohl `start_tier` als auch `tier` mit dem angegebenen Wert gefüllt sowie optionale Notizen gespeichert. Zusätzlich werden dein Discord-Name und deine Discord-ID gesichert.
- `/wwt-list-characters` - Schickt dir eine private Nachricht mit allen von dir registrierten Charakteren inklusive Start-Tier, aktuellem Tier, URL und Notizen.
- `/wwt-unregister-character` - Entfernt einen Charakter anhand der ID aus `/wwt-list-characters`.
- `/wwt-update-character` - Öffnet ein Formular, um einen bestehenden Charakter zu aktualisieren. Benötigt die ID aus `/wwt-list-characters`.

## Umgebungsvariablen

Für den Datenbankzugriff werden folgende Variablen benötigt. Kopiere die Datei `.env.example` nach `.env` und passe die Werte an:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Installiere Abhängigkeiten mit `npm install`. Beim Start des Bots werden die Werte aus `.env` automatisch geladen.
