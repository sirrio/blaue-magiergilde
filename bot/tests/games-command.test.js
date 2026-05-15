const assert = require('node:assert/strict');
const {
    buildGamesEmbed,
    resolveTierEmojis,
    cleanContentForDisplay,
    resolveGameLabel,
} = require('../commands/game/games');

// Cleanup strips tier emojis, mentions, dates and times.
assert.equal(
    cleanContentForDisplay('<:MG_HT:754> - So, 17.05.2026 - 18:00 Uhr - "All is ours!" <@&955>'),
    '"All is ours!"',
);
assert.equal(
    cleanContentForDisplay(':MG_LT: 16.01 - 20:15 Erkundung eines Dorfes <@&123>'),
    'Erkundung eines Dorfes',
);
assert.equal(
    cleanContentForDisplay('<:MG_BT:1> heute 19:30'),
    '',
);

// resolveGameLabel prefers explicit title, falls back to cleaned content, then to placeholder.
assert.equal(resolveGameLabel({ title: 'Set Title', content: 'whatever' }), 'Set Title');
assert.equal(
    resolveGameLabel({
        title: null,
        content: '<:MG_HT:1> - So, 17.05.2026 - 18:00 - Hauptquest fortsetzen <@&2>',
    }),
    'Hauptquest fortsetzen',
);
assert.equal(resolveGameLabel({ title: null, content: '<:MG_HT:1> 18:00 <@&2>' }), 'Untitled game');

// Multi-tier games render multiple tier badges side by side in the embed line.
const multiTierGame = {
    tier: 'lt,ht',
    title: 'Experiment',
    discord_author_name: 'Batcake',
    starts_at: new Date('2026-05-22T18:00:00'),
};
const multiTierEmbed = buildGamesEmbed([multiTierGame]).toJSON();
// Multi-tier embed line contains at least one unicode tier emoji and both
// tier codes appear in canonical order (LT before HT).
assert.match(multiTierEmbed.fields[0].value, /🟫|⬜|🟨|🟪/);
assert.match(multiTierEmbed.fields[0].value, /LT.*HT/);

const fixed = new Date('2026-05-15T14:00:00');

const games = [
    {
        tier: 'lt',
        title: 'Untitled game',
        discord_author_name: 'Yassi',
        starts_at: new Date('2026-05-15T18:00:00'),
        discord_guild_id: '111',
        discord_channel_id: '222',
        discord_message_id: '333',
    },
    {
        tier: 'bt',
        title: 'Erkundung eines Dorfes',
        discord_author_name: 'Falk',
        starts_at: new Date('2026-05-15T19:30:00'),
    },
    {
        tier: 'bt',
        title: 'Untitled game',
        discord_author_name: 'Laura',
        starts_at: new Date('2026-05-16T19:30:00'),
    },
    {
        tier: 'ht',
        title: 'Untitled game',
        discord_author_name: 'Noel',
        starts_at: new Date('2026-05-17T18:00:00'),
    },
];

const embed = buildGamesEmbed(games);
const json = embed.toJSON();

assert.equal(json.title, 'Anstehende Spiele');
assert.ok(Array.isArray(json.fields));
// Three distinct dates → three fields.
assert.equal(json.fields.length, 3);

// First field should be today (15. Mai) and contain both games.
assert.match(json.fields[0].name, /15\. Mai/);
const todayDate = new Date();
const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
const fixtureToday = '2026-05-15';
if (today === fixtureToday) {
    assert.match(json.fields[0].name, /Heute/);
}
assert.match(json.fields[0].value, /Yassi/);
assert.match(json.fields[0].value, /Falk/);
assert.match(json.fields[0].value, /Erkundung eines Dorfes/);
// Game with Discord IDs becomes a clickable link, the other stays bold text only.
assert.match(json.fields[0].value, /\[\*\*Untitled game\*\*\]\(https:\/\/discord\.com\/channels\/111\/222\/333\)/);
assert.match(json.fields[0].value, /\*\*Erkundung eines Dorfes\*\*(?!\])/);

// Each line should embed a Discord <t:UNIX:t> token and a relative <t:UNIX:R> token.
assert.match(json.fields[0].value, /<t:\d+:t>/);
assert.match(json.fields[0].value, /<t:\d+:R>/);

// Custom tier emojis take priority over the unicode fallback.
const fakeClient = {
    emojis: {
        cache: {
            find(predicate) {
                const entries = [
                    { name: 'MG_BT', available: true, toString: () => '<:MG_BT:1>' },
                    { name: 'MG_LT', available: true, toString: () => '<:MG_LT:2>' },
                    { name: 'MG_HT', available: true, toString: () => '<:MG_HT:3>' },
                    { name: 'MG_ET', available: true, toString: () => '<:MG_ET:4>' },
                ];
                return entries.find(predicate) || null;
            },
        },
    },
};

const tiers = resolveTierEmojis(fakeClient);
assert.equal(tiers.bt, '<:MG_BT:1>');
assert.equal(tiers.ht, '<:MG_HT:3>');

const withCustom = buildGamesEmbed(games, { tierEmojis: tiers }).toJSON();
assert.match(withCustom.fields[0].value, /<:MG_LT:2>/);
assert.match(withCustom.fields[0].value, /<:MG_BT:1>/);

// No client → unicode fallback used.
const fallbackOnly = resolveTierEmojis(null);
assert.equal(fallbackOnly.bt, '🟫');

// Empty list path
const emptyEmbed = buildGamesEmbed([]);
const emptyJson = emptyEmbed.toJSON();
assert.match(emptyJson.description, /keine anstehenden Spiele/i);

console.log('games-command.test.js passed');
// Suppress reference to `fixed` to keep linting noise-free if applied.
void fixed;
