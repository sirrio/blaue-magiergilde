const assert = require('node:assert/strict');
const { buildParticipantOptions } = require('../interactions/characterViews');

const options = buildParticipantOptions({
    allies: [
        { id: 1, name: 'Aelwyn', linked_character_id: 11, owner_name: 'Sirrio' },
    ],
    guildCharacters: [
        { id: 11, name: 'Aelwyn', owner_name: 'Sirrio' },
        { id: 12, name: 'Aelwyn', owner_name: 'Max' },
    ],
    selectedAllyIds: [],
    selectedGuildCharacterIds: [],
    search: '',
});

const linkedOption = options.find(option => option.key === 'ally_1');
const guildOption = options.find(option => option.key === 'guild_12');

assert.equal(linkedOption.description, 'Linked - Sirrio');
assert.equal(guildOption.label, 'Aelwyn - Max');
assert.equal(guildOption.description, 'Gildenmitglied - Max');

console.log('character-participant-options.test.js passed');
