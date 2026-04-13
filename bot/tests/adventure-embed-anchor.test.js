const assert = require('node:assert/strict');
const { buildAdventureEmbed } = require('../interactions/characterViews');

const embed = buildAdventureEmbed({
    id: 17,
    duration: 0,
    start_date: '2026-04-12',
    has_additional_bubble: false,
    is_pseudo: true,
    target_level: 7,
    progression_version_id: 2,
    title: 'Level tracking adjustment',
    game_master: 'Level tracking',
    notes: 'Auto-generated to align the level tracking value.',
}, 'Adventure');

const embedData = embed.toJSON();

// Pseudo-adventures show the target level in the duration field instead of a time
const durationField = embedData.fields.find(field => field.name === 'Dauer');
assert.equal(durationField?.value, 'Gesetztes Level: 7');

// The separate anchor field should no longer exist (info is now in the duration field)
const anchorField = embedData.fields.find(field => field.name === 'Gesetztes Level');
assert.equal(anchorField, undefined);

console.log('adventure-embed-anchor.test.js passed');
