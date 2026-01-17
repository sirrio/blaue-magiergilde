const assert = require('node:assert/strict');
const { updateManageMessage } = require('../utils/updateManageMessage');

(async () => {
    let deferCalled = false;
    let editReplyCalled = false;
    let replyCalled = false;
    let deleteCalled = false;
    let editAttempted = false;

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
        reply: async () => {
            replyCalled = true;
        },
        deleteReply: async () => {
            deleteCalled = true;
        },
    };

    await updateManageMessage(interaction, { content: '', embeds: ['embed'], components: ['component'] });

    assert.equal(editAttempted, true);
    assert.equal(deferCalled, true);
    assert.equal(editReplyCalled, true);
    assert.equal(replyCalled, false);
    assert.equal(deleteCalled, true);

    console.log('update-manage-message.test.js passed');
})();
