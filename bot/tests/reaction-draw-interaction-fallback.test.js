const assert = require('node:assert/strict');

const { updateInteractionSurface } = require('../interactions/reactionDraw');

async function testUsesEditableMessageFirst() {
    let editedPayload = null;
    let updateCalled = 0;

    const interaction = {
        message: {
            editable: true,
            edit: async payload => {
                editedPayload = payload;
            },
        },
        isMessageComponent: () => true,
        update: async () => {
            updateCalled += 1;
        },
    };

    const result = await updateInteractionSurface(interaction, { content: 'ok' });

    assert.equal(result, true);
    assert.deepEqual(editedPayload, { content: 'ok' });
    assert.equal(updateCalled, 0);
}

async function testReturnsFalseForExpiredInteractionWithoutThrowing() {
    const interaction = {
        message: null,
        deferred: false,
        replied: false,
        isMessageComponent: () => true,
        update: async () => {
            const error = new Error('Unknown interaction');
            error.code = 10062;
            error.status = 404;
            throw error;
        },
    };

    const result = await updateInteractionSurface(interaction, { content: 'expired' });

    assert.equal(result, false);
}

async function run() {
    await testUsesEditableMessageFirst();
    await testReturnsFalseForExpiredInteractionWithoutThrowing();
    console.log('reaction-draw-interaction-fallback.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
