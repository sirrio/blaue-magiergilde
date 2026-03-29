const assert = require('node:assert/strict');

const { buildCharacterListView, buildCharactersSettingsView, buildCharacterLanguageView, buildDeleteAccountConfirmView, buildTrackingDefaultSelectionView } = require('../commands/game/characters');

const listView = buildCharacterListView({
    ownerDiscordId: '123',
    characters: [],
    locale: 'de',
});

const dashboardButtons = listView.components[0].components.map(component => component.toJSON().label);
assert.deepEqual(dashboardButtons, ['Neu', 'Aktualisieren', 'Einstellungen']);
assert.equal(listView.embeds[0].data.fields, undefined);

const settingsView = buildCharactersSettingsView({
    ownerDiscordId: '123',
    characters: [{ id: 1 }, { id: 2 }],
    locale: 'de',
    selectedLocale: 'de',
    trackingDefault: true,
});

assert.equal(settingsView.embeds[0].data.title, 'Einstellungen der Charakter-Übersicht');
assert.equal(settingsView.embeds[0].data.fields[2].name, 'Tracking-Standard');
assert.equal(settingsView.embeds[0].data.fields[2].value.includes('Level tracking'), true);
assert.deepEqual(
    settingsView.components[0].components.map(component => component.toJSON().label),
    ['Tracking', 'Sprache', 'Account löschen'],
);
assert.deepEqual(
    settingsView.components[1].components.map(component => component.toJSON().label),
    ['Zurück'],
);

const confirmView = buildDeleteAccountConfirmView({
    ownerDiscordId: '123',
    characters: [{ id: 1 }, { id: 2 }],
    locale: 'de',
});

assert.equal(confirmView.embeds[0].data.title, 'Account löschen');
assert.deepEqual(
    confirmView.components[0].components.map(component => component.toJSON().label),
    ['Ja, Account löschen', 'Abbrechen'],
);

const languageView = buildCharacterLanguageView({
    ownerDiscordId: '123',
    locale: 'en',
    selectedLocale: 'en',
});

assert.equal(languageView.embeds[0].data.title, 'Choose language');
assert.deepEqual(
    languageView.components[0].components.map(component => component.toJSON().label),
    ['Deutsch', 'English', 'Back'],
);
assert.equal(languageView.components[0].components[1].toJSON().style, 3);

const trackingDefaultView = buildTrackingDefaultSelectionView({
    ownerDiscordId: '123',
    locale: 'de',
});

assert.equal(trackingDefaultView.embeds[0].data.description.includes('Tipp: Du kannst beide Modi auch mischen'), true);

console.log('characters-dashboard.test.js passed');
