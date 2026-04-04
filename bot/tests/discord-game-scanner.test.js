const assert = require('node:assert/strict');
const { parseAnnouncement } = require('../discordGameScanner');

const makeMessage = (content, createdAt = new Date('2026-01-22T12:00:00Z'), reactions = []) => ({
    content,
    channelId: '123',
    id: '999',
    createdAt,
    author: { id: '1', username: 'Tester' },
    member: { displayName: 'Tester' },
    reactions: {
        cache: reactions,
    },
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
    [':MG_LT: 24.10.2025, ca. 19h Start - Runde', 'lt', new Date('2025-10-20T12:00:00Z')],
    [':MG_LT: 08.01.2026- so gegen 19/20 Uhr', 'lt'],
    [':MG_LT: Dienstag 11.11.2025 - 19:30/20:00', 'lt', new Date('2025-11-01T12:00:00Z')],
    [':MG_LT: 24.01.2026 Start gegen 1/4 nach 9', 'lt'],
    [':MG_LT: 17.06.2023 - gegen halb 9', 'lt', new Date('2023-06-15T12:00:00Z')],
    [':MG_LT: 07.01.2024 um 20', 'lt', new Date('2024-01-05T12:00:00Z')],
];

for (const [content, tier, createdAt] of samples) {
    const parsed = parseAnnouncement(makeMessage(content, createdAt));
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
    makeMessage(':MG_BT~1: 15.12. - 19:00 Uhr - "Winterrunde"', new Date('2026-01-10T12:00:00Z')),
);
assert.equal(backwardYearCheck.starts_at, '2025-12-15 19:00:00');

const explicitYearCheck = parseAnnouncement(
    makeMessage(':MG_BT~1: 15.12.2026 - 19:00 Uhr - "Winterrunde"', new Date('2026-01-10T12:00:00Z')),
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

const noDateCheck = parseAnnouncement(
    makeMessage('~~gibt es noch Interesse an einer Arena-Runde? vllt 2h bis 1-2 Uhr ab 22 Uhr?~~'),
);
assert.equal(noDateCheck, null);

const timestampEpoch = 1766253600;
const timestampCheck = parseAnnouncement(
    makeMessage(
        `<t:${timestampEpoch}:F> - :MG_LT: 20.12.2025 - 20:00 Uhr - "Timestamp Test"`,
        new Date('2026-01-10T12:00:00Z'),
    ),
);
const timestampDate = new Date(timestampEpoch * 1000);
const pad = (value) => String(value).padStart(2, '0');
const expectedTimestamp = `${timestampDate.getFullYear()}-${pad(timestampDate.getMonth() + 1)}-${pad(timestampDate.getDate())} ${pad(timestampDate.getHours())}:${pad(timestampDate.getMinutes())}:00`;
assert.equal(timestampCheck.starts_at, expectedTimestamp);

const cancelledReactionCheck = parseAnnouncement(
    makeMessage(
        ':MG_LT: 24.01.2026 - 19:00 Uhr - "Cancelled Test"',
        new Date('2026-01-10T12:00:00Z'),
        [{ emoji: { name: '❌' } }],
    ),
);
assert.equal(cancelledReactionCheck.cancelled, true);

// HH.MM Uhr time format must not be stripped as a date
const dotTimeUhrCheck = parseAnnouncement(
    makeMessage(':MG_BT: 27.03.26 - 20.30 Uhr', new Date('2026-03-25T17:52:00Z')),
);
assert.equal(dotTimeUhrCheck.starts_at, '2026-03-27 20:30:00');

// HH.MM without Uhr after a date
const dotTimeNoUhrCheck = parseAnnouncement(
    makeMessage(':MG_BT: Sa. 14.03.26 - 19.30 "Tavernenabend"', new Date('2026-03-14T16:00:00Z')),
);
assert.equal(dotTimeNoUhrCheck.starts_at, '2026-03-14 19:30:00');

// // separator time format
const slashSepTimeCheck = parseAnnouncement(
    makeMessage(':MG_LT: 16.01.26 // 18.00 // D HARD', new Date('2026-01-16T10:00:00Z')),
);
assert.equal(slashSepTimeCheck.starts_at, '2026-01-16 18:00:00');

// HH:MM-HH:MM range must not be broken by date stripping
const timeRangeCheck = parseAnnouncement(
    makeMessage(':MG_LT: -07.11.2025- 22:00-22:30 je nach', new Date('2025-11-07T20:00:00Z')),
);
assert.equal(timeRangeCheck.starts_at, '2025-11-07 22:00:00');

// DD.MM - HH:MM with space-dash-space separator
const dateDashTimeCheck = parseAnnouncement(
    makeMessage(':MG_LT: 16.01 - 20:15', new Date('2026-01-16T10:00:00Z')),
);
assert.equal(dateDashTimeCheck.starts_at, '2026-01-16 20:15:00');

// Cancellation via "absagen"
const cancelAbsagenCheck = parseAnnouncement(
    makeMessage(
        ':MG_BT: 06.03.2026 19:00 Uhr - Ich muss die Runde absagen',
        new Date('2026-03-06T12:00:00Z'),
    ),
);
assert.equal(cancelAbsagenCheck.cancelled, true);

// Cancellation via "findet nicht statt"
const cancelFindetNichtStattCheck = parseAnnouncement(
    makeMessage(
        ':MG_LT: 10.03.2026 - 19:00 Uhr - runde findet leider nicht statt',
        new Date('2026-03-10T12:00:00Z'),
    ),
);
assert.equal(cancelFindetNichtStattCheck.cancelled, true);

// Interest-check posts without date/time should return null
const interestCheckNull = parseAnnouncement(
    makeMessage('Gibt es interesse für eine :MG_BT: Runde?', new Date('2026-03-21T15:00:00Z')),
);
assert.equal(interestCheckNull, null);

// Tier-only message without any content should return null
const tierOnlyNull = parseAnnouncement(
    makeMessage(':MG_HT:', new Date('2026-01-29T22:58:00Z')),
);
assert.equal(tierOnlyNull, null);

// Bold title extraction
const boldTitleCheck = parseAnnouncement(
    makeMessage(':MG_LT: 09.03.2026 19:00 - **Der Spiegel der den Himmel versagt** - Mehrteiler', new Date('2026-03-09T12:00:00Z')),
);
assert.equal(boldTitleCheck.title, 'Der Spiegel der den Himmel versagt');

// Quoted title still takes priority over bold
const quotedOverBoldCheck = parseAnnouncement(
    makeMessage(':MG_BT: 10.03.2026 20:00 - \u201EQuoted Title\u201C and **Bold Title**', new Date('2026-03-10T12:00:00Z')),
);
assert.equal(quotedOverBoldCheck.title, 'Quoted Title');

// Date separator must not greedily consume time as year (16.01 - 20:15)
const dateSepCheck = parseAnnouncement(
    makeMessage(':MG_LT: 16.01 - 20:15', new Date('2026-01-16T10:00:00Z')),
);
assert.equal(dateSepCheck.starts_at, '2026-01-16 20:15:00');
assert.equal(dateSepCheck.confidence, 0.55);

console.log('discord-game-scanner.test.js passed');
