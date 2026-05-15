const assert = require('node:assert/strict');

const appDbPath = require.resolve('../appDb');
const commandsPath = require.resolve('../commands/game/characters');
const characterViewsPath = require.resolve('../interactions/characterViews');
const levelProgressionPath = require.resolve('../utils/levelProgression');
const featureAccessPath = require.resolve('../utils/featureAccess');
const charactersPath = require.resolve('../interactions/characters');

const originalModules = new Map([
    [appDbPath, require.cache[appDbPath]],
    [commandsPath, require.cache[commandsPath]],
    [characterViewsPath, require.cache[characterViewsPath]],
    [levelProgressionPath, require.cache[levelProgressionPath]],
    [featureAccessPath, require.cache[featureAccessPath]],
    [charactersPath, require.cache[charactersPath]],
]);

const state = require('../state');

let capturedCreateUser = null;

require.cache[appDbPath] = {
    id: appDbPath,
    filename: appDbPath,
    loaded: true,
    exports: {
        DiscordNotLinkedError: class DiscordNotLinkedError extends Error {},
        createCharacterForDiscord: async (discordUser) => {
            capturedCreateUser = discordUser;
            return { ok: true, id: 77 };
        },
        getLinkedUserLocaleForDiscord: async () => 'de',
        getLinkedUserTrackingDefaultForDiscord: async () => false,
        listCharactersForDiscord: async () => [],
        getCharacterSubmissionStateForDiscord: async () => ({ ok: true, blockedReason: null, counts: null }),
        getCharacterProgressionUpgradeStateForDiscord: async () => ({ ok: false }),
        updateCharacterManualLevelForDiscord: async () => ({ ok: false }),
        updateCharacterTrackingModeForDiscord: async () => ({ ok: false }),
        updateCharacterManualOverridesForDiscord: async () => ({ ok: false }),
        updateCharacterBubbleShopForDiscord: async () => ({ ok: false }),
        upgradeCharacterProgressionForDiscord: async () => ({ ok: false }),
        updateLinkedUserLocaleForDiscord: async () => ({ ok: false }),
        updateLinkedUserTrackingDefaultForDiscord: async () => ({ ok: false }),
        findCharacterForDiscord: async () => ({
            id: 77,
            user_id: 1,
            name: 'Aelwyn',
            progression_version_id: 1,
            guild_status: 'draft',
        }),
        updateCharacterForDiscord: async () => ({ ok: false }),
        listCharacterClassesForDiscord: async () => [{ id: 1, name: 'Wizard', guild_enabled: 1 }],
        syncCharacterClassesForDiscord: async () => ({ ok: false }),
        softDeleteCharacterForDiscord: async () => ({ ok: false }),
        listAdventuresForDiscord: async () => [],
        findAdventureForDiscord: async () => null,
        createAdventureForDiscord: async () => ({ ok: false }),
        updateAdventureForDiscord: async () => ({ ok: false }),
        softDeleteAdventureForDiscord: async () => ({ ok: false }),
        listAlliesForDiscord: async () => [],
        listGuildCharactersForDiscord: async () => [],
        listAdventureParticipantsForDiscord: async () => [],
        syncAdventureParticipantsForDiscord: async () => ({ ok: false }),
        listDowntimesForDiscord: async () => [],
        findDowntimeForDiscord: async () => null,
        createDowntimeForDiscord: async () => ({ ok: false }),
        updateDowntimeForDiscord: async () => ({ ok: false }),
        softDeleteDowntimeForDiscord: async () => ({ ok: false }),
    },
};

require.cache[commandsPath] = {
    id: commandsPath,
    filename: commandsPath,
    loaded: true,
    exports: {
        buildCharacterListView: () => ({}),
        buildCharactersSettingsView: () => ({}),
        buildCharacterLanguageView: () => ({}),
        buildTrackingDefaultSelectionView: () => ({}),
        buildDeleteAccountConfirmView: () => ({}),
    },
};

require.cache[characterViewsPath] = {
    id: characterViewsPath,
    filename: characterViewsPath,
    loaded: true,
    exports: {
        buildCharacterCardPayload: ({ character, ownerDiscordId }) => ({
            content: '',
            embeds: [{ data: { title: character.name } }],
            components: [{ ownerDiscordId }],
        }),
        buildClassesRow: () => ({ type: 'classes-row' }),
        buildCreationEmbed: (step, title, description) => ({ step, title, description }),
        buildCreationStepActionRows: () => [{ type: 'action-row' }],
        buildStartTierRow: () => ({ type: 'tier-row' }),
        getStartTierSelection: state => state?.data?.isFiller ? 'filler' : state?.data?.startTier,
        isHttpUrl: value => typeof value === 'string' && /^https?:\/\//.test(value),
    },
};

require.cache[levelProgressionPath] = {
    id: levelProgressionPath,
    filename: levelProgressionPath,
    loaded: true,
    exports: {
        activeLevelProgressionVersionId: () => 1,
        bubblesRequiredForLevel: () => 0,
        ensureLevelProgressionLoaded: async () => undefined,
    },
};

require.cache[featureAccessPath] = {
    id: featureAccessPath,
    filename: featureAccessPath,
    loaded: true,
    exports: {
        canUseLevelCurveUpgradeForUserId: () => false,
    },
};

delete require.cache[charactersPath];
const { finalizeCharacterCreation, updateDowntimeMessage } = require('../interactions/characters');

async function testFinalizeCharacterCreationUsesStateInteractionUser() {
    capturedCreateUser = null;

    const payloads = [];
    const creationState = {
        userId: 'u1',
        ownerDiscordId: 'u1',
        locale: 'de',
        activeInteraction: null,
        promptInteraction: {
            user: { id: 'discord-user-1' },
        },
        promptMessage: {
            editable: true,
            edit: async payload => {
                payloads.push(payload);
            },
        },
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
    };

    await finalizeCharacterCreation(creationState);

    assert.equal(capturedCreateUser?.id, 'discord-user-1');
    assert.equal(payloads.length, 1);
    assert.equal(payloads[0].content, '');
    assert.equal(payloads[0].embeds[0].data.title, 'Aelwyn');
}

async function testUpdateDowntimeMessageSwallowsExpiredReplyToken() {
    const invalidTokenError = new Error('Invalid Webhook Token');
    invalidTokenError.code = 50027;

    const downtimeState = {
        promptInteraction: {
            isMessageComponent: () => true,
            update: async () => {
                throw new Error('message no longer updatable');
            },
            isRepliable: () => true,
            editReply: async () => {
                throw invalidTokenError;
            },
        },
        activeInteraction: null,
    };

    const result = await updateDowntimeMessage(downtimeState, { content: 'test', embeds: [], components: [] });

    assert.equal(result, false);
}

async function testCreationClassAndTierSelectionsDeferImmediately() {
    const { handle } = require('../interactions/characters');
    const creationState = {
        userId: 'u1',
        ownerDiscordId: 'u1',
        locale: 'de',
        data: {
            classIds: [],
            startTier: 'bt',
            isFiller: false,
            version: '2024',
            faction: 'none',
        },
        step: 'classes',
        promptMessage: {
            editable: true,
            edit: async () => undefined,
        },
    };

    state.pendingCharacterCreations.set('u1', creationState);

    const makeSelectInteraction = (customId, values) => {
        let deferCount = 0;
        return {
            customId,
            values,
            user: { id: 'u1' },
            message: creationState.promptMessage,
            isStringSelectMenu: () => true,
            isButton: () => false,
            isModalSubmit: () => false,
            isMessageComponent: () => true,
            isRepliable: () => true,
            deferUpdate: async () => {
                deferCount += 1;
            },
            get deferCount() {
                return deferCount;
            },
        };
    };

    const classInteraction = makeSelectInteraction('charactersCreate_classes_u1', ['1']);
    await handle(classInteraction);

    assert.equal(classInteraction.deferCount, 1);
    assert.deepEqual(creationState.data.classIds, [1]);

    const tierInteraction = makeSelectInteraction('charactersCreate_tier_u1', ['lt']);
    await handle(tierInteraction);

    assert.equal(tierInteraction.deferCount, 1);
    assert.equal(creationState.data.startTier, 'lt');
}

async function run() {
    try {
        await testFinalizeCharacterCreationUsesStateInteractionUser();
        await testUpdateDowntimeMessageSwallowsExpiredReplyToken();
        await testCreationClassAndTierSelectionsDeferImmediately();
        console.log('character-interaction-regressions.test.js passed');
    } finally {
        state.pendingCharacterCreations.clear();
        state.pendingDowntimeCreations.clear();

        for (const [modulePath, originalModule] of originalModules.entries()) {
            if (originalModule === undefined) {
                delete require.cache[modulePath];
            } else {
                require.cache[modulePath] = originalModule;
            }
        }
    }
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
