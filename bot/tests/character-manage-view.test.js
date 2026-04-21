const assert = require('node:assert/strict');
const { setLevelProgressionTotals } = require('../utils/levelProgression');
const { buildCharacterManageView } = require('../interactions/characterViews');

setLevelProgressionTotals({
    1: 0, 2: 1, 3: 3, 4: 6, 5: 10,
    6: 15, 7: 21, 8: 28, 9: 36, 10: 45,
    11: 55, 12: 66, 13: 78, 14: 91, 15: 105,
    16: 120, 17: 136, 18: 153, 19: 171, 20: 190,
});

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
    bubble_shop_legacy_spend: 2,
    bubble_shop_skill_proficiency: 1,
    bubble_shop_rare_language: 0,
    bubble_shop_tool_or_language: 0,
    bubble_shop_downtime: 2,
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
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'Aktuelles Tier'), true);
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'DnDBeyond-Link'), true);
assert.equal(payload.components[0].components[0].data.label, 'Name/Link/Notizen');
assert.equal(payload.components[1].components[0].data.label, 'DM Bubbles');
assert.equal(payload.components[2].components[0].data.label, 'Tracking: Adventure tracking');
assert.equal(payload.components[2].components[2].data.label, 'Privatmodus: An');
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'Privatmodus' && field.value === 'An'), true);
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'Bubble Shop' && field.value.includes('Alter Stand: **2**')), true);
assert.equal(payload.embeds[0].data.fields.some(field => field.name === 'Bubble Shop' && field.value.includes('Downtime extra: **16h 0m**')), true);
assert.equal(payload.components[3].components[0].data.label, 'Zurück');

console.log('character-manage-view.test.js passed');
