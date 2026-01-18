const assert = require('node:assert/strict');

const { updateCreationReply } = require('../interactions/interactionReplies');

async function run() {
    const calls = {
        update: 0,
        reply: 0,
        editReply: 0,
    };

    const interaction = {
        isRepliable: () => true,
        isMessageComponent: () => true,
        replied: false,
        deferred: false,
        update: async () => {
            calls.update += 1;
        },
        reply: async () => {
            calls.reply += 1;
        },
        editReply: async () => {
            calls.editReply += 1;
        },
    };

    await updateCreationReply({ promptInteraction: interaction }, { content: 'Menu updated.' });

    assert.equal(calls.update, 1);
    assert.equal(calls.reply, 0);
    assert.equal(calls.editReply, 0);
    console.log('updateCreationReply.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
