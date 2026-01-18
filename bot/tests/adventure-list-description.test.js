const assert = require('node:assert/strict');
const test = require('node:test');

const { formatAdventureListDescription } = require('../utils/adventureList');

test('formatAdventureListDescription includes date, dm, and notes', () => {
    const adventure = {
        start_date: '2024-10-14 00:00:00',
        game_master: 'Daria',
        notes: 'Foggy marsh rescue mission.',
    };

    assert.equal(
        formatAdventureListDescription(adventure),
        '2024-10-14 \u007f DM: Daria \u007f Foggy marsh rescue mission.',
    );
});

test('formatAdventureListDescription truncates long notes', () => {
    const adventure = {
        start_date: '2024-10-14',
        game_master: 'Daria',
        notes: 'A'.repeat(200),
    };

    const description = formatAdventureListDescription(adventure);

    assert.equal(description.length, 100);
    assert.ok(description.startsWith('2024-10-14 \u007f DM: Daria \u007f A'));
});
