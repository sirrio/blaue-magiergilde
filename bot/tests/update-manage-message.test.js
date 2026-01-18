const assert = require('node:assert/strict');
const { updateManageMessage } = require('../utils/updateManageMessage');

(async () => {
    let deferCalled = false;
    let editReplyCalled = false;
    let deleteCalled = false;
    let editAttempted = false;
    let updateAttempted = false;
    let updateReplyCalled = false;
    let fallbackDeferred = false;

    const interaction = {
        isMessageComponent: () => false,
        isModalSubmit: () => true,
        deferred: false,
        replied: false,
        deferReply: async ({ flags }) => {
            deferCalled = true;
            interaction.deferred = true;
            interaction.deferFlags = flags;
        },
        message: {
            editable: true,
            edit: async () => {
                editAttempted = true;
                throw new Error('Edit failed');
            },
        },
        isRepliable: () => true,
        editReply: async (payload) => {
            editReplyCalled = true;
            interaction.replied = true;
            interaction.editPayload = payload;
        },
        deleteReply: async () => {
            deleteCalled = true;
        },
    };

    await updateManageMessage(interaction, { content: '', embeds: ['embed'], components: ['component'] });

    assert.equal(editAttempted, true);
    assert.equal(deferCalled, true);
    assert.equal(editReplyCalled, true);
    assert.equal(deleteCalled, true);

    const componentInteraction = {
        isMessageComponent: () => true,
        isRepliable: () => true,
        deferred: false,
        replied: false,
        update: async () => {
            updateAttempted = true;
            throw new Error('Unknown Message');
        },
        deferReply: async () => {
            fallbackDeferred = true;
        },
        editReply: async () => {
            updateReplyCalled = true;
        },
    };

    await updateManageMessage(componentInteraction, { content: 'fallback' });

    assert.equal(updateAttempted, true);
    assert.equal(updateReplyCalled, false);
    assert.equal(fallbackDeferred, false);

    console.log('update-manage-message.test.js passed');
})();
