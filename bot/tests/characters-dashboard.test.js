const assert = require('node:assert/strict');

const { buildCharacterListView, buildCharactersSettingsView, buildDeleteAccountConfirmView } = require('../commands/game/characters');

const listView = buildCharacterListView({
    ownerDiscordId: '123',
    characters: [],
});

const dashboardButtons = listView.components[0].components.map(component => component.toJSON().label);
assert.deepEqual(dashboardButtons, ['Neu', 'Aktualisieren', 'Einstellungen']);

const settingsView = buildCharactersSettingsView({
    ownerDiscordId: '123',
    characters: [{ id: 1 }, { id: 2 }],
});

assert.equal(settingsView.embeds[0].data.title, 'Einstellungen der Charakter-Übersicht');
assert.deepEqual(
    settingsView.components[0].components.map(component => component.toJSON().label),
    ['Account löschen', 'Zurück'],
);

const confirmView = buildDeleteAccountConfirmView({
    ownerDiscordId: '123',
    characters: [{ id: 1 }, { id: 2 }],
});

assert.equal(confirmView.embeds[0].data.title, 'Account löschen');
assert.deepEqual(
    confirmView.components[0].components.map(component => component.toJSON().label),
    ['Ja, Account löschen', 'Abbrechen'],
);

console.log('characters-dashboard.test.js passed');
