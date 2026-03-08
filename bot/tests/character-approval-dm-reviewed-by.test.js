const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const notifierPath = require.resolve('../characterApprovalNotifier');

const originalDbModule = require.cache[dbPath];
const originalNotifierModule = require.cache[notifierPath];

const fakeDb = {
    async execute(sql) {
        assert.equal(sql.includes('SELECT locale FROM users WHERE discord_id = ? LIMIT 1'), true);
        return [[{ locale: 'de' }]];
    },
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
};

delete require.cache[notifierPath];

const { sendCharacterApprovalDm } = require('../characterApprovalNotifier');

Promise.resolve()
    .then(async () => {
        let sentPayload = null;

        const client = {
            users: {
                async fetch() {
                    return {
                        async send(payload) {
                            sentPayload = payload;
                            return { id: 'dm-message-id' };
                        },
                    };
                },
            },
        };

        const result = await sendCharacterApprovalDm({
            client,
            discordUserId: '1234567890',
            status: 'approved',
            characterName: 'Test Character',
            characterTier: 'bt',
            characterVersion: '2024',
            characterFaction: 'none',
            characterClasses: ['Wizard'],
            characterAvatarUrl: '',
            characterReviewNote: '',
            externalLink: '',
            reviewerName: 'Sirrio',
            reviewerDiscordId: '9988776655',
        });

        assert.equal(result.ok, true);
        assert.ok(sentPayload);

        const embedData = sentPayload.embeds[0].toJSON();
        const reviewedByField = embedData.fields.find((field) => field.name === 'Geprüft von');
        assert.ok(reviewedByField);
        assert.equal(reviewedByField.value.includes('Sirrio'), true);
        assert.equal(reviewedByField.value.includes('<@9988776655>'), true);

        console.log('character-approval-dm-reviewed-by.test.js passed');
    })
    .finally(() => {
        if (originalDbModule === undefined) {
            delete require.cache[dbPath];
        } else {
            require.cache[dbPath] = originalDbModule;
        }

        if (originalNotifierModule === undefined) {
            delete require.cache[notifierPath];
        } else {
            require.cache[notifierPath] = originalNotifierModule;
        }
    });
