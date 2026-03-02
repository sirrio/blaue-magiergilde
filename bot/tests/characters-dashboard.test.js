const assert = require('node:assert/strict');

const { buildCharacterListView, buildCharactersSettingsView, buildDeleteAccountConfirmView } = require('../commands/game/characters');

const listView = buildCharacterListView({
    ownerDiscordId: '123',
    characters: [],
});

const dashboardButtons = listView.components[0].components.map(component => component.toJSON().label);
assert.deepEqual(dashboardButtons, ['New', 'Refresh', 'Settings']);

const settingsView = buildCharactersSettingsView({
    ownerDiscordId: '123',
    characters: [{ id: 1 }, { id: 2 }],
});

assert.equal(settingsView.embeds[0].data.title, 'Character dashboard settings');
assert.deepEqual(
    settingsView.components[0].components.map(component => component.toJSON().label),
    ['Delete account', 'Back'],
);

const confirmView = buildDeleteAccountConfirmView({
    ownerDiscordId: '123',
    characters: [{ id: 1 }, { id: 2 }],
});

assert.equal(confirmView.embeds[0].data.title, 'Delete account');
assert.deepEqual(
    confirmView.components[0].components.map(component => component.toJSON().label),
    ['Yes, delete account', 'Cancel'],
);

console.log('characters-dashboard.test.js passed');
