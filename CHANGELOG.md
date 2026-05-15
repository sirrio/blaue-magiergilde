# Changelog

Alle nennenswerten Änderungen an der Magiergilden-Seite und am Bot werden hier dokumentiert. Neue Patches stehen oben.

## Patch vom 15.05.2026

### Userseite

- **Neu: /games komplett überarbeitet** — Die Spielankündigungsseite hat ein vollständiges visuelles Redesign bekommen: Datums-Tile auf der linken Seite jeder Karte (Wochentag / Tag groß / Monat), Tier-Farbakzent als linker Rand, größere Typografie, klarere „Heute"-Markierung. Vergangene Spiele werden standardmäßig nicht mehr auf der Hauptseite gezeigt.
- **Neu: Archiv-Seite** — Eigene Seite `/games/archive` für vergangene Spiele. Hauptseite zeigt nur noch kommende Ankündigungen (sortiert nach Startzeit aufsteigend), das Archiv zeigt vergangene (absteigend, 20 pro Seite). Wechsel zwischen den Ansichten über einen Button im Header.
- **Neu: Multi-Tier-Anzeige** — Ankündigungen, die mehrere Tiers anbieten (z. B. „LT oder HT"), zeigen jetzt alle Tier-Badges nebeneinander statt nur eines. Tier-Filter matcht Spiele, deren Tier-Liste die Auswahl enthält.
- **Verbesserung: Lesbare Titel auch ohne explizit gesetzten Titel** — Wenn der Parser keinen Titel extrahieren konnte (kein Anführungszeichen, kein Fettdruck), zeigt die UI eine bereinigte Version der Originalnachricht: Tier-Emojis, Datums-/Zeit-Fragmente, Role-Pings und Markdown-Marker werden entfernt. „Untitled game" bleibt nur als Fallback, wenn nach dem Cleanup wirklich nichts Sinnvolles übrig ist.
- **Verbesserung: Filter-Toolbar verschlankt** — Wochenfilter und Pro-Seite-Buttons entfernt; nur noch Suche und Tier-Auswahl. Auf der Hauptseite implizit „kommende Spiele", im Archiv „vergangene Spiele".
- **Visuelle Angleichung** — `/games` nutzt jetzt das Projekt-Standard-Layout (Container, Section-Header, daisyUI `List`/`ListRow`, `tabs-border`) statt eines eigenen Card-Designs.

### Bot

- **Neu: Sticky Spieleübersicht im Games-Channel** — Der Bot hängt eine kompakte Zusammenfassungs-Nachricht („📅 X anstehende Spiele – klick unten für die Liste.") immer ans Ende des Games-Channels. Beim Klick auf den Button „Spiele anzeigen" sieht der Aufrufende ephemeral dieselbe Liste wie über `/mg-games`. Update-Trigger: jede neue Nachricht im Channel (inkl. neuer Ankündigung, die der Bot inline parst und in die DB schreibt) sowie der reguläre Sync-Loop. Reposts sind auf 5 Sekunden gedebounced, damit kurze Burst-Posts nur einen einzigen Repost erzeugen.
- **Neu: `/mg-games` Slash-Command** — Zeigt die nächsten 20 angekündigten Spiele direkt in Discord (ephemeral). Gruppiert nach Tag, mit nativen Discord-Timestamps (`<t:UNIX:R>` zeigt automatisch „in 5 Stunden" o. ä. in der Locale jedes Nutzers), klickbarem Link zum Original-Post und Footer-Link zur Web-Übersicht. Funktioniert in Servern und Bot-DMs.
- **Fix: Bot-Charakter-Erstellung** — Mehrere Race-Conditions und hängende Interaktionen beim Erstellen eines Charakters über den Bot wurden behoben.
- **Fix: Interaction-Fehlerpfade** — Bot-Interaktionen, die in einen Fehlerzustand laufen, antworten jetzt zuverlässig statt stumm zu bleiben.

### Orga

- **Neu: `creation_source` in der Approval-Liste** — Charaktere tragen jetzt eine Information, wo sie erstellt wurden (Website, Bot, Import). In der Charakter-Approval-Liste sichtbar, damit Admins Bot- vs. Web-Erstellungen unterscheiden können.
- **Verbesserung: Tier-Emojis mit Fallback** — Der `/mg-games`-Command nutzt die custom Server-Emojis (`MG_BT`, `MG_LT`, `MG_HT`, `MG_ET`), wenn der Bot sie erreichen kann, und fällt sonst auf Unicode-Quadrate zurück (🟫⬜🟨🟪).
- **Fix: Doppelte Ankündigungen durch Thread-Notifications** — Der Parser ignoriert jetzt `MessageType.ThreadCreated` System-Nachrichten, die Discord im Parent-Channel postet, wenn ein Thread auf eine Ankündigung gestartet wird. Diese Notifications enthielten als Content eine truncierte Kopie der Originalnachricht und wurden bisher fälschlich als zweite Ankündigung gespeichert.
- **Neu: Auto-Cleanup im Game-Sync** — Nach jedem erfolgreichen Scan löscht der Bot DB-Einträge im Scan-Window, deren Discord-Message-ID nicht mehr im Scan-Ergebnis vorkommt. Dadurch verschwinden gelöschte/editierte Posts und Altlasten wie die ThreadCreated-Dubletten automatisch beim nächsten Sync.
- **Neu: Multi-Tier-Parsing** — Der Game-Scanner erkennt jetzt alle Tier-Vorkommen in einer Nachricht (BT, LT, HT, ET) und speichert sie komma-separiert (z. B. `"lt,ht"`). Vorher wurde nur das erste Tier behalten. Migration erweitert die `tier`-Spalte entsprechend.

## Patch vom 22.04.2026

### Userseite

- **Neu: Progressionskurven-Upgrade** — Charaktere mit veralteter Levelkurve können jetzt auf die aktuelle Kurve migriert werden. Beim Upgrade kann das Ziellevel sowie die Bubbles im Level frei gewählt werden (innerhalb der durch gespielte Adventures erlaubten Grenzen). Manual-Tracking und Adventure-Tracking verhalten sich dabei unterschiedlich: Adventure-Tracking berechnet das maximale Level automatisch und passt die Bubble-Shop-Ausgaben entsprechend an – je nach Auswahl des Spielers.
- **Neu: Strukturierter Bubble-Shop** — Bubble-Shop-Käufe werden jetzt pro Typ einzeln gespeichert statt als Gesamtsumme: Skill Proficiency (6 Bubbles, max. 1×), Seltene Sprache (4 Bubbles, max. 1×), Werkzeug/Sprache (2 Bubbles, max. 3×), Downtime (1 Bubble, je nach Tier). Die UI zeigt für jeden Typ ein eigenes Feld mit Limit und aktueller Menge.
- **Verbesserung: Legacy-Budget-Anzeige im Bubble-Shop** — Charaktere mit einem alten Bubble-Shop-Gesamtwert sehen einen Hinweis mit der noch nicht zugewiesenen Menge und können diesen Betrag auf die neuen Typen verteilen.
- **Fix: Klassenwahl auf die Gilde begrenzt** — Beim Erstellen und Bearbeiten von Charakteren können nur noch in der Gilde erlaubte Klassen neu ausgewählt werden.
- **Neu: Eigene Tooltip-Komponente** — Problematische Tooltips wurden durch eine eigene Tooltip-Komponente ersetzt. Mehrdeutige Icons sind damit besser erklärt.
- **Neu: Klassen & Waffen/Rüstungen im Compendium & Compendium überarbeitet** — Vorschläge wurden entfernt, durch Kommentare ersetzt. Zwei neue Kategorien wurden hinzugefügt.

### Orga

- **Neu: Benachrichtigung bei Charakter-Abmeldung** — Wenn ein Charakter abgemeldet wird, postet der Bot jetzt eine Meldung in den konfigurierten Orga-Channel, inklusive Bild, Level, Tier, Klassen und gespielten Adventures.
- **Compendium überarbeitet** — Lesen ist zentral im Compendium, Bearbeiten bleibt admin-only.
- **Beta-Freischaltung für Kurvenwechsel** — Das Progressionskurven-Upgrade ist aktuell nur für freigeschaltete Testuser sichtbar. Die Freischaltung läuft temporär über eine interne Allowlist, damit der irreversible Flow erst in kleiner Runde getestet werden kann.

## Patch vom 15.04.2026

### Userseite

- Fix: Falsche Levelberechnung bei Level-Tracking/Pseudo-Adventures wurde behoben (Start-Tier wurde in bestimmten Fällen doppelt eingerechnet).
- Level-Tracking verbessert: Pseudo-Adventures speichern jetzt neben dem Ziel-Level auch den exakten Fortschritt über `target_bubbles` (inkl. „Bubbles im Level") – dadurch bleibt der gesetzte Stand korrekt und präziser als nur ein Level-Floor.
- Neu: Beim Level setzen kann jetzt optional „Bubbles im Level" gewählt werden (UI + Bot + Backend), um Fortschritt innerhalb eines Levels sauber abzubilden.
- Anzeige/Logik verbessert: Max-Level wird konsistenter dargestellt (inkl. Anzeige von „+X Bubbles" oberhalb von 20).
- Gemischtes Tracking (Pseudo + echte Adventures): Downtime-Berechnung wurde korrigiert, damit Start-Tier-Bonus-Bubbles nicht als „erspielt" zählen; Bubble-Shop-Ausgaben werden dabei weiterhin sinnvoll berücksichtigt.
- Änderung: Der manuelle Override „Gesamte Downtime" wurde entfernt (DB-Spalte, Requests/UI/Tests/Fixtures bereinigt). Manuelle Overrides bleiben für Abenteuer-Anzahl und Fraktion.

### Orga

- Neu (Admin): Impersonation – Admins können sich als User einloggen (neue Admin-Userliste mit Suche + „Impersonieren", inkl. Banner und „Zurück"-Aktion).
- Admin/Performance: Character-Approvals wurden refactored/verschlankt (gezielteres Laden von Adventure-Daten inkl. `target_bubbles`).

## Patch vom 14.04.2026

### Userseite

- Die Charakterkarte wurde visuell überarbeitet und zeigt mehr relevante Informationen auf einen Blick.
- Der Shop wurde überarbeitet um mehr Optionen zuzulassen.
- Charaktere können jetzt manuelle Overrides für bestimmte Werte erhalten (z. B. Downtime-Anpassungen). Gilt nur für Level Tracking.
- Das Level Tracking wurde überarbeitet: nur die letzte Progression zählt für die Berechnung. Damit ist gewährleistet, dass der Charakter immer das gesetzte Level hat.
- Das Level Tracking zählt nun nicht mehr Bubble Shops und DM Bubbles zur Progression.
- Neue HT Charakterslot Regeln wurden implementiert und durchgesetzt.
- Der Entwurfsstatus von Charakteren wurde ausgebaut und ist jetzt besser nachvollziehbar.
- Support-Briefkasten-Handling wurde erweitert. Beim Schreiben des Bots wird nun gefragt, ob das Orga-Team kontaktiert werden soll.

### Orga

**Kompendium & Shop:**

- Ein Shop-Regeleditor wurde eingeführt. Die Shop-History wurde auf die Regeln migriert.
- Der Kompendium-Importer unterstützt jetzt Export, Override und verbesserte Fehlerbehandlung.
- Quellen werden jetzt als Modal angezeigt.
- Drittanbieter-Inhalte sind jetzt gesondert gekennzeichnet.

**Charaktergenehmigungen:**

- Die Charaktergenehmigungs-Liste wurde für große Mengen optimiert (Pagination & Performance). Sollte nun viel schneller laden.

**Klassen & Subklassen:**

- Klassen können jetzt Subklassen haben, die direkt in der Übersicht verwaltet werden, inkl. „Erlaubt"-Status.

**Mundane Item-Varianten:**

- Varianten haben jetzt ebenfalls ein Gilde-erlaubt-Flag.
- Die Sortierung wurde vereinheitlicht, das manuelle Sortierfeld wurde entfernt.

**Stabilität & Admin:**

- Inaktive Nutzer werden automatisch bereinigt.
- Fehlerberichterstattung vom Frontend und Bot wurde an Nightwatch angebunden.
- Globale Bot-Fehler werden jetzt automatisch an das Monitoring weitergeleitet.
- Die Fehler-Boundary-Seite wurde überarbeitet.
- Die Stufenprogression kann jetzt versioniert verwaltet werden — inklusive History und Neuberechnung.
- Game-Parser-Regeln wurden verfeinert.
- Fehler bei der Raumumbenennung wurde gefixt.

## Patch vom 31.03.2026

### Userseite

- Die Charakter-Detailseite wurde weiter ausgebaut: Allies können dort jetzt direkt verwaltet werden.
- Adventures und Downtime können jetzt ebenfalls direkt auf der Charakter-Detailseite hinzugefügt werden.
- Die Allies-Ansicht wurde verbessert: Sortierung ist jetzt nach Name, Spieler, Beziehung und gemeinsamen Treffen möglich.
- In der Allies-Ansicht ist der Spieler nun als eigene Spalte sichtbar.
- Die Character-Detailseite wurde bei Tabellen, Spalten und Sortierungen weiter visuell aufgeräumt.
- Der Game Master Log wurde bei der Sortierung überarbeitet: Relevante Spalten lassen sich jetzt direkt über die Tabellenköpfe sortieren.
- Ein neuer Bot-Befehl zum Auslosen der Spieler wurde eingeführt inkl. automatischer oder manueller Auswahl.
- Etwas Rotes wurde freigeschaltet.

### Orga

- In der Zimmer-Verwaltung können Stockwerke/Karten jetzt kopiert werden, ohne die Bilddatei neu hochladen zu müssen.
- Beim Kopieren eines Stockwerks werden jetzt auch die zugehörigen Räume übernommen.
- Die Zimmer-Verwaltung wurde sprachlich und visuell weiter vereinheitlicht.

## Patch vom 30.03.2026

### Userseite

- Die Tracking-Auswahl wurde überarbeitet: Es gibt jetzt beim ersten Login eine Abfrage, ob ihr Adventure-Tracking oder Level-Tracking bevorzugt.
- Der Standard fürs Tracking für neue Charaktere kann nun auf der Website und im Bot festgelegt und später geändert werden.
- Allies wurden verbessert: Besitzer sind besser erkennbar, die Anzahl der gemeinsamen Adventures wird angezeigt und ist sortierbar.
- Neuer Privatmodus: Der Avatar eines Charakters kann für andere in den Allies ausgeblendet werden.
- Mehrere Detailseiten, Listen und Sortierungen wurden visuell und funktional aufgeräumt.
- Der Bot-Charakterflow ist robuster, u. a. bei hängenden Erstellungen (Bugfix des Reports).
- Wenn ihr dem Bot schreibt, landet die Nachricht nun in einem Orga-Briefkasten und kann von jedem Orga-Mitglied eingesehen werden.
- Der Botbefehl für Stille Gebote wurde gefixt und es können nun alle Items ausgewählt werden.
- Ein Fehler wurde behoben, der in einem seltenen Fall mit gelöschten Abenteuern eine falsche Filler-Bubble-Anzahl angezeigt hat.
- Einige sprachliche Verbesserungen, vor allem in der deutschen Version.

### Orga

- Ein neues Badge wurde eingeführt – für den ersten Charakter eines Accounts.
- Der Bot berichtet nun, wenn ein neuer Account erstellt wurde.
- DM-Coins/Bubbles sind nun in der Charakterliste sichtbar.
