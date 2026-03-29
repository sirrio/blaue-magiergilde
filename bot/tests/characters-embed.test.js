const assert = require('node:assert/strict');
const { buildCharacterEmbed } = require('../commands/game/characters');

const originalBaseUrl = process.env.BOT_PUBLIC_APP_URL;

process.env.BOT_PUBLIC_APP_URL = 'https://example.test';

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
assert.equal(nextStepField?.value, 'Für die Magiergilde genehmigt.');

const draftEmbed = buildCharacterEmbed({ ...character, guild_status: 'draft' }, { thumbnailUrlOrAttachment: null }).toJSON();
const draftNextStep = draftEmbed.fields.find((field) => field.name === 'Next step');
assert.equal(draftNextStep?.value, 'Registriere diesen Charakter bei der Magiergilde, um ihn zum Review einzureichen.');

const simpleModeEmbed = buildCharacterEmbed({
    ...character,
    simplified_tracking: 1,
    has_pseudo_adventure: 1,
    faction: 'bibliothekare',
    adventures_count: 12,
    faction_downtime: 360000,
    total_downtime: 400000,
}, { thumbnailUrlOrAttachment: null }).toJSON();

const simpleModeAdventures = simpleModeEmbed.fields.find((field) => field.name === 'Adventures');
const simpleModeFactions = simpleModeEmbed.fields.find((field) => field.name === 'Factions');
const simpleModeDowntime = simpleModeEmbed.fields.find((field) => field.name === 'Downtime');

assert.equal(simpleModeAdventures?.value.includes('Played: **?**'), true);
assert.equal(simpleModeFactions?.value.includes('Level: **?**'), true);
assert.equal(simpleModeDowntime?.value, 'Cannot calculate downtime while level tracking entries exist.');

if (originalBaseUrl === undefined) {
    delete process.env.BOT_PUBLIC_APP_URL;
} else {
    process.env.BOT_PUBLIC_APP_URL = originalBaseUrl;
}

console.log('characters-embed.test.js passed');
