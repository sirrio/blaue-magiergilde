const assert = require('node:assert/strict');

const { buildCharacterRegisterConfirmView } = require('../interactions/characterViews');

const character = { id: 42, name: 'New' };
const view = buildCharacterRegisterConfirmView({ character, ownerDiscordId: '1234567890' });

const embed = view.embeds[0].toJSON();
assert.equal(embed.title, 'Charakter bei der Magiergilde registrieren');
assert.equal(
    embed.description.includes('Dies ändert **New** von **draft** zu **active (pending)**'),
    true,
);
assert.equal(
    embed.description.includes('Das Review-Team prüft, ob der Charakter in der Magiergilde verwendet werden kann'),
    true,
);
assert.equal(
    embed.description.includes('Nach dem Review kannst du approved oder declined nicht selbst zurücksetzen.'),
    true,
);

const row = view.components[0].toJSON();
const labels = row.components.map(component => component.label);
assert.deepEqual(labels, ['Bei der Magiergilde registrieren', 'Abbrechen']);
assert.equal(row.components[0].custom_id, 'characterRegisterConfirm_42_1234567890');
assert.equal(row.components[1].custom_id, 'characterRegisterCancel_42_1234567890');

const needsChangesView = buildCharacterRegisterConfirmView({
    character: { id: 43, name: 'Fix Me', guild_status: 'needs_changes' },
    ownerDiscordId: '1234567890',
});
const needsChangesEmbed = needsChangesView.embeds[0].toJSON();
assert.equal(needsChangesEmbed.description.includes('von **needs changes** zu **active (pending)**'), true);

console.log('character-register-confirm-view.test.js passed');
