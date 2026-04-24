const assert = require('node:assert/strict');
const { buildAdventureEmbed } = require('../interactions/characterViews');

const embed = buildAdventureEmbed({
    id: 17,
    duration: 14400,
    start_date: '2026-04-12',
    has_additional_bubble: true,
    progression_version_id: 2,
    title: 'Adventure summary',
    game_master: 'GM',
    notes: 'Regular tracked adventure.',
}, 'Adventure');

const embedData = embed.toJSON();

// Adventure embeds always show the real duration plus the quest marker.
const durationField = embedData.fields.find(field => field.name === 'Dauer');
assert.equal(durationField?.value, '4h 0m +1');

console.log('adventure-embed-anchor.test.js passed');
