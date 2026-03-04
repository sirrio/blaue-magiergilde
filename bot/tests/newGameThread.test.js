const assert = require('node:assert/strict');

const {
    isThreadChannel,
    threadRestrictionMessage,
} = require('../interactions/newGameHelpers');
const command = require('../commands/game/new-game');

(() => {
    const thread = {
        id: 'thread-channel',
        isThread: () => true,
    };

    assert.equal(isThreadChannel(thread), true);
})();

(() => {
    const channel = {
        id: 'text-channel',
        isThread: () => false,
    };

    assert.equal(isThreadChannel(channel), false);
})();

(() => {
    assert.match(threadRestrictionMessage('en'), /non-thread channel/i);
    assert.match(threadRestrictionMessage('de'), /normalen Kanal/i);
})();

(() => {
    assert.equal(command.data.description, 'Erstellt eine neue Spielankündigung.');
})();

console.log('newGameThread.test.js passed');
