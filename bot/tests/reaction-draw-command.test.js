const assert = require('node:assert/strict');

const command = require('../commands/game/draw');
const reactionDraw = require('../interactions/reactionDraw');

async function run() {
    const originalShowPreview = reactionDraw.showPreview;

    try {
        let deferCount = 0;
        let editCount = 0;

        reactionDraw.showPreview = async (interaction) => {
            assert.equal(interaction.deferred, true);
            throw new Error('preview failed');
        };

        const interaction = {
            deferred: false,
            replied: false,
            deferReply: async () => {
                deferCount += 1;
                interaction.deferred = true;
            },
            editReply: async () => {
                editCount += 1;
            },
        };

        const originalConsoleError = console.error;
        console.error = (...args) => {
            void args;
        };

        try {
            await command.execute(interaction);
        } finally {
            console.error = originalConsoleError;
        }

        assert.equal(deferCount, 1);
        assert.equal(editCount, 1);
    } finally {
        reactionDraw.showPreview = originalShowPreview;
    }

    console.log('reaction-draw-command.test.js passed');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
