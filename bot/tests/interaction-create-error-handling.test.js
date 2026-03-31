const assert = require('node:assert/strict');

const interactionCreate = require('../events/interactionCreate');

async function run() {
    const originalConsoleError = console.error;
    const logged = [];
    console.error = (...args) => {
        logged.push(args);
    };

    try {
        const interaction = {
            commandName: 'explode',
            client: {
                commands: new Map([
                    ['explode', {
                        execute: async () => {
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
            isChatInputCommand: () => true,
            isRepliable: () => true,
            deferReply: async () => {
                const error = new Error('Unknown interaction');
                error.code = 10062;
                throw error;
            },
            editReply: async () => {
                throw new Error('editReply should not be called');
            },
        };

        await interactionCreate.execute(interaction);

        assert.equal(logged.length >= 1, true);
        assert.equal(logged.some(entry => entry[0] instanceof Error && entry[0].message === 'boom'), true);
    } finally {
        console.error = originalConsoleError;
    }

    console.log('interaction-create-error-handling.test.js passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
