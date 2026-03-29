const assert = require('node:assert/strict');
const { buildCharacterManageView } = require('../interactions/characterViews');

const payload = buildCharacterManageView({
    id: 7,
    name: 'Aelwyn',
    class_names: 'Wizard',
    is_filler: false,
    faction: 'bibliothekare',
    notes: 'Testnotiz',
    avatar: '',
    external_link: 'https://www.dndbeyond.com/characters/123',
    dm_bubbles: 3,
    dm_coins: 5,
    bubble_shop_spend: 2,
    guild_status: 'pending',
    simplified_tracking: false,
    avatar_masked: true,
    private_mode: true,
    level: 5,
    start_tier: 'bt',
    version: '2024',
    bubbles: 0,
    has_pseudo_adventure: false,
}, { ownerDiscordId: '123', locale: 'de' });

assert.equal(payload.embeds[0].data.title, 'Charakter verwalten');
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'Aktuelle Tier'), true);
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'DnDBeyond-Link'), true);
assert.equal(payload.components[0].components[0].data.label, 'Name/Link/Notizen');
assert.equal(payload.components[1].components[0].data.label, 'DM Bubbles');
assert.equal(payload.components[2].components[0].data.label, 'Tracking: Adventure tracking');
assert.equal(payload.components[2].components[2].data.label, 'Privatmodus: An');
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'Privatmodus' && field.value === 'An'), true);
assert.equal(payload.components[3].components[0].data.label, 'Zurück');

console.log('character-manage-view.test.js passed');
