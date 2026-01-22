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

console.log('discord-game-scanner.test.js passed');
