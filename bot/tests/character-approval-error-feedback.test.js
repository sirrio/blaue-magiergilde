const assert = require('node:assert/strict');
const { handle } = require('../interactions/characterApproval');
const { buildCharacterApprovalMessage } = require('../characterApprovalNotifier');

function buildInteraction(customId) {
    const message = buildCharacterApprovalMessage({
        character_status: 'pending',
        character_name: 'Test Character',
        character_tier: 'bt',
        character_version: '2024',
        character_classes: ['Wizard'],
        user_name: 'User',
        user_discord_id: '123456789012345678',
        character_id: 12,
        approval_url: 'https://blaue-magiergilde.test/admin/character-approvals',
        external_link: 'https://www.dndbeyond.com/characters/12',
    });

    const followUps = [];

    return {
        interaction: {
            customId,
            user: { id: '555555555555555555' },
            message: {
                embeds: message.embeds.map((embed) => embed.toJSON()),
                components: message.components,
                editable: true,
                edit: async () => {},
            },
            isButton: () => true,
            isModalSubmit: () => false,
            deferUpdate: async () => {},
            followUp: async (payload) => {
                followUps.push(payload);
            },
        },
        followUps,
    };
}

async function testReachabilityHint() {
    const originalFetch = global.fetch;
    const originalAppUrl = process.env.BOT_PUBLIC_APP_URL;
    const originalBotAppUrl = process.env.BOT_APP_URL;
    const originalLaravelAppUrl = process.env.APP_URL;
    const originalToken = process.env.BOT_HTTP_TOKEN;

    process.env.BOT_PUBLIC_APP_URL = 'https://example.test';
    process.env.BOT_APP_URL = '';
    process.env.APP_URL = '';
    process.env.BOT_HTTP_TOKEN = 'secret';
    global.fetch = async () => {
        throw new Error('cURL error 28: Operation timed out after 10003 milliseconds');
    };

    try {
        const { interaction, followUps } = buildInteraction('character-approval-confirm:approved:12:pending');
        const handled = await handle(interaction);

        assert.equal(handled, true);
        assert.equal(followUps.length, 1);
        assert.match(followUps[0].embeds[0].data.title, /App-Anfrage fehlgeschlagen/);
        assert.match(followUps[0].embeds[0].data.description, /nicht rechtzeitig geantwortet/i);
    } finally {
        global.fetch = originalFetch;
        process.env.BOT_PUBLIC_APP_URL = originalAppUrl;
        process.env.BOT_APP_URL = originalBotAppUrl;
        process.env.APP_URL = originalLaravelAppUrl;
        process.env.BOT_HTTP_TOKEN = originalToken;
    }
}

async function testRequestFailureHint() {
    const originalFetch = global.fetch;
    const originalAppUrl = process.env.BOT_PUBLIC_APP_URL;
    const originalBotAppUrl = process.env.BOT_APP_URL;
    const originalLaravelAppUrl = process.env.APP_URL;
    const originalToken = process.env.BOT_HTTP_TOKEN;

    process.env.BOT_PUBLIC_APP_URL = 'https://example.test';
    process.env.BOT_APP_URL = '';
    process.env.APP_URL = '';
    process.env.BOT_HTTP_TOKEN = 'secret';
    global.fetch = async () => ({
        ok: false,
        json: async () => ({ error: 'The bot did not respond in time.' }),
    });

    try {
        const { interaction, followUps } = buildInteraction('character-approval-confirm:approved:12:pending');
        const handled = await handle(interaction);

        assert.equal(handled, true);
        assert.equal(followUps.length, 1);
        assert.match(followUps[0].embeds[0].data.title, /Status-Update fehlgeschlagen/);
        assert.match(followUps[0].embeds[0].data.description, /warte kurz und versuche es erneut/i);
    } finally {
        global.fetch = originalFetch;
        process.env.BOT_PUBLIC_APP_URL = originalAppUrl;
        process.env.BOT_APP_URL = originalBotAppUrl;
        process.env.APP_URL = originalLaravelAppUrl;
        process.env.BOT_HTTP_TOKEN = originalToken;
    }
}

Promise.resolve()
    .then(testReachabilityHint)
    .then(testRequestFailureHint)
    .then(() => {
        console.log('character-approval-error-feedback.test.js passed');
    });
