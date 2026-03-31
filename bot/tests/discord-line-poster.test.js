const assert = require('node:assert/strict');
const { postLinesToChannel } = require('../discordLinePoster');

async function run() {
    const sentPayloads = [];
    const channel = {
        isTextBased: () => true,
        send: async (payload) => {
            sentPayloads.push(payload);
            return { id: String(sentPayloads.length) };
        },
    };

    const result = await postLinesToChannel({
        client: {
            channels: {
                cache: new Map([['1234567890', channel]]),
            },
        },
        channelId: '1234567890',
        lines: [' First line ', '', 'Second line', '  ', 'Third line'],
    });

    assert.equal(result.ok, true);
    assert.equal(result.posted_lines, 3);
    assert.deepEqual(sentPayloads, [
        { content: 'First line' },
        { content: 'Second line' },
        { content: 'Third line' },
    ]);

    const archivedThread = {
        archived: true,
        isTextBased: () => true,
        isThread: () => true,
        setArchivedCalls: [],
        setArchived: async function(value) {
            this.setArchivedCalls.push(value);
        },
        send: async () => ({ id: '1' }),
    };

    const threadResult = await postLinesToChannel({
        client: {
            channels: {
                cache: new Map([['55555', archivedThread]]),
            },
        },
        channelId: '55555',
        lines: ['Thread line'],
    });

    assert.equal(threadResult.ok, true);
    assert.deepEqual(archivedThread.setArchivedCalls, [false]);

    const invalidResult = await postLinesToChannel({
        client: { channels: { cache: new Map() } },
        channelId: 'abc',
        lines: ['Line'],
    });

    assert.equal(invalidResult.ok, false);
    assert.equal(invalidResult.status, 422);

    const missingResult = await postLinesToChannel({
        client: {
            channels: {
                cache: new Map(),
                fetch: async () => null,
            },
        },
        channelId: '99999',
        lines: ['Line'],
    });

    assert.equal(missingResult.ok, false);
    assert.equal(missingResult.status, 404);
}

run().then(() => {
    console.log('discord-line-poster.test.js passed');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
