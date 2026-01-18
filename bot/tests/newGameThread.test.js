const assert = require('node:assert/strict');

const {
    isThreadChannel,
    threadRestrictionMessage,
} = require('../interactions/newGameHelpers');

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
    assert.match(threadRestrictionMessage(), /non-thread channel/i);
})();

console.log('newGameThread.test.js passed');
