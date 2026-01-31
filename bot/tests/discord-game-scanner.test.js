const assert = require('node:assert/strict');
const { parseAnnouncement } = require('../discordGameScanner');

const makeMessage = (content, createdAt = new Date('2026-01-22T12:00:00Z')) => ({
    content,
    channelId: '123',
    id: '999',
    createdAt,
    author: { id: '1', username: 'Tester' },
    member: { displayName: 'Tester' },
});

const samples = [
    [':MG_BT~1: Mi 21.01.2026 - ca. 20:00 Uhr - Eine neue Tasche - @Magiergilde', 'bt'],
    [':MG_BT~1: 24.01.2026 - 18:00 - "Die Geschichte eines Toden" @Magiergilde', 'bt'],
    [':MG_LT~1: - 21.01.2026 - 18:30 Uhr (+-) - "Schicht und Latten - Abenteuer auf Abwegen"', 'lt'],
    [':MG_BT: - 2026-01-22 21:00 - by @sirrio - @Magiergilde - Warum immer Ratten?', 'bt'],
    [':MG_HT~1: 23.01.2026 - 19:30 Uhr @Magiergilde  - "Ein Kaffeekränzchen"', 'ht'],
    [':MG_BT~1: Di 20.01.26 - 19:30 - "Zwergenausgrabung" @Magiergilde', 'bt'],
    ['Besteht heute Abend (19.01.) ca 18:30 Uhr Interesse an dieser LT-Runde?', 'lt'],
    [':MG_LT~1: 25.01. - 17:00 Uhr - "Die lange Nacht in Yharnam"', 'lt'],
    [':MG_LT: 16.01.26 // 18.00 // D HARD', 'lt'],
    [':MG_LT: 24.10.2025, ca. 19h Start - Runde', 'lt'],
    [':MG_LT: 08.01.2026- so gegen 19/20 Uhr', 'lt'],
    [':MG_LT: Dienstag 11.11.2025 - 19:30/20:00', 'lt'],
    [':MG_LT: 24.01.2026 Start gegen 1/4 nach 9', 'lt'],
    [':MG_LT: 17.06.2023 - gegen halb 9', 'lt'],
    [':MG_LT: 07.01.2024 um 20', 'lt'],
];

for (const [content, tier] of samples) {
    const parsed = parseAnnouncement(makeMessage(content));
    assert.ok(parsed, `Expected parsed announcement for "${content}"`);
    assert.equal(parsed.tier, tier);
    assert.match(parsed.starts_at, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
}

const timeCheck = parseAnnouncement(
    makeMessage(':MG_HT~1: 23.01.2026 - 19:30 Uhr @Magiergilde  - "Ein Kaffeekränzchen"'),
);
assert.equal(timeCheck.starts_at, '2026-01-23 19:30:00');

const isoCheck = parseAnnouncement(
    makeMessage(':MG_BT: - 2026-01-22 21:00 - by @sirrio - @Magiergilde - Warum immer Ratten?'),
);
assert.equal(isoCheck.starts_at, '2026-01-22 21:00:00');

const forwardYearCheck = parseAnnouncement(
    makeMessage(':MG_BT~1: 05.01. - 19:00 Uhr - "Neujahrsrunde"', new Date('2025-12-20T12:00:00Z')),
);
assert.equal(forwardYearCheck.starts_at, '2026-01-05 19:00:00');

const backwardYearCheck = parseAnnouncement(
    makeMessage(':MG_BT~1: 15.12. - 19:00 Uhr - "Winterrunde"', new Date('2026-01-20T12:00:00Z')),
);
assert.equal(backwardYearCheck.starts_at, '2025-12-15 19:00:00');

const explicitYearCheck = parseAnnouncement(
    makeMessage(':MG_BT~1: 15.12.2026 - 19:00 Uhr - "Winterrunde"', new Date('2026-01-20T12:00:00Z')),
);
assert.equal(explicitYearCheck.starts_at, '2025-12-15 19:00:00');

const typoFutureYearCheck = parseAnnouncement(
    makeMessage(
        ':MG_LT: 04.05.3035 - 11/12:00 Uhr - "Do you mind?"',
        new Date('2025-05-01T08:26:08Z'),
    ),
);
assert.equal(typoFutureYearCheck.starts_at, '2025-05-04 11:00:00');

const typoExtraDigitCheck = parseAnnouncement(
    makeMessage(':MG_LT: - Fr - 17.05.22024 - 15 Uhr', new Date('2024-05-17T09:43:41Z')),
);
assert.equal(typoExtraDigitCheck.starts_at, '2024-05-17 15:00:00');

const typoMissingDigitCheck = parseAnnouncement(
    makeMessage(':MG_HT: 24.01.205 - 18:30/19:00 Uhr', new Date('2025-01-23T12:00:00Z')),
);
assert.equal(typoMissingDigitCheck.starts_at, '2025-01-24 18:30:00');

const timestampEpoch = 1766253600;
const timestampCheck = parseAnnouncement(
    makeMessage(`<t:${timestampEpoch}:F> - :MG_LT: 20.12.2025 - 20:00 Uhr - "Timestamp Test"`),
);
const timestampDate = new Date(timestampEpoch * 1000);
const pad = (value) => String(value).padStart(2, '0');
const expectedTimestamp = `${timestampDate.getFullYear()}-${pad(timestampDate.getMonth() + 1)}-${pad(timestampDate.getDate())} ${pad(timestampDate.getHours())}:${pad(timestampDate.getMinutes())}:00`;
assert.equal(timestampCheck.starts_at, expectedTimestamp);

console.log('discord-game-scanner.test.js passed');
