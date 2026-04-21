const assert = require('node:assert/strict');
const { setLevelProgressionTotals } = require('../utils/levelProgression');
const { buildCharacterEmbed } = require('../commands/game/characters');

const originalBaseUrl = process.env.BOT_PUBLIC_APP_URL;

process.env.BOT_PUBLIC_APP_URL = 'https://example.test';
setLevelProgressionTotals({
    1: 0, 2: 1, 3: 3, 4: 6, 5: 10,
    6: 15, 7: 21, 8: 28, 9: 36, 10: 45,
    11: 55, 12: 66, 13: 78, 14: 91, 15: 105,
    16: 120, 17: 136, 18: 153, 19: 171, 20: 190,
});

const character = {
    id: 42,
    name: 'Test Character',
    class_names: 'Wizard',
    guild_status: 'approved',
    has_room: 0,
    start_tier: 'bt',
    faction: 'none',
    adventure_bubbles: 0,
    dm_bubbles: 0,
    bubble_shop_spend: 0,
    bubble_shop_legacy_spend: 0,
    bubble_shop_skill_proficiency: 0,
    bubble_shop_rare_language: 0,
    bubble_shop_tool_or_language: 0,
    bubble_shop_downtime: 0,
    total_downtime: 0,
    faction_downtime: 0,
    other_downtime: 0,
    adventures_count: 0,
    dm_coins: 0,
    external_link: 'https://www.dndbeyond.com/characters/42',
};

const embed = buildCharacterEmbed(character, { thumbnailUrlOrAttachment: null });
const embedData = embed.toJSON();

assert.equal(embedData.url, 'https://example.test/characters/42');
assert.equal(embedData.description, '[Open sheet](https://www.dndbeyond.com/characters/42)');

const nextStepField = embedData.fields.find((field) => field.name === 'Next step');
// approved status has no "Next step"
assert.equal(nextStepField, undefined);

const draftEmbed = buildCharacterEmbed({ ...character, guild_status: 'draft' }, { thumbnailUrlOrAttachment: null }).toJSON();
const draftNextStep = draftEmbed.fields.find((field) => field.name === 'Next step');
assert.equal(draftNextStep?.value, 'Registriere diesen Charakter bei der Magiergilde, um ihn zum Review einzureichen.');

const simpleModeEmbed = buildCharacterEmbed({
    ...character,
    simplified_tracking: 1,
    has_pseudo_adventure: 1,
    faction: 'bibliothekare',
    adventures_count: 12,
    manual_adventures_count: 9,
    adventure_bubbles: 20,
    bubble_shop_downtime: 2,
    faction_downtime: 360000,
    total_downtime: 400000,
    manual_faction_rank: 4,
}, { thumbnailUrlOrAttachment: null }).toJSON();

const simpleModeAdventures = simpleModeEmbed.fields.find((field) => field.name === 'Adventures');
const simpleModeFactions = simpleModeEmbed.fields.find((field) => field.name === 'Factions');
const simpleModeDowntime = simpleModeEmbed.fields.find((field) => field.name === 'Downtime');
const simpleModeProgress = simpleModeEmbed.fields.find((field) => field.name === 'Progress');
const simpleModeBubbleShop = simpleModeEmbed.fields.find((field) => field.name === 'Bubble Shop');

assert.equal(simpleModeAdventures?.value.includes('Played: **9**'), true);
assert.equal(simpleModeFactions?.value.includes('Level: **4**'), true);
assert.equal(simpleModeDowntime?.value.includes('Total: **176h 0m**'), true);
assert.equal(simpleModeDowntime?.value.includes('Remaining: **64h 53m**'), true);
assert.equal(simpleModeProgress?.value.includes('Remaining: **1** Bubble(s)'), true);
assert.equal(simpleModeBubbleShop?.value.includes('16h 0m'), true);

if (originalBaseUrl === undefined) {
    delete process.env.BOT_PUBLIC_APP_URL;
} else {
    process.env.BOT_PUBLIC_APP_URL = originalBaseUrl;
}

console.log('characters-embed.test.js passed');
