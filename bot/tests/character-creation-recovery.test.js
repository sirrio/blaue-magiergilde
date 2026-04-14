const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const originalDbModule = require.cache[dbPath];

const fakeDb = {
    async execute(sql, bindings = []) {
        if (sql.includes('SELECT lp.level, lp.required_bubbles, lp.version_id') && sql.includes('FROM level_progressions lp')) {
            return [[
                { level: 1, required_bubbles: 0, version_id: 1 },
                { level: 2, required_bubbles: 1, version_id: 1 },
                { level: 3, required_bubbles: 3, version_id: 1 },
                { level: 4, required_bubbles: 6, version_id: 1 },
                { level: 5, required_bubbles: 10, version_id: 1 },
                { level: 6, required_bubbles: 15, version_id: 1 },
                { level: 7, required_bubbles: 21, version_id: 1 },
                { level: 8, required_bubbles: 28, version_id: 1 },
                { level: 9, required_bubbles: 36, version_id: 1 },
                { level: 10, required_bubbles: 45, version_id: 1 },
                { level: 11, required_bubbles: 55, version_id: 1 },
                { level: 12, required_bubbles: 66, version_id: 1 },
                { level: 13, required_bubbles: 78, version_id: 1 },
                { level: 14, required_bubbles: 91, version_id: 1 },
                { level: 15, required_bubbles: 105, version_id: 1 },
                { level: 16, required_bubbles: 120, version_id: 1 },
                { level: 17, required_bubbles: 136, version_id: 1 },
                { level: 18, required_bubbles: 153, version_id: 1 },
                { level: 19, required_bubbles: 171, version_id: 1 },
                { level: 20, required_bubbles: 190, version_id: 1 },
            ]];
        }

        if (sql.includes('SELECT id, deleted_at, locale, simplified_tracking FROM users WHERE discord_id = ? LIMIT 1')) {
            return [[{
                id: 7,
                deleted_at: null,
                locale: 'de',
                simplified_tracking: 0,
            }]];
        }

        if (sql.includes('SELECT c.id, c.name, c.external_link')) {
            void bindings;
            return [[]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
    },
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
};

const { handle } = require('../interactions/characters');
const { t } = require('../i18n');
const { pendingCharacterCreations } = require('../state');

function makeCreationState(overrides = {}) {
    return {
        userId: 'u1',
        ownerDiscordId: 'u1',
        locale: 'de',
        step: 'avatar',
        data: {
            name: 'Aelwyn',
            externalLink: 'https://www.dndbeyond.com/characters/123',
            notes: '',
            avatar: '',
            classIds: [1],
            isFiller: false,
            startTier: 'bt',
            version: '2024',
            faction: 'none',
            guildStatus: 'draft',
        },
        promptInteraction: {
            isRepliable: () => true,
            isMessageComponent: () => true,
            replied: false,
            deferred: false,
            update: async () => undefined,
        },
        promptMessage: null,
        updatedAt: Date.now(),
        ...overrides,
    };
}

async function testResumeOpenCreationFromNewButton() {
    pendingCharacterCreations.clear();

    let editedPayload = null;
    let deferredUpdates = 0;

    const currentMessage = {
        id: 'm1',
        channelId: 'c1',
        editable: true,
        edit: async payload => {
            editedPayload = payload;
        },
    };

    pendingCharacterCreations.set('u1', makeCreationState());

    const interaction = {
        customId: 'charactersAction_new_u1',
        user: { id: 'u1' },
        channelId: 'c1',
        message: currentMessage,
        inGuild: () => true,
        isButton: () => true,
        isMessageComponent: () => true,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        deferUpdate: async () => {
            deferredUpdates += 1;
        },
    };

    const handled = await handle(interaction);

    assert.equal(handled, true);
    assert.equal(deferredUpdates, 1);
    assert.ok(editedPayload);
    assert.equal(editedPayload.embeds[0].data.title, 'Avatar hochladen');
    assert.equal(editedPayload.components[0].components[0].data.custom_id, 'charactersCreate_avatar_dm_u1');
}

async function testAvatarDmFailureShowsRecoveryState() {
    pendingCharacterCreations.clear();

    let editedPayload = null;
    let deferredUpdates = 0;
    const originalConsoleError = console.error;

    const currentMessage = {
        id: 'm2',
        channelId: 'c2',
        editable: true,
        edit: async payload => {
            editedPayload = payload;
        },
    };

    pendingCharacterCreations.set('u1', makeCreationState());

    const interaction = {
        customId: 'charactersCreate_avatar_dm_u1',
        user: {
            id: 'u1',
            createDM: async () => {
                throw new Error('DM blocked');
            },
        },
        channelId: 'c2',
        message: currentMessage,
        isButton: () => true,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        deferUpdate: async () => {
            deferredUpdates += 1;
        },
    };

    console.error = (...args) => {
        void args;
    };

    let handled;
    try {
        handled = await handle(interaction);
    } finally {
        console.error = originalConsoleError;
    }

    assert.equal(handled, true);
    assert.equal(deferredUpdates, 1);
    assert.ok(editedPayload);
    assert.equal(
        editedPayload.embeds[0].data.description,
        'Ich konnte dir keine DM schicken. Prüfe deine Discord-Datenschutzeinstellungen und versuche es erneut.',
    );
    assert.equal(editedPayload.components[0].components[0].data.custom_id, 'charactersCreate_avatar_dm_u1');
}

async function testExpiredCreationStartsFreshFlow() {
    pendingCharacterCreations.clear();

    let updatePayload = null;

    pendingCharacterCreations.set('u1', makeCreationState({
        step: 'avatar',
        updatedAt: Date.now() - (31 * 60 * 1000),
    }));

    const interaction = {
        customId: 'charactersAction_new_u1',
        user: { id: 'u1' },
        channelId: 'c1',
        message: null,
        inGuild: () => true,
        isButton: () => true,
        isMessageComponent: () => true,
        isStringSelectMenu: () => false,
        isModalSubmit: () => false,
        update: async payload => {
            updatePayload = payload;
        },
    };

    const handled = await handle(interaction);
    const state = pendingCharacterCreations.get('u1');
    const expiredDescription = updatePayload?.embeds?.[0]?.data?.description;

    assert.equal(handled, true);
    assert.ok(updatePayload);
    assert.equal(
        [
            t('characters.createExpired', {}, 'de'),
            t('characters.createExpired', {}, 'en'),
        ].includes(expiredDescription),
        true,
    );
    assert.equal(state.step, 'basic');
    assert.deepEqual(state.data.classIds, []);
}

async function run() {
    try {
        await testResumeOpenCreationFromNewButton();
        await testAvatarDmFailureShowsRecoveryState();
        await testExpiredCreationStartsFreshFlow();
        console.log('character-creation-recovery.test.js passed');
    } finally {
        pendingCharacterCreations.clear();
        if (originalDbModule === undefined) {
            delete require.cache[dbPath];
        } else {
            require.cache[dbPath] = originalDbModule;
        }
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
