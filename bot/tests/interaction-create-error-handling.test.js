const assert = require('node:assert/strict');

const interactionCreate = require('../events/interactionCreate');

async function run() {
    let deferCount = 0;
    let editCount = 0;
    let executeCount = 0;
    const originalConsoleError = console.error;

    const interaction = {
        commandName: 'explode',
        client: {
            commands: new Map([
                ['explode', {
                    execute: async () => {
                        executeCount += 1;
                        throw new Error('boom');
                    },
                }],
            ]),
        },
        deferred: false,
        replied: false,
        isButton: () => false,
        isModalSubmit: () => false,
        isStringSelectMenu: () => false,
        isUserSelectMenu: () => false,
        isRoleSelectMenu: () => false,
        isMentionableSelectMenu: () => false,
        isChannelSelectMenu: () => false,
        isMessageComponent: () => false,
        isChatInputCommand: () => true,
        isRepliable: () => true,
        deferReply: async () => {
            deferCount += 1;
            const error = new Error('Unknown interaction');
            error.code = 10062;
            throw error;
        },
        editReply: async () => {
            editCount += 1;
            throw new Error('editReply should not be called');
        },
    };

    console.error = (...args) => {
        void args;
    };

    try {
        await interactionCreate.execute(interaction);
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(executeCount, 1);
    assert.equal(deferCount, 1);
    assert.equal(editCount, 0);

    console.log('interaction-create-error-handling.test.js passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
