const assert = require('node:assert/strict');

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

    const handled = await handle(interaction);

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

    assert.equal(handled, true);
    assert.ok(updatePayload);
    assert.equal(updatePayload.embeds[0].data.description, t('characters.createExpired'));
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
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
