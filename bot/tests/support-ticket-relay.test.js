const assert = require('node:assert/strict');

const { relayUserMessageToThread } = require('../supportTickets');

async function testRelayReturnsFalseWhenThreadSendFails() {
    const ticket = {
        id: 42,
        thread_id: 'thread-42',
        locale: 'de',
        user_discord_id: '1234',
    };

    const message = {
        author: {
            id: '1234',
            username: 'sirrio',
            tag: 'sirrio#0001',
        },
        content: 'Test',
        attachments: new Map(),
    };

    const thread = {
        archived: false,
        send: async () => {
            const error = new Error('Missing Access');
            error.code = 50001;
            error.status = 403;
            throw error;
        },
    };

    const originalWarn = console.warn;
    console.warn = () => undefined;

    try {
        const result = await relayUserMessageToThread(ticket, message, thread);
        assert.equal(result.ok, false);
        assert.equal(result.thread, thread);
    } finally {
        console.warn = originalWarn;
    }
}

async function run() {
    await testRelayReturnsFalseWhenThreadSendFails();
    console.log('support-ticket-relay.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
