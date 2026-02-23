const assert = require('node:assert/strict');

const { buildCharacterRegisterConfirmView } = require('../interactions/characterViews');

const character = { id: 42, name: 'New' };
const view = buildCharacterRegisterConfirmView({ character, ownerDiscordId: '1234567890' });

const embed = view.embeds[0].toJSON();
assert.equal(embed.title, 'Register Character With Magiergilde');
assert.equal(
    embed.description.includes('This changes **New** from **draft** to **active (pending)**'),
    true,
);
assert.equal(
    embed.description.includes('After Magiergilde review, you cannot switch approved or declined characters back by yourself.'),
    true,
);

const row = view.components[0].toJSON();
const labels = row.components.map(component => component.label);
assert.deepEqual(labels, ['Register with Magiergilde', 'Cancel']);
assert.equal(row.components[0].custom_id, 'characterRegisterConfirm_42_1234567890');
assert.equal(row.components[1].custom_id, 'characterRegisterCancel_42_1234567890');

console.log('character-register-confirm-view.test.js passed');
