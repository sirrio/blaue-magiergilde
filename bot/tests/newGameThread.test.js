const assert = require('node:assert/strict');
const test = require('node:test');

const {
    isThreadChannel,
    threadRestrictionMessage,
} = require('../interactions/newGameHelpers');

test('isThreadChannel returns true for thread channels', () => {
    const thread = {
        id: 'thread-channel',
        isThread: () => true,
    };

    assert.equal(isThreadChannel(thread), true);
});

test('isThreadChannel returns false for non-thread channels', () => {
    const channel = {
        id: 'text-channel',
        isThread: () => false,
    };

    assert.equal(isThreadChannel(channel), false);
});

test('threadRestrictionMessage returns a helpful prompt', () => {
    assert.match(threadRestrictionMessage(), /non-thread channel/i);
});
