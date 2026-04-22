const assert = require('node:assert/strict');
const { buildCharacterRetirementMessage } = require('../characterApprovalNotifier');

const message = buildCharacterRetirementMessage({
    character_name: 'Aeryn',
    character_level: 12,
    character_tier: 'ht',
    character_played_adventures: 9,
    character_version: '2024',
    character_classes: ['Wizard', 'Fighter'],
    user_name: 'Batcake',
    user_discord_id: '123456789012345678',
    previous_status: 'approved',
    external_link: 'https://www.dndbeyond.com/characters/1234567',
});

const embed = message.embeds[0].toJSON();
assert.equal(embed.title, 'Charakter abgemeldet · Aeryn');
assert.equal(embed.description, undefined);

const playerField = embed.fields.find((field) => field.name === 'Spieler');
assert.ok(playerField?.value.includes('Batcake'));
assert.ok(playerField?.value.includes('<@123456789012345678>'));

const statusField = embed.fields.find((field) => field.name === 'Vorheriger Status');
assert.equal(statusField?.value, 'approved');

const levelField = embed.fields.find((field) => field.name === 'Level');
assert.equal(levelField?.value, '12');

const tierField = embed.fields.find((field) => field.name === 'Tier');
assert.equal(tierField?.value, 'HT');

const adventuresField = embed.fields.find((field) => field.name === 'Gespielte Adventures');
assert.equal(adventuresField?.value, '9');

const classesField = embed.fields.find((field) => field.name === 'Klassen');
assert.equal(classesField?.value, 'Wizard, Fighter');

const linkField = embed.fields.find((field) => field.name === 'Link');
assert.equal(linkField?.value, 'https://www.dndbeyond.com/characters/1234567');

console.log('character-retirement-embed.test.js passed');
