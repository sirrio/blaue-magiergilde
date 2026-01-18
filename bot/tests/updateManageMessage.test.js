const assert = require('node:assert/strict');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { manageMessageTargets } = require('../state');

async function run() {
    manageMessageTargets.clear();
    let sentPayload = null;
    const sentMessage = { id: 'm1', channelId: 'c1', editable: true };

    const interaction = {
        isMessageComponent: () => true,
        update: async () => {
            throw new Error('update failed');
        },
        isModalSubmit: () => false,
        channel: {
            isTextBased: () => true,
            send: async payload => {
                sentPayload = payload;
                return sentMessage;
            },
        },
        user: { id: 'u1' },
    };

    await updateManageMessage(interaction, { content: 'hello' });

    assert.equal(sentPayload.content, 'hello');
    assert.ok(manageMessageTargets.get('u1'));

    console.log('updateManageMessage.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
