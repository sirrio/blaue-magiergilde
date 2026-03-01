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
assert.equal(nextStepField?.value, 'Approved for Magiergilde.');

const draftEmbed = buildCharacterEmbed({ ...character, guild_status: 'draft' }, { thumbnailUrlOrAttachment: null }).toJSON();
const draftNextStep = draftEmbed.fields.find((field) => field.name === 'Next step');
assert.equal(draftNextStep?.value, 'Register with Magiergilde to submit this character for review.');

if (originalBaseUrl === undefined) {
    delete process.env.BOT_PUBLIC_APP_URL;
} else {
    process.env.BOT_PUBLIC_APP_URL = originalBaseUrl;
}

console.log('characters-embed.test.js passed');
