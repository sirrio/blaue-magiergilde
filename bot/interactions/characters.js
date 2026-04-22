const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
} = require('discord.js');
const { Agent } = require('undici');
const { updateCreationReply } = require('./interactionReplies');
const { resolveApiBaseUrls } = require('../appUrls');
const { t } = require('../i18n');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { setManageMessageTarget } = require('../utils/manageMessageTarget');

const {
    DiscordNotLinkedError,
    createCharacterForDiscord,
    getLinkedUserLocaleForDiscord,
    getLinkedUserTrackingDefaultForDiscord,
    listCharactersForDiscord,
    getCharacterSubmissionStateForDiscord,
    getCharacterProgressionUpgradeStateForDiscord,
    updateCharacterManualLevelForDiscord,
    updateCharacterTrackingModeForDiscord,
    updateCharacterManualOverridesForDiscord,
    updateCharacterBubbleShopForDiscord,
    upgradeCharacterProgressionForDiscord,
    updateLinkedUserLocaleForDiscord,
    updateLinkedUserTrackingDefaultForDiscord,
    findCharacterForDiscord,
    updateCharacterForDiscord,
    listCharacterClassesForDiscord,
    syncCharacterClassesForDiscord,
    softDeleteCharacterForDiscord,
    listAdventuresForDiscord,
    findAdventureForDiscord,
    createAdventureForDiscord,
    updateAdventureForDiscord,
    softDeleteAdventureForDiscord,
    listAlliesForDiscord,
    listGuildCharactersForDiscord,
    listAdventureParticipantsForDiscord,
    syncAdventureParticipantsForDiscord,
    listDowntimesForDiscord,
    findDowntimeForDiscord,
    createDowntimeForDiscord,
    updateDowntimeForDiscord,
    softDeleteDowntimeForDiscord,
} = require('../appDb');
const {
    TYPE_DOWNTIME,
    TYPE_RARE_LANGUAGE,
    TYPE_SKILL_PROFICIENCY,
    TYPE_TOOL_OR_LANGUAGE,
    definitionsForCharacter,
    quantitiesForCharacter,
} = require('../utils/characterBubbleShop');

const { buildCharacterListView, buildCharactersSettingsView, buildCharacterLanguageView, buildTrackingDefaultSelectionView, buildDeleteAccountConfirmView } = require('../commands/game/characters');
const { formatLocalIsoDate } = require('../dateUtils');
const { calculateBubblesInCurrentLevel, calculateLevel } = require('../utils/characterTier');
const { activeLevelProgressionVersionId, bubblesRequiredForLevel, ensureLevelProgressionLoaded } = require('../utils/levelProgression');

const { replyNotLinked, notLinkedContent, buildNotLinkedButtons } = require('../linkingUi');
const {
    buildAdventureConfirmRows,
    buildAdventureDateModal,
    buildAdventureDateRows,
    buildAdventureDeleteConfirmRow,
    buildAdventureDurationModal,
    buildAdventureDurationRows,
    buildAdventureListRows,
    buildAdventureManageDateModal,
    buildAdventureManageDurationModal,
    buildAdventureManageNotesModal,
    buildAdventureManageTitleModal,
    buildAdventureManageView,
    buildAdventureMenuRow,
    buildAdventureNotesModal,
    buildAdventureNotesRows,
    buildAdventureParticipantsRows,
    buildAdventureParticipantsView,
    buildAdventureQuestManageView,
    buildAdventureQuestRows,
    buildAdventureStepEmbed,
    buildAdventureTitleModal,
    buildAdventureTitleRows,
    buildAvatarStepEmbed,
    buildAvatarUploadRow,
    buildParticipantOptions,
    buildCharacterCardPayload,
    buildCharacterProgressionUpgradeView,
    buildCharacterRegistrationBlockedContent,
    buildCharacterRegisterNoteModal,
    buildCharacterRegisterConfirmView,
    buildCharacterClassesView,
    buildCharacterFactionView,
    buildCharacterManageView,
    buildClassesRow,
    buildCreationBasicModal,
    buildCreationBasicsEmbed,
    buildCreationBasicsRows,
    buildCreationCancelRow,
    buildCreationConfirmRows,
    buildCreationEmbed,
    buildCreationStepActionRows,
    buildCreationSummaryEmbed,
    buildDeleteConfirmRow,
    buildDowntimeConfirmRows,
    buildDowntimeDateModal,
    buildDowntimeDateRows,
    buildDowntimeDeleteConfirmRow,
    buildDowntimeDurationModal,
    buildDowntimeDurationRows,
    buildDowntimeListRows,
    buildDowntimeManageDateModal,
    buildDowntimeManageDurationModal,
    buildDowntimeManageNotesModal,
    buildDowntimeManageView,
    buildDowntimeMenuRow,
    buildDowntimeNotesModal,
    buildDowntimeNotesRows,
    buildDowntimeStepEmbed,
    buildDowntimeTypeManageView,
    buildDowntimeTypeRows,
    buildFactionRow,
    buildStartTierRow,
    buildVersionRow,
    allowedFactions,
    formatParticipantList,
    getParticipantSearch,
    getStartTierSelection,
    isExternalCharacterLink,
    isHttpUrl,
    safeModalValue,
    setParticipantSearch,
} = require('./characterViews');
const {
    pendingCharacterCreations,
    pendingCharacterAvatarUpdates,
    pendingAdventureCreations,
    pendingDowntimeCreations,
} = require('../state');

const isCharacterStatusSwitchEnabled = String(process.env.FEATURE_CHARACTER_STATUS_SWITCH ?? 'true').trim().toLowerCase() !== 'false';
const characterCreationTtlMs = 30 * 60 * 1000;

function isOwnerOfInteraction(interaction, ownerDiscordId) {
    return String(interaction.user.id) === String(ownerDiscordId);
}

function canCharacterLogActivity(character) {
    const status = String(character?.guild_status || '').trim().toLowerCase();
    return !isCharacterStatusSwitchEnabled || status !== 'draft';
}

function getAvatarUpdateState(userId) {
    return pendingCharacterAvatarUpdates.get(String(userId)) || null;
}

function setAvatarUpdateState(userId, state) {
    pendingCharacterAvatarUpdates.set(String(userId), state);
}

function clearAvatarUpdateState(userId) {
    pendingCharacterAvatarUpdates.delete(String(userId));
}

async function updateCharacterListMessage(interaction, ownerDiscordId) {
    await ensureLevelProgressionLoaded();
    const characters = await listCharactersForDiscord(interaction.user);
    const locale = await getLinkedUserLocaleForDiscord(interaction.user);
    const listView = buildCharacterListView({ ownerDiscordId, characters, locale });
    await interaction.update({
        ...listView,
        content: '',
    });
}

async function getCharacterRegistrationBlock(interactionUser, characterId) {
    const submissionState = await getCharacterSubmissionStateForDiscord(interactionUser, characterId);
    if (!submissionState.ok) {
        return { blockedReason: null, counts: null };
    }

    return {
        blockedReason: submissionState.blockedReason,
        counts: submissionState.counts,
    };
}

async function buildCharacterCardPayloadForInteraction(interactionUser, character, ownerDiscordId) {
    await ensureLevelProgressionLoaded();
    const registrationState = await getCharacterRegistrationBlock(interactionUser, character.id);
    const activeVersionId = activeLevelProgressionVersionId();

    return buildCharacterCardPayload({
        character: {
            ...character,
            locale: await getLinkedUserLocaleForDiscord(interactionUser),
            has_progression_upgrade_available: safeInt(character.progression_version_id) > 0
                && safeInt(character.progression_version_id) !== activeVersionId,
        },
        ownerDiscordId,
        registrationBlockedReason: registrationState.blockedReason,
        registrationCounts: registrationState.counts,
    });
}

function normalizeProgressionUpgradeSelection(state, selectedLevel, selectedBubbles, allowOutsideRangeWithoutDowntime = false) {
    const currentLevelFloor = bubblesRequiredForLevel(state.currentLevel, state.activeVersionId);
    const defaultRangeMinAvailableBubbles = Math.min(currentLevelFloor, safeInt(state.currentAvailableBubbles));
    const defaultRangeMaxAvailableBubbles = Math.max(currentLevelFloor, safeInt(state.currentAvailableBubbles));
    const absoluteMinSelectableLevel = Math.max(1, safeInt(state.minSelectableLevel, 1));
    const minSelectableLevel = state.usesManualTracking && !allowOutsideRangeWithoutDowntime
        ? Math.min(state.currentLevel, state.recalculatedLevel)
        : absoluteMinSelectableLevel;
    const maxSelectableLevel = state.usesManualTracking && allowOutsideRangeWithoutDowntime
        ? 20
        : Math.max(minSelectableLevel, state.usesManualTracking ? Math.max(state.currentLevel, state.recalculatedLevel) : safeInt(state.maxSelectableLevel, minSelectableLevel));
    const level = Math.max(minSelectableLevel, Math.min(maxSelectableLevel, safeInt(selectedLevel, state.initialTargetLevel)));
    const levelFloor = bubblesRequiredForLevel(level, state.activeVersionId);
    const minBubbles = level >= 20
        ? 0
        : Math.max(
            0,
            (state.usesManualTracking && !allowOutsideRangeWithoutDowntime ? defaultRangeMinAvailableBubbles : safeInt(state.minimumAvailableBubbles)) - levelFloor,
        );
    const maxBubbles = level >= 20
        ? 0
        : Math.max(0, Math.min(
            bubblesRequiredForLevel(Math.min(20, level + 1), state.activeVersionId) - levelFloor - 1,
            state.usesManualTracking
                ? (allowOutsideRangeWithoutDowntime ? Number.MAX_SAFE_INTEGER : defaultRangeMaxAvailableBubbles) - levelFloor
                : safeInt(state.currentAvailableBubbles) - levelFloor,
        ));
    const bubbles = level >= 20
        ? 0
        : Math.max(minBubbles, Math.min(maxBubbles, safeInt(selectedBubbles, state.initialTargetBubblesInLevel)));

    return { level, bubbles };
}

async function resolveInteractionLocale(interaction) {
    try {
        return await getLinkedUserLocaleForDiscord(interaction.user);
    } catch {
        return null;
    }
}

async function translateInteraction(interaction, key, params = {}) {
    return t(key, params, await resolveInteractionLocale(interaction));
}

async function updateActionDenied(interaction, extra = {}) {
    await updateManageMessage(interaction, {
        content: await translateInteraction(interaction, 'common.actionDeniedBody'),
        ...extra,
    });
}

async function editNotLinked(interaction) {
    await interaction.editReply({
        content: notLinkedContent(),
        components: [buildNotLinkedButtons(interaction.user.id)],
    });
}

function parseIsoDate(value) {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    return raw;
}

function parseDurationToSeconds(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    const normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    const matchHhMm = normalized.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (matchHhMm) {
        const hours = Number(matchHhMm[1]);
        const minutes = Number(matchHhMm[2]);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59 || hours < 0) return null;
        return hours * 3600 + minutes * 60;
    }

    if (normalized.includes('h') || normalized.includes('m')) {
        const hourMatch = normalized.match(/(\d+)\s*h/);
        const minuteMatch = normalized.match(/(\d+)\s*m/);
        if (!hourMatch && !minuteMatch) return null;

        let hours = hourMatch ? Number(hourMatch[1]) : 0;
        let minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
        if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || minutes < 0) return null;

        if (minutes >= 60) {
            hours += Math.floor(minutes / 60);
            minutes = minutes % 60;
        }

        return hours * 3600 + minutes * 60;
    }

    const minutes = Number(normalized);
    if (Number.isFinite(minutes) && minutes >= 0) return Math.floor(minutes) * 60;
    return null;
}

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.floor(number) : fallback;
}

const allowedStartTiers = new Set(['bt', 'lt', 'ht']);
function parseManageIds(customId) {
    const parts = String(customId || '').split('_');
    if (parts.length < 5) return null;

    const recordId = Number(parts[2]);
    const characterId = Number(parts[3]);
    const ownerDiscordId = parts[4];
    if (!Number.isFinite(recordId) || recordId < 1 || !Number.isFinite(characterId) || characterId < 1 || !ownerDiscordId) {
        return null;
    }

    return { recordId, characterId, ownerDiscordId };
}

async function loadEditableAdventure(interaction, adventureId, characterId) {
    const locale = await resolveInteractionLocale(interaction);
    const adventure = await findAdventureForDiscord(interaction.user, adventureId);
    if (!adventure || Number(adventure.character_id) !== characterId) {
        await updateManageMessage(interaction, { content: t('characters.adventureNotFound', {}, locale), flags: MessageFlags.Ephemeral });
        return null;
    }

    if (adventure.is_pseudo) {
        await updateManageMessage(interaction, {
            content: t('characters.pseudoAdventureNotEditable', {}, locale),
            flags: MessageFlags.Ephemeral,
        });
        return null;
    }

    return adventure;
}

function creationStateKey(userId) {
    return String(userId);
}

function touchCreationState(state) {
    if (!state) {
        return state;
    }

    state.updatedAt = Date.now();
    return state;
}

function isCreationStateExpired(state) {
    const updatedAt = Number(state?.updatedAt || 0);
    if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
        return false;
    }

    return Date.now() - updatedAt > characterCreationTtlMs;
}

function getCreationState(userId, { allowExpired = false } = {}) {
    const key = creationStateKey(userId);
    const state = pendingCharacterCreations.get(key) || null;
    if (!state) {
        return null;
    }

    if (!allowExpired && isCreationStateExpired(state)) {
        pendingCharacterCreations.delete(key);
        return null;
    }

    return state;
}

function setCreationState(userId, state) {
    pendingCharacterCreations.set(creationStateKey(userId), touchCreationState(state));
}

function clearCreationState(userId) {
    pendingCharacterCreations.delete(creationStateKey(userId));
}

function adventureCreationKey(userId) {
    return String(userId);
}

function getAdventureCreationState(userId) {
    return pendingAdventureCreations.get(adventureCreationKey(userId)) || null;
}

function setAdventureCreationState(userId, state) {
    pendingAdventureCreations.set(adventureCreationKey(userId), state);
}

function clearAdventureCreationState(userId) {
    pendingAdventureCreations.delete(adventureCreationKey(userId));
}

function downtimeCreationKey(userId) {
    return String(userId);
}

function getDowntimeCreationState(userId) {
    return pendingDowntimeCreations.get(downtimeCreationKey(userId)) || null;
}

function setDowntimeCreationState(userId, state) {
    pendingDowntimeCreations.set(downtimeCreationKey(userId), state);
}

function clearDowntimeCreationState(userId) {
    pendingDowntimeCreations.delete(downtimeCreationKey(userId));
}

function createAdventureState({ ownerDiscordId, characterId, mode = 'create', adventureId = null }) {
    return {
        ownerDiscordId: String(ownerDiscordId),
        characterId: Number(characterId),
        mode,
        adventureId: adventureId ? Number(adventureId) : null,
        step: 'duration',
        data: {
            durationSeconds: 10800,
            startDate: formatLocalIsoDate(),
            title: '',
            gameMaster: '',
            hasAdditionalBubble: false,
            notes: '',
            allyIds: [],
            guildCharacterIds: [],
        },
        promptMessage: null,
        promptInteraction: null,
    };
}

function createDowntimeState({ ownerDiscordId, characterId, mode = 'create', downtimeId = null }) {
    return {
        ownerDiscordId: String(ownerDiscordId),
        characterId: Number(characterId),
        mode,
        downtimeId: downtimeId ? Number(downtimeId) : null,
        step: 'duration',
        data: {
            durationSeconds: null,
            startDate: formatLocalIsoDate(),
            type: 'other',
            notes: '',
        },
        promptMessage: null,
        promptInteraction: null,
    };
}

const adventureCreationSteps = ['duration', 'date', 'title', 'quest', 'notes', 'participants', 'confirm'];

const downtimeCreationSteps = ['duration', 'date', 'type', 'notes', 'confirm'];

function getAdventurePreviousStep(stepKey) {
    const index = adventureCreationSteps.indexOf(stepKey);
    if (index <= 0) return 'duration';
    return adventureCreationSteps[index - 1];
}

function getAdventureNextStep(stepKey) {
    const index = adventureCreationSteps.indexOf(stepKey);
    if (index < 0 || index >= adventureCreationSteps.length - 1) return 'confirm';
    return adventureCreationSteps[index + 1];
}

function getDowntimePreviousStep(stepKey) {
    const index = downtimeCreationSteps.indexOf(stepKey);
    if (index <= 0) return 'duration';
    return downtimeCreationSteps[index - 1];
}

function getDowntimeNextStep(stepKey) {
    const index = downtimeCreationSteps.indexOf(stepKey);
    if (index < 0 || index >= downtimeCreationSteps.length - 1) return 'confirm';
    return downtimeCreationSteps[index + 1];
}

async function buildAdventureStepPayload({ interaction, state, message }) {
    const locale = state?.locale || null;
    const step = state.step;
    const { characterId } = state;
    const ownerDiscordId = state.ownerDiscordId;
    const searchKey = `create-${characterId}`;
    let participantsLabel = undefined;
    let participantOptions = [];
    let participantTotal = 0;

    let allParticipantOptions = [];
    if (step === 'participants' || step === 'confirm') {
        const [allies, guildCharacters] = await Promise.all([
            listAlliesForDiscord(interaction.user, characterId),
            listGuildCharactersForDiscord(interaction.user, characterId),
        ]);
        const search = getParticipantSearch(searchKey, ownerDiscordId);
        const fullOptions = buildParticipantOptions({
            allies,
            guildCharacters,
            selectedAllyIds: state.data.allyIds,
            selectedGuildCharacterIds: state.data.guildCharacterIds,
            search: '',
        });
        allParticipantOptions = buildParticipantOptions({
            allies,
            guildCharacters,
            selectedAllyIds: state.data.allyIds,
            selectedGuildCharacterIds: state.data.guildCharacterIds,
            search,
        });
        participantTotal = fullOptions.length;
        const selectedParticipants = fullOptions
            .filter(option => option.selected)
            .map(option => ({ name: option.label }));
        if (selectedParticipants.length > 0) {
            participantsLabel = formatParticipantList(selectedParticipants);
        }
        participantOptions = allParticipantOptions;
    }

    if (step === 'duration') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || t('characters.chooseAdventureDuration', {}, locale), participantsLabel)],
            components: buildAdventureDurationRows(state),
        };
    }

    if (step === 'date') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || t('characters.chooseAdventureDate', {}, locale), participantsLabel)],
            components: buildAdventureDateRows(state),
        };
    }

    if (step === 'title') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || t('characters.chooseAdventureTitleAndGm', {}, locale), participantsLabel)],
            components: buildAdventureTitleRows(state),
        };
    }

    if (step === 'quest') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || t('characters.chooseAdventureQuest', {}, locale), participantsLabel)],
            components: buildAdventureQuestRows(state),
        };
    }

    if (step === 'notes') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || t('characters.chooseAdventureNotes', {}, locale), participantsLabel)],
            components: buildAdventureNotesRows(state),
        };
    }

    if (step === 'participants') {
        const search = getParticipantSearch(searchKey, ownerDiscordId);
        const totalCount = participantTotal;
        const visibleCount = Math.min(25, participantOptions.length);
        const baseMessage = message || t('characters.chooseAdventureParticipants', {}, locale);
        const participantsMessage = baseMessage;
        let footerNote = undefined;
        if (search) {
            footerNote = t('characters.participantsFilterFooter', { search, shown: visibleCount, total: participantOptions.length }, locale);
        } else if (totalCount > 25) {
            footerNote = t('characters.participantsShowingFooter', { shown: visibleCount, total: totalCount }, locale);
        }
        const components = buildAdventureParticipantsRows(state, participantOptions);
        return {
            embeds: [buildAdventureStepEmbed(step, state, participantsMessage, participantsLabel, footerNote)],
            components,
        };
    }

    return {
        embeds: [buildAdventureStepEmbed(step, state, message || t('characters.confirmAdventureDetails', {}, locale), participantsLabel)],
        components: buildAdventureConfirmRows(state),
    };
}

async function updateAdventureMessage(state, payload) {
    const activeInteraction = state?.activeInteraction;
    const isModalSubmit = activeInteraction?.isModalSubmit?.();
    const isMessageComponent = activeInteraction?.isMessageComponent?.();

    if (isModalSubmit && !activeInteraction.deferred && !activeInteraction.replied) {
        await activeInteraction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    if (state?.promptMessage?.editable) {
        try {
            await state.promptMessage.edit(payload);
            if (isModalSubmit && (activeInteraction.deferred || activeInteraction.replied)) {
                await activeInteraction.deleteReply().catch(() => undefined);
            }
            return true;
        } catch {
            // fall through
        }
    }

    if (!state?.promptMessage && state?.promptMessageId && state?.promptChannelId && state?.promptInteraction?.client) {
        try {
            const channel = await state.promptInteraction.client.channels.fetch(state.promptChannelId);
            if (channel?.isTextBased?.()) {
                const message = await channel.messages.fetch(state.promptMessageId);
                if (message) {
                    state.promptMessage = message;
                    await message.edit(payload);
                    if (isModalSubmit && (activeInteraction.deferred || activeInteraction.replied)) {
                        await activeInteraction.deleteReply().catch(() => undefined);
                    }
                    return true;
                }
            }
        } catch {
            // fall through
        }
    }

    if (isMessageComponent) {
        try {
            await activeInteraction.update(payload);
            return true;
        } catch {
            // fall through
        }
    }

    if (state?.promptInteraction?.isMessageComponent?.()) {
        try {
            await state.promptInteraction.update(payload);
            return true;
        } catch {
            // fall through
        }
    }

    if (state?.promptInteraction?.isRepliable?.()) {
        try {
            await state.promptInteraction.editReply(payload);
            if (isModalSubmit && (activeInteraction?.deferred || activeInteraction?.replied)) {
                await activeInteraction.deleteReply().catch(() => undefined);
            }
            return true;
        } catch {
            // fall through
        }
    }

    return false;
}

function ensurePromptMessage(state, interaction) {
    if (!state) return;
    touchCreationState(state);
    state.activeInteraction = interaction;
    if (!state.promptMessage && interaction?.message) {
        state.promptMessage = interaction.message;
        state.promptMessageId = interaction.message.id;
        state.promptChannelId = interaction.message.channelId;
    }
    if (!state.promptInteraction && interaction?.isRepliable?.()) {
        state.promptInteraction = interaction;
    }
}

async function updateCreationMessage(state, payload) {
    touchCreationState(state);
    if (state?.promptMessage?.editable) {
        try {
            await state.promptMessage.edit(payload);
            return true;
        } catch {
            // fall through to interaction-based update
        }
    }

    await updateCreationReply(state, payload);
    return false;
}

const insecureAgent = new Agent({
    connect: {
        rejectUnauthorized: false,
    },
});

let insecureTlsEnabled = false;

function shouldAllowInsecure(urlString) {
    try {
        const url = new URL(urlString);
        const host = url.hostname.toLowerCase();
        return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.test');
    } catch {
        return false;
    }
}

function enableInsecureTlsIfNeeded(urlString) {
    if (!shouldAllowInsecure(urlString) || insecureTlsEnabled) return;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    insecureTlsEnabled = true;
    console.warn('[bot] Local TLS verification disabled for bot HTTP requests.');
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]);

function describeAvatarUploadIssue(reason) {
    if (reason === 'avatar_too_large') {
        return 'Upload failed: file is too large (max 5 MB). Accepted: JPG, PNG, GIF, WEBP.';
    }
    if (reason === 'avatar_not_image') {
        return 'Upload failed: file must be an image (JPG, PNG, GIF, WEBP).';
    }
    if (reason === 'avatar_fetch_failed') {
        return 'Upload failed: could not download the file. Please try again.';
    }
    if (reason === 'config_missing') {
        return 'Upload is temporarily unavailable. Please try again later.';
    }
    return 'Upload failed. Please try again.';
}

function validateAvatarAttachment(attachment) {
    if (!attachment) {
        return { ok: false, reason: 'avatar_not_image' };
    }

    const size = Number(attachment.size || 0);
    if (Number.isFinite(size) && size > AVATAR_MAX_BYTES) {
        return { ok: false, reason: 'avatar_too_large' };
    }

    const contentType = String(attachment.contentType || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/')) {
        return { ok: false, reason: 'avatar_not_image' };
    }

    if (contentType && !AVATAR_ALLOWED_TYPES.has(contentType)) {
        return { ok: false, reason: 'avatar_not_image' };
    }

    return { ok: true };
}

async function storeCharacterAvatar(characterId, avatarUrl) {
    const appUrls = resolveApiBaseUrls();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!characterId || !avatarUrl) {
        console.warn('[bot] Avatar upload skipped: missing character id or avatar url.');
        return { ok: false, reason: 'missing_input' };
    }
    if (appUrls.length === 0 || !token) {
        console.warn('[bot] Avatar upload skipped: BOT_APP_URL/BOT_PUBLIC_APP_URL or BOT_HTTP_TOKEN missing.');
        return { ok: false, reason: 'config_missing' };
    }

    for (const appUrl of appUrls) {
        try {
            const endpoint = `${appUrl}/bot/character-avatars`;
            enableInsecureTlsIfNeeded(endpoint);
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Bot-Token': token,
                },
                body: JSON.stringify({
                    character_id: characterId,
                    avatar_url: avatarUrl,
                }),
                dispatcher: shouldAllowInsecure(endpoint) ? insecureAgent : undefined,
                redirect: 'manual',
            };

            let response = await fetch(endpoint, requestOptions);
            if ([301, 302, 307, 308].includes(response.status)) {
                const location = response.headers.get('location');
                if (location) {
                    const redirected = new URL(location, endpoint).toString();
                    enableInsecureTlsIfNeeded(redirected);
                    response = await fetch(redirected, {
                        ...requestOptions,
                        dispatcher: shouldAllowInsecure(redirected) ? insecureAgent : requestOptions.dispatcher,
                    });
                }
            }

            const contentType = String(response.headers.get('content-type') || '');

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                const preview = text.length > 300 ? `${text.slice(0, 300)}...` : text;
                console.warn(`[bot] Avatar upload failed (${response.status}). content-type=${contentType} body=${preview}`);
                if (response.status === 413) {
                    return { ok: false, reason: 'avatar_too_large', status: response.status };
                }
                if (contentType.includes('application/json')) {
                    try {
                        const payload = JSON.parse(text);
                        if (payload?.error) {
                            return { ok: false, reason: payload.error, status: response.status };
                        }
                    } catch {
                        // ignore JSON parse error
                    }
                }
                return { ok: false, reason: 'upload_failed', status: response.status };
            }

            if (!contentType.includes('application/json')) {
                const text = await response.text().catch(() => '');
                const preview = text.length > 300 ? `${text.slice(0, 300)}...` : text;
                console.warn(`[bot] Avatar upload unexpected response. content-type=${contentType} body=${preview}`);
                return { ok: false, reason: 'upload_failed' };
            }

            const payload = await response.json().catch(() => null);
            if (payload?.avatar_path) {
                return { ok: true, avatarPath: payload.avatar_path };
            }
            return { ok: true };
        } catch (error) {
            const code = error?.cause?.code || error?.code;
            if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                console.warn('[bot] Avatar upload TLS error. Endpoint:', `${appUrl}/bot/character-avatars`);
            }

            console.warn('[bot] Avatar upload error.', error);
        }
    }

    return { ok: false, reason: 'upload_failed' };
}

async function syncCharacterApprovalAnnouncement(characterId) {
    const appUrls = resolveApiBaseUrls();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (appUrls.length === 0 || !token) {
        console.warn('[bot] Character approval sync skipped: BOT_APP_URL/BOT_PUBLIC_APP_URL or BOT_HTTP_TOKEN missing.');
        return { ok: false, reason: 'config_missing' };
    }

    for (const appUrl of appUrls) {
        const endpoint = `${appUrl.replace(/\/$/, '')}/bot/character-approvals/sync`;
        enableInsecureTlsIfNeeded(endpoint);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Token': token,
                },
                body: JSON.stringify({ character_id: characterId }),
                dispatcher: shouldAllowInsecure(endpoint) ? insecureAgent : undefined,
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                const preview = text.length > 300 ? `${text.slice(0, 300)}...` : text;
                console.warn(`[bot] Character approval sync failed (${response.status}). ${preview}`);
                return { ok: false, status: response.status };
            }

            return { ok: true };
        } catch (error) {
            console.warn('[bot] Character approval sync error.', error);
        }
    }

    return { ok: false, reason: 'sync_failed' };
}

async function deleteLinkedAccountViaBot(discordUserId) {
    const appUrls = resolveApiBaseUrls();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (appUrls.length === 0 || !token) {
        console.warn('[bot] Account delete skipped: BOT_APP_URL/BOT_PUBLIC_APP_URL or BOT_HTTP_TOKEN missing.');
        return { ok: false, reason: 'config_missing' };
    }

    for (const appUrl of appUrls) {
        const endpoint = `${appUrl.replace(/\/$/, '')}/bot/account`;
        enableInsecureTlsIfNeeded(endpoint);

        try {
            const response = await fetch(endpoint, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Token': token,
                },
                body: JSON.stringify({
                    actor_discord_id: String(discordUserId),
                }),
                dispatcher: shouldAllowInsecure(endpoint) ? insecureAgent : undefined,
            });

            if (response.ok) {
                return { ok: true };
            }

            let detail = '';
            try {
                const payload = await response.json();
                detail = payload?.error || payload?.message || '';
            } catch {
                detail = '';
            }

            return {
                ok: false,
                status: response.status,
                reason: detail || 'delete_failed',
            };
        } catch (error) {
            console.warn('[bot] Account delete error.', error);
        }
    }

    return { ok: false, reason: 'delete_failed' };
}

async function updateCharacterForDiscordAndSync(discordUser, characterId, payload) {
    const result = await updateCharacterForDiscord(discordUser, characterId, payload);
    if (result.ok) {
        await syncCharacterApprovalAnnouncement(characterId);
    }
    return result;
}

async function updateCharacterBubbleShopForDiscordAndSync(discordUser, characterId, payload) {
    const result = await updateCharacterBubbleShopForDiscord(discordUser, characterId, payload);
    if (result.ok) {
        await syncCharacterApprovalAnnouncement(characterId);
    }
    return result;
}

async function showCreationError(interaction, state, ownerDiscordId, message) {
    state.step = 'basic';
    const payload = {
        embeds: [buildCreationBasicsEmbed(state, message)],
        components: buildCreationBasicsRows(ownerDiscordId),
    };
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await updateCreationMessage(state, payload);
    await interaction.deleteReply().catch(() => undefined);
}

function setCreationPromptTarget(state, interaction) {
    if (!state || !interaction) {
        return;
    }

    touchCreationState(state);
    state.promptInteraction = interaction;
    if (interaction.message) {
        state.promptMessage = interaction.message;
        state.promptMessageId = interaction.message.id;
        state.promptChannelId = interaction.message.channelId;
    }
}

async function buildCreationStepPayload(state, ownerDiscordId, message = null) {
    const locale = state?.locale || null;

    if (state.step === 'basic') {
        return {
            embeds: [buildCreationBasicsEmbed(state, message || t('characters.createBasicsDescription', {}, locale))],
            components: buildCreationBasicsRows(ownerDiscordId, locale),
            content: '',
        };
    }

    if (state.step === 'avatar') {
        return {
            embeds: [buildAvatarStepEmbed(state, message || undefined)],
            components: [
                buildAvatarUploadRow(ownerDiscordId, locale),
                ...buildCreationStepActionRows(ownerDiscordId, 'avatar', locale),
            ],
            content: '',
        };
    }

    if (state.step === 'classes') {
        const classes = await listCharacterClassesForDiscord();

        return {
            embeds: [
                buildCreationEmbed(3, t('characters.createClassesTitle', {}, locale), message || t('characters.createClassesDescription', {}, locale)),
            ],
            components: [
                buildClassesRow({ ownerDiscordId, classes, selectedIds: state.data.classIds || [] }),
                ...buildCreationStepActionRows(ownerDiscordId, 'classes', locale),
            ],
            content: '',
        };
    }

    if (state.step === 'tier') {
        return {
            embeds: [
                buildCreationEmbed(4, t('characters.createTierTitle', {}, locale), message || t('characters.createTierDescription', {}, locale)),
            ],
            components: [
                buildStartTierRow(ownerDiscordId, getStartTierSelection(state)),
                ...buildCreationStepActionRows(ownerDiscordId, 'tier', locale),
            ],
            content: '',
        };
    }

    if (state.step === 'faction') {
        return {
            embeds: [
                buildCreationEmbed(5, t('characters.createFactionTitle', {}, locale), message || t('characters.createFactionDescription', {}, locale)),
            ],
            components: [
                buildFactionRow(ownerDiscordId, state.data.faction),
                ...buildCreationStepActionRows(ownerDiscordId, 'faction', locale),
            ],
            content: '',
        };
    }

    if (state.step === 'version') {
        return {
            embeds: [
                buildCreationEmbed(6, t('characters.createVersionTitle', {}, locale), message || t('characters.createVersionDescription', {}, locale)),
            ],
            components: [
                buildVersionRow(ownerDiscordId, state.data.version),
                ...buildCreationStepActionRows(ownerDiscordId, 'version', locale),
            ],
            content: '',
        };
    }

    if (state.step === 'finalize') {
        return {
            embeds: [
                buildCreationEmbed(7, t('characters.createFinalizeTitle', {}, locale), message || t('characters.createFinalizeDescription', {}, locale)),
                await buildCreationSummaryEmbed(state),
            ],
            components: buildCreationConfirmRows(ownerDiscordId, locale),
            content: '',
        };
    }

    return {
        embeds: [buildCreationEmbed(1, t('characters.createTitle', {}, locale), message || t('characters.createUnknownStep', {}, locale))],
        components: [buildCreationCancelRow(ownerDiscordId)],
        content: '',
    };
}

async function finalizeCharacterCreation(state) {
    const { data, ownerDiscordId } = state;
    if (!data.name || !data.externalLink || !data.startTier || !data.version || !data.guildStatus || !Array.isArray(data.classIds) || data.classIds.length === 0) {
        await updateCreationMessage(state, {
            content: t('characters.createIncomplete', {}, state.locale),
            embeds: [],
            components: [],
        });
        clearCreationState(state.userId);
        return;
    }

    const isRemoteAvatar = Boolean(data.avatar && isHttpUrl(data.avatar));
    const initialAvatar = isRemoteAvatar ? null : data.avatar;

    const result = await createCharacterForDiscord(state.promptInteraction.user, {
        name: data.name,
        startTier: data.startTier,
        externalLink: data.externalLink,
        notes: data.notes,
        avatar: initialAvatar,
        faction: data.faction ?? 'none',
        version: data.version ?? '2024',
        isFiller: data.isFiller,
        guildStatus: data.guildStatus,
        classIds: data.classIds,
    });

    clearCreationState(state.userId);

    if (!result.ok) {
        await updateCreationMessage(state, {
            content: t('characters.createFailed', {}, state.locale),
            embeds: [],
            components: [],
        });
        return;
    }

    if (result.id && isRemoteAvatar) {
        const avatarResult = await storeCharacterAvatar(result.id, data.avatar);
        if (avatarResult?.ok && typeof avatarResult.avatarPath === 'string') {
            data.avatar = avatarResult.avatarPath;
        }
    }

    if (result.id) {
        await syncCharacterApprovalAnnouncement(result.id);
    }

    const character = await findCharacterForDiscord(state.promptInteraction.user, result.id);
    if (!character) {
        await updateCreationMessage(state, {
            content: t('characters.createSuccessFallback', {}, state.locale),
            embeds: [],
            components: [],
        });
        return;
    }

    await updateCreationMessage(state, {
        ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
        content: '',
    });
}

async function handleCreationAvatarMessage(message) {
    if (!message || message.author?.bot) return false;
    const ownerDiscordId = message.author.id;
    const state = getCreationState(ownerDiscordId);
    if (!state || state.step !== 'avatar') return false;
    if (message.guildId) return false;

    const attachments = [...message.attachments.values()];
    const attachment = attachments.find(item => String(item.contentType || '').startsWith('image/')) || attachments[0];
    if (!attachment?.url) return false;

    const validation = validateAvatarAttachment(attachment);
    if (!validation.ok) {
        await message.delete().catch(() => undefined);

        const payload = {
            embeds: [buildAvatarStepEmbed(state, describeAvatarUploadIssue(validation.reason))],
            components: [
                buildAvatarUploadRow(ownerDiscordId, state.locale),
                ...buildCreationStepActionRows(ownerDiscordId, 'avatar', state.locale),
            ],
            content: '',
        };

        await updateCreationMessage(state, payload);
        return true;
    }

    state.data.avatar = attachment.url;
    await message.delete().catch(() => undefined);

    const payload = {
        embeds: [buildAvatarStepEmbed(state, t('characters.createAvatarSaved', {}, state.locale))],
        components: [
            buildAvatarUploadRow(ownerDiscordId, state.locale),
            ...buildCreationStepActionRows(ownerDiscordId, 'avatar', state.locale),
        ],
        content: '',
    };

    await updateCreationMessage(state, payload);
    return true;
}

async function handleAvatarUpdateMessage(message) {
    if (!message || message.author?.bot) return false;
    if (message.guildId) return false;

    const state = getAvatarUpdateState(message.author.id);
    if (!state) return false;

    const attachments = [...message.attachments.values()];
    const attachment = attachments.find(item => String(item.contentType || '').startsWith('image/')) || attachments[0];
    if (!attachment?.url) return false;

    await message.delete().catch(() => undefined);

    const validation = validateAvatarAttachment(attachment);
    if (!validation.ok) {
        if (state.promptMessage?.editable) {
            await state.promptMessage.edit({
                content: describeAvatarUploadIssue(validation.reason),
            }).catch(() => undefined);
        }
        return true;
    }

    const storedAvatar = await storeCharacterAvatar(state.characterId, attachment.url);

    if (!state.promptMessage?.editable) {
        clearAvatarUpdateState(message.author.id);
        return true;
    }

    if (!storedAvatar?.ok) {
        await state.promptMessage.edit({
            content: describeAvatarUploadIssue(storedAvatar?.reason),
        }).catch(() => undefined);
        return true;
    }

    await syncCharacterApprovalAnnouncement(state.characterId);

    clearAvatarUpdateState(message.author.id);

    const character = await findCharacterForDiscord(message.author, state.characterId);
    if (!character) {
        await state.promptMessage.edit({ content: 'Character not found.' }).catch(() => undefined);
        return true;
    }

    await state.promptMessage.edit({
        ...buildCharacterManageView(character, { ownerDiscordId: state.ownerDiscordId, locale: state.locale || await getLinkedUserLocaleForDiscord(message.author) }),
        content: '',
    }).catch(() => undefined);
    return true;
}

async function updateDowntimeMessage(state, payload) {
    const activeInteraction = state?.activeInteraction;
    const isModalSubmit = activeInteraction?.isModalSubmit?.();
    const isMessageComponent = activeInteraction?.isMessageComponent?.();

    if (isModalSubmit && !activeInteraction.deferred && !activeInteraction.replied) {
        await activeInteraction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    if (state?.promptMessage?.editable) {
        try {
            await state.promptMessage.edit(payload);
            if (isModalSubmit && (activeInteraction.deferred || activeInteraction.replied)) {
                await activeInteraction.deleteReply().catch(() => undefined);
            }
            return true;
        } catch {
            // fall through
        }
    }

    if (!state?.promptMessage && state?.promptMessageId && state?.promptChannelId && state?.promptInteraction?.client) {
        try {
            const channel = await state.promptInteraction.client.channels.fetch(state.promptChannelId);
            if (channel?.isTextBased?.()) {
                const message = await channel.messages.fetch(state.promptMessageId);
                if (message) {
                    state.promptMessage = message;
                    await message.edit(payload);
                    if (isModalSubmit && (activeInteraction.deferred || activeInteraction.replied)) {
                        await activeInteraction.deleteReply().catch(() => undefined);
                    }
                    return true;
                }
            }
        } catch {
            // fall through
        }
    }

    if (isMessageComponent) {
        try {
            await activeInteraction.update(payload);
            return true;
        } catch {
            // fall through
        }
    }

    if (state?.promptInteraction?.isRepliable?.()) {
        await state.promptInteraction.editReply(payload);
        if (isModalSubmit && (activeInteraction?.deferred || activeInteraction?.replied)) {
            await activeInteraction.deleteReply().catch(() => undefined);
        }
        return true;
    }

    return false;
}

async function buildDowntimeStepPayload({ state, message }) {
    const locale = state?.locale || null;
    const step = state.step;
    const descriptionMap = {
        duration: t('characters.chooseDowntimeDuration', {}, locale),
        date: t('characters.chooseDowntimeDate', {}, locale),
        type: t('characters.chooseDowntimeType', {}, locale),
        notes: t('characters.chooseDowntimeNotes', {}, locale),
        confirm: t('characters.confirmDowntimeDetails', {}, locale),
    };
    const description = message || descriptionMap[step] || t('common.next', {}, locale);

    if (step === 'duration') {
        return {
            embeds: [buildDowntimeStepEmbed(step, state, description)],
            components: buildDowntimeDurationRows(state),
        };
    }
    if (step === 'date') {
        return {
            embeds: [buildDowntimeStepEmbed(step, state, description)],
            components: buildDowntimeDateRows(state),
        };
    }
    if (step === 'type') {
        return {
            embeds: [buildDowntimeStepEmbed(step, state, description)],
            components: buildDowntimeTypeRows(state),
        };
    }
    if (step === 'notes') {
        return {
            embeds: [buildDowntimeStepEmbed(step, state, description)],
            components: buildDowntimeNotesRows(state),
        };
    }

    return {
        embeds: [buildDowntimeStepEmbed(step, state, description)],
        components: buildDowntimeConfirmRows(state),
    };
}

async function refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId }) {
    const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
    if (!adventure || Number(adventure.character_id) !== characterId) {
        await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.adventureNotFound'), embeds: [], components: [] });
        return true;
    }

    adventure.locale = await resolveInteractionLocale(interaction);
    const view = buildAdventureManageView({ adventure, participants, ownerDiscordId, characterId });
    await updateManageMessage(interaction, { content: '', embeds: [view.embed], components: view.components });
    return true;
}

async function refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId }) {
    const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
    if (!downtime || Number(downtime.character_id) !== characterId) {
        await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), embeds: [], components: [] });
        return true;
    }

    downtime.locale = await resolveInteractionLocale(interaction);
    const view = buildDowntimeManageView({ downtime, ownerDiscordId, characterId });
    await updateManageMessage(interaction, { content: '', embeds: [view.embed], components: view.components });
    return true;
}

async function getAdventureWithParticipants(interaction, adventureId) {
    const adventure = await findAdventureForDiscord(interaction.user, adventureId);
    if (!adventure) return { adventure: null, participants: [] };
    const participants = await listAdventureParticipantsForDiscord(interaction.user, adventureId);
    return { adventure, participants };
}

async function handle(interaction) {
    await ensureLevelProgressionLoaded();

    if (interaction.isMessageComponent?.()) {
        setManageMessageTarget(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_new_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_new_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const existingState = getCreationState(ownerDiscordId, { allowExpired: true });
        if (existingState) {
            if (!isCreationStateExpired(existingState)) {
                if (existingState.step === 'basic') {
                    setCreationPromptTarget(existingState, interaction);
                    await interaction.showModal(buildCreationBasicModal(ownerDiscordId, existingState));
                    return true;
                }

                setCreationPromptTarget(existingState, interaction);
                const payload = await buildCreationStepPayload(
                    existingState,
                    ownerDiscordId,
                    t('characters.createExistingOpen', {}, existingState.locale),
                );
                await interaction.deferUpdate();
                await updateCreationMessage(existingState, payload);
                return true;
            }

            clearCreationState(ownerDiscordId);
        }

        const state = {
            userId: ownerDiscordId,
            ownerDiscordId,
            channelId: interaction.channelId,
            locale: await resolveInteractionLocale(interaction),
            step: 'basic',
            data: {
                name: '',
                externalLink: '',
                notes: '',
                avatar: '',
                classIds: [],
                isFiller: false,
                startTier: 'bt',
                version: '2024',
                faction: 'none',
                guildStatus: 'draft',
            },
            promptInteraction: interaction,
            promptMessage: interaction.message ?? null,
        };
        setCreationState(ownerDiscordId, state);

        await interaction.update({
            embeds: [buildCreationBasicsEmbed(
                state,
                existingState ? t('characters.createExpired', {}, state.locale) : t('characters.createBasicsStart', {}, state.locale),
            )],
            components: buildCreationBasicsRows(ownerDiscordId, state.locale),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_refresh_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_refresh_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        await interaction.deferUpdate().catch(() => undefined);
        const characters = await listCharactersForDiscord(interaction.user);
        const locale = await resolveInteractionLocale(interaction);
        const listView = buildCharacterListView({ ownerDiscordId, characters, locale });
        await updateManageMessage(interaction, { ...listView, content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_settings_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_settings_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const characters = await listCharactersForDiscord(interaction.user);
        const locale = await resolveInteractionLocale(interaction);
        const trackingDefault = await getLinkedUserTrackingDefaultForDiscord(interaction.user);
        const settingsView = buildCharactersSettingsView({ ownerDiscordId, characters, locale, selectedLocale: locale, trackingDefault });
        await interaction.update({ ...settingsView, content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_tracking-default-settings_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_tracking-default-settings_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        const trackingView = buildTrackingDefaultSelectionView({ ownerDiscordId, locale, source: 'settings' });
        await interaction.update({ ...trackingView, content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_language_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_language_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        const languageView = buildCharacterLanguageView({ ownerDiscordId, locale, selectedLocale: locale });
        await interaction.update({ ...languageView, content: '' });
        return true;
    }

    if (interaction.isButton() && /^charactersAction_locale_(de|en)_/.test(interaction.customId)) {
        const match = interaction.customId.match(/^charactersAction_locale_(de|en)_(.+)$/);
        if (!match) {
            return false;
        }

        const [, selectedLocale, ownerDiscordId] = match;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const persistedLocale = await updateLinkedUserLocaleForDiscord(interaction.user, selectedLocale);
        const characters = await listCharactersForDiscord(interaction.user);
        const settingsView = buildCharactersSettingsView({
            ownerDiscordId,
            characters,
            locale: persistedLocale,
            selectedLocale: persistedLocale,
        });
        await interaction.update({
            ...settingsView,
            content: t('characters.languageUpdated', { language: persistedLocale === 'en' ? 'English' : 'Deutsch' }, persistedLocale),
        });
        return true;
    }

    if (interaction.isButton() && /^charactersAction_tracking-default-(adventure|level)_(setup|settings)_/.test(interaction.customId)) {
        const match = interaction.customId.match(/^charactersAction_tracking-default-(adventure|level)_(setup|settings)_(.+)$/);
        if (!match) {
            return false;
        }

        const [, selectedMode, source, ownerDiscordId] = match;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        await updateLinkedUserTrackingDefaultForDiscord(interaction.user, selectedMode === 'level');
        const characters = await listCharactersForDiscord(interaction.user);
        const nextView = source === 'settings'
            ? buildCharactersSettingsView({
                ownerDiscordId,
                characters,
                locale,
                selectedLocale: locale,
                trackingDefault: selectedMode === 'level',
            })
            : buildCharacterListView({ ownerDiscordId, characters, locale });
        await interaction.update({
            ...nextView,
            content: t('characters.trackingDefaultSaved', {}, locale),
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_back_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_back_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const characters = await listCharactersForDiscord(interaction.user);
        const locale = await resolveInteractionLocale(interaction);
        const listView = buildCharacterListView({ ownerDiscordId, characters, locale });
        await interaction.update({ ...listView, content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_delete-account_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_delete-account_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const characters = await listCharactersForDiscord(interaction.user);
        const locale = await resolveInteractionLocale(interaction);
        const confirmView = buildDeleteAccountConfirmView({ ownerDiscordId, characters, locale });
        await interaction.update({ ...confirmView, content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_cancel-delete-account_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_cancel-delete-account_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const characters = await listCharactersForDiscord(interaction.user);
        const locale = await resolveInteractionLocale(interaction);
        const listView = buildCharacterListView({ ownerDiscordId, characters, locale });
        await interaction.update({ ...listView, content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_confirm-delete-account_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_confirm-delete-account_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        await interaction.deferUpdate().catch(() => undefined);
        const deleteResult = await deleteLinkedAccountViaBot(interaction.user.id);

        if (!deleteResult.ok) {
            const detail = deleteResult.reason === 'config_missing'
                ? 'Bot account deletion is temporarily unavailable.'
                : deleteResult.reason === 'Linked account not found.'
                    ? 'No linked app account was found for this Discord user.'
                    : 'Account could not be deleted. Please try again later or use the website.';
            const characters = await listCharactersForDiscord(interaction.user).catch(() => []);
            const locale = await resolveInteractionLocale(interaction);
            const confirmView = buildDeleteAccountConfirmView({ ownerDiscordId, characters, locale });
            await updateManageMessage(interaction, { ...confirmView, content: detail });
            return true;
        }

        await updateManageMessage(interaction, {
            content: `**Account deleted.**\n\n${notLinkedContent()}`,
            embeds: [],
            components: [buildNotLinkedButtons(interaction.user.id)],
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersSelect_')) {
        const ownerDiscordId = interaction.customId.replace('charactersSelect_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        await interaction.deferUpdate().catch(() => undefined);

        const selectedId = Number(interaction.values[0]);
        if (!Number.isFinite(selectedId) || selectedId < 1) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidSelection'), flags: MessageFlags.Ephemeral });
            return true;
        }

        let character;
        try {
            character = await findCharacterForDiscord(interaction.user, selectedId);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            throw error;
        }

        if (!character) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
            content: '',
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('charactersCreate_basic_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_basic_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.createNoActive'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const name = interaction.fields.getTextInputValue('createName').trim();
        const externalLink = interaction.fields.getTextInputValue('createLink').trim();
        const notes = interaction.fields.getTextInputValue('createNotes').trim();

        if (!name) {
            await showCreationError(interaction, state, ownerDiscordId, t('characters.createNameMissing', {}, state.locale));
            return true;
        }
        if (!isExternalCharacterLink(externalLink)) {
            await showCreationError(interaction, state, ownerDiscordId, t('characters.createInvalidLink', {}, state.locale));
            return true;
        }

        const hadPrompt = Boolean(state.promptInteraction);
        state.data.name = name;
        state.data.externalLink = externalLink;
        state.data.notes = notes;
        state.step = 'avatar';
        if (!hadPrompt) {
            state.promptInteraction = interaction;
        }

        const payload = {
            embeds: [
                buildAvatarStepEmbed(state),
            ],
            components: [
                buildAvatarUploadRow(ownerDiscordId),
                ...buildCreationStepActionRows(ownerDiscordId, 'avatar'),
            ],
        };

        if (hadPrompt) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            await updateCreationMessage(state, payload);
            await interaction.deleteReply().catch(() => undefined);
            return true;
        }

        await updateCreationMessage(state, payload);
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_cancel_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_cancel_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        clearCreationState(ownerDiscordId);
        try {
            const characters = await listCharactersForDiscord(interaction.user);
            const locale = await resolveInteractionLocale(interaction);
            const listView = buildCharacterListView({ ownerDiscordId, characters, locale });
            await interaction.update({ ...listView, content: '' });
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({
                    content: notLinkedContent(),
                    embeds: [],
                    components: [buildNotLinkedButtons(ownerDiscordId)],
                });
                return true;
            }
            throw error;
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersCreate_classes_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_classes_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.createNoActive'), flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.classIds = interaction.values.map(value => Number(value)).filter(value => Number.isFinite(value));
        state.step = 'classes';
        const classes = await listCharacterClassesForDiscord();

        await interaction.update({
            embeds: [
                buildCreationEmbed(3, t('characters.createClassesTitle', {}, state.locale), t('characters.createClassesDescription', {}, state.locale)),
            ],
            components: [
                buildClassesRow({ ownerDiscordId, classes, selectedIds: state.data.classIds || [] }),
                ...buildCreationStepActionRows(ownerDiscordId, 'classes'),
            ],
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersCreate_tier_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_tier_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.createNoActive'), flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        const value = interaction.values[0];
        if (value === 'filler') {
            state.data.isFiller = true;
            state.data.startTier = 'bt';
        } else if (allowedStartTiers.has(value)) {
            state.data.isFiller = false;
            state.data.startTier = value;
        }
        state.step = 'tier';

        await interaction.update({
            embeds: [
                buildCreationEmbed(4, t('characters.createTierTitle', {}, state.locale), t('characters.createTierDescription', {}, state.locale)),
            ],
            components: [
                buildStartTierRow(ownerDiscordId, getStartTierSelection(state)),
                ...buildCreationStepActionRows(ownerDiscordId, 'tier'),
            ],
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersCreate_faction_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_faction_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.createNoActive'), flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.faction = interaction.values[0];
        state.step = 'faction';

        await interaction.update({
            embeds: [
                buildCreationEmbed(5, t('characters.createFactionTitle', {}, state.locale), t('characters.createFactionDescription', {}, state.locale)),
            ],
            components: [
                buildFactionRow(ownerDiscordId, state.data.faction),
                ...buildCreationStepActionRows(ownerDiscordId, 'faction'),
            ],
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersCreate_version_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_version_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.version = interaction.values[0];
        state.step = 'version';

        await interaction.update({
            embeds: [
                buildCreationEmbed(6, 'Choose version', 'Choose the ruleset version.'),
            ],
            components: [
                buildVersionRow(ownerDiscordId, state.data.version),
                ...buildCreationStepActionRows(ownerDiscordId, 'version'),
            ],
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_confirm_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_confirm_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.promptInteraction = interaction;
        await interaction.deferUpdate();
        await finalizeCharacterCreation(state);
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_back_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_back_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.promptInteraction = interaction;

        if (state.step === 'finalize') {
            state.step = 'version';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(6, 'Choose version', 'Choose the ruleset version.'),
                ],
                components: [
                    buildVersionRow(ownerDiscordId, state.data.version),
                    ...buildCreationStepActionRows(ownerDiscordId, 'version'),
                ],
                content: '',
            });
            return true;
        }

        if (state.step === 'version') {
            if (state.data.isFiller || state.data.startTier === 'bt') {
                state.step = 'tier';
                await interaction.update({
                    embeds: [
                        buildCreationEmbed(4, 'Choose starting tier', 'Choose the starting tier or **Filler**.'),
                    ],
                    components: [
                        buildStartTierRow(ownerDiscordId, getStartTierSelection(state)),
                        ...buildCreationStepActionRows(ownerDiscordId, 'tier'),
                    ],
                    content: '',
                });
                return true;
            }

            state.step = 'faction';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(5, 'Choose faction', 'Choose the faction (optional).'),
                ],
                components: [
                    buildFactionRow(ownerDiscordId, state.data.faction),
                    ...buildCreationStepActionRows(ownerDiscordId, 'faction'),
                ],
                content: '',
            });
            return true;
        }

        if (state.step === 'faction') {
            state.step = 'tier';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(4, 'Choose starting tier', 'Choose the starting tier or **Filler**.'),
                ],
                components: [
                    buildStartTierRow(ownerDiscordId, getStartTierSelection(state)),
                    ...buildCreationStepActionRows(ownerDiscordId, 'tier'),
                ],
                content: '',
            });
            return true;
        }

        if (state.step === 'tier') {
            const classes = await listCharacterClassesForDiscord();
            state.step = 'classes';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(3, 'Choose classes', 'Choose one or more classes.'),
                ],
                components: [
                    buildClassesRow({ ownerDiscordId, classes, selectedIds: state.data.classIds || [] }),
                    ...buildCreationStepActionRows(ownerDiscordId, 'classes'),
                ],
                content: '',
            });
            return true;
        }

        if (state.step === 'classes') {
            state.step = 'avatar';
            await interaction.update({
                embeds: [buildAvatarStepEmbed(state)],
                components: buildCreationStepActionRows(ownerDiscordId, 'avatar'),
                content: '',
            });
            return true;
        }

        if (state.step === 'avatar' || state.step === 'basic') {
            state.step = 'basic';
            await interaction.update({
                embeds: [buildCreationBasicsEmbed(state)],
                components: buildCreationBasicsRows(ownerDiscordId),
                content: '',
            });
            return true;
        }

        await updateManageMessage(interaction, { content: 'No previous step available.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_next_')) {
        const suffix = interaction.customId.replace('charactersCreate_next_', '');
        const [stepKey, ownerDiscordId] = suffix.split('_');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        if (stepKey === 'avatar') {
            state.step = 'classes';
            const classes = await listCharacterClassesForDiscord();
            await interaction.update({
                embeds: [
                    buildCreationEmbed(3, 'Choose classes', 'Choose one or more classes.'),
                ],
                components: [
                    buildClassesRow({ ownerDiscordId, classes, selectedIds: state.data.classIds || [] }),
                    ...buildCreationStepActionRows(ownerDiscordId, 'classes'),
                ],
                content: '',
            });
            return true;
        }

        if (stepKey === 'classes') {
            const classes = await listCharacterClassesForDiscord();
            if (!Array.isArray(state.data.classIds) || state.data.classIds.length === 0) {
                await interaction.update({
                    embeds: [
                    buildCreationEmbed(3, 'Choose classes', 'Please choose at least one class.'),
                    ],
                    components: [
                        buildClassesRow({ ownerDiscordId, classes, selectedIds: state.data.classIds || [] }),
                        ...buildCreationStepActionRows(ownerDiscordId, 'classes'),
                    ],
                    content: '',
                });
                return true;
            }

            state.step = 'tier';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(4, 'Choose starting tier', 'Choose the starting tier or **Filler**.'),
                ],
                components: [
                    buildStartTierRow(ownerDiscordId, getStartTierSelection(state)),
                    ...buildCreationStepActionRows(ownerDiscordId, 'tier'),
                ],
                content: '',
            });
            return true;
        }

        if (stepKey === 'tier') {
            if (!state.data.startTier) {
                await interaction.update({
                    embeds: [
                        buildCreationEmbed(4, 'Choose starting tier', 'Please choose a starting tier or **Filler**.'),
                    ],
                    components: [
                        buildStartTierRow(ownerDiscordId, getStartTierSelection(state)),
                        ...buildCreationStepActionRows(ownerDiscordId, 'tier'),
                    ],
                    content: '',
                });
                return true;
            }

            if (state.data.startTier === 'bt' || state.data.isFiller) {
                state.data.faction = 'none';
                state.step = 'version';
                await interaction.update({
                    embeds: [
                        buildCreationEmbed(6, 'Choose version', 'Choose the ruleset version.'),
                    ],
                    components: [
                        buildVersionRow(ownerDiscordId, state.data.version),
                        ...buildCreationStepActionRows(ownerDiscordId, 'version'),
                    ],
                    content: '',
                });
                return true;
            }

            state.step = 'faction';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(5, 'Choose faction', 'Choose the faction (optional).'),
                ],
                components: [
                    buildFactionRow(ownerDiscordId, state.data.faction),
                    ...buildCreationStepActionRows(ownerDiscordId, 'faction'),
                ],
                content: '',
            });
            return true;
        }

        if (stepKey === 'faction') {
            if (!state.data.faction) {
                await interaction.update({
                    embeds: [
                        buildCreationEmbed(5, 'Choose faction', 'Please choose a faction.'),
                    ],
                components: [
                    buildFactionRow(ownerDiscordId, state.data.faction),
                    ...buildCreationStepActionRows(ownerDiscordId, 'faction'),
                ],
                    content: '',
                });
                return true;
            }

            state.step = 'version';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(6, 'Choose version', 'Choose the ruleset version.'),
                ],
                components: [
                    buildVersionRow(ownerDiscordId, state.data.version),
                    ...buildCreationStepActionRows(ownerDiscordId, 'version'),
                ],
                content: '',
            });
            return true;
        }

        if (stepKey === 'version') {
            if (!state.data.version) {
                await interaction.update({
                    embeds: [
                        buildCreationEmbed(6, 'Choose version', 'Please choose a ruleset version.'),
                    ],
                    components: [
                        buildVersionRow(ownerDiscordId, state.data.version),
                        ...buildCreationStepActionRows(ownerDiscordId, 'version'),
                    ],
                    content: '',
                });
                return true;
            }

            state.step = 'finalize';
            state.data.guildStatus = 'draft';
            const summary = await buildCreationSummaryEmbed(state);
            await interaction.update({
                embeds: [
                    buildCreationEmbed(7, 'Finalize', 'Please confirm the details.'),
                    summary,
                ],
                components: buildCreationConfirmRows(ownerDiscordId),
                content: '',
            });
            return true;
        }

        await updateManageMessage(interaction, { content: 'Unknown step.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_basicopen_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_basicopen_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        state.step = 'basic';
        ensurePromptMessage(state, interaction);
        await interaction.showModal(buildCreationBasicModal(ownerDiscordId, state));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_avatar_dm_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_avatar_dm_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await updateManageMessage(interaction, { content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        setCreationPromptTarget(state, interaction);

        try {
            const dm = await interaction.user.createDM();
            const sourceLink = state?.promptMessage?.url ? `\n${state.promptMessage.url}` : '';
            await dm.send(t('characters.createDmPrompt', { sourceLink }, state.locale));

            await interaction.deferUpdate();
            await updateCreationMessage(state, {
                embeds: [buildAvatarStepEmbed(state, t('characters.createDmSent', {}, state.locale))],
                components: [
                    buildAvatarUploadRow(ownerDiscordId, state.locale),
                    ...buildCreationStepActionRows(ownerDiscordId, 'avatar', state.locale),
                ],
                content: '',
            });
        } catch (error) {
            console.warn('[bot] Avatar DM could not be sent.', error);
            await interaction.deferUpdate();
            await updateCreationMessage(state, {
                embeds: [buildAvatarStepEmbed(state, t('characters.createDmFailed', {}, state.locale))],
                components: [
                    buildAvatarUploadRow(ownerDiscordId, state.locale),
                    ...buildCreationStepActionRows(ownerDiscordId, 'avatar', state.locale),
                ],
                content: '',
            });
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterClassesSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.deferUpdate();

        const classIds = interaction.values.map(value => Number(value)).filter(value => Number.isFinite(value));
        try {
            const result = await syncCharacterClassesForDiscord(interaction.user, characterId, classIds);
            if (!result.ok) {
                await updateManageMessage(interaction, { content: 'Classes konnten nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await syncCharacterApprovalAnnouncement(characterId);

            const character = await findCharacterForDiscord(interaction.user, characterId);
            if (!character) {
                await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.update({
                ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
                content: '',
            });
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            throw error;
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterFactionSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.deferUpdate();

        const faction = String(interaction.values[0] || '').trim().toLowerCase();
        if (!allowedFactions.has(faction)) {
            await updateManageMessage(interaction, { content: 'Invalid faction.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, { faction });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
            content: '',
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterBasicsModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const name = interaction.fields.getTextInputValue('basicName').trim();
        const url = interaction.fields.getTextInputValue('basicUrl').trim();
        const notes = interaction.fields.getTextInputValue('basicNotes') || '';

        if (!name) {
            await updateManageMessage(interaction, { content: 'Name fehlt.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isExternalCharacterLink(url)) {
            await updateManageMessage(interaction, {
                content: 'Please use a DnDBeyond character link (https://www.dndbeyond.com/characters/...).',
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, {
            name,
            externalLink: url,
            notes,
        });

        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterDmBubblesModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const dmBubbles = interaction.fields.getTextInputValue('dmBubbles');
        const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, { dmBubbles });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterDmCoinsModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const dmCoins = interaction.fields.getTextInputValue('dmCoins');
        const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, { dmCoins });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterBubbleShopModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const payload = {
            [TYPE_SKILL_PROFICIENCY]: interaction.fields.getTextInputValue(TYPE_SKILL_PROFICIENCY),
            [TYPE_RARE_LANGUAGE]: interaction.fields.getTextInputValue(TYPE_RARE_LANGUAGE),
            [TYPE_TOOL_OR_LANGUAGE]: interaction.fields.getTextInputValue(TYPE_TOOL_OR_LANGUAGE),
            [TYPE_DOWNTIME]: interaction.fields.getTextInputValue(TYPE_DOWNTIME),
        };
        const result = await updateCharacterBubbleShopForDiscordAndSync(interaction.user, characterId, payload);
        if (!result.ok) {
            const content = result.reason === 'invalid_quantity'
                ? `Ungueltiger Bubble-Shop-Wert fuer ${result.type}. Maximal erlaubt: ${result.max}.`
                : result.reason === 'bubble_shop_floor'
                    ? 'Bubble-Shop-Ausgaben duerfen den Charakter nicht unter sein aktuelles Level druecken.'
                : 'Character not found.';
            await updateManageMessage(interaction, { content, flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterManualLevelModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!character.simplified_tracking) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.setLevelOnlySimplified'), flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!canCharacterLogActivity(character)) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registerFirst'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const rawLevel = interaction.fields.getTextInputValue('manualLevel');
        const parsedLevel = Number(rawLevel);
        const level = Number.isFinite(parsedLevel) ? Math.floor(parsedLevel) : NaN;
        if (!Number.isFinite(level) || level < 1 || level > 20) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.levelBetweenOneAndTwenty'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const rawBubbles = interaction.fields.getTextInputValue('manualBubblesInLevel');
        const bubblesInLevel = rawBubbles.trim() === '' ? 0 : Math.max(0, Math.floor(Number(rawBubbles) || 0));

        const result = await updateCharacterManualLevelForDiscord(interaction.user, characterId, level, bubblesInLevel);
        if (!result.ok) {
            if (result.reason === 'below_real' && result.minLevel) {
                await updateManageMessage(interaction, {
                    content: await translateInteraction(interaction, 'characters.levelCannotBeBelowReal', { level: result.minLevel }),
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const refreshed = await findCharacterForDiscord(interaction.user, characterId);
        if (!refreshed) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterUpdated'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...buildCharacterManageView(refreshed, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterManualAdventuresModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }
        const raw = interaction.fields.getTextInputValue('manualAdventuresCount').trim();
        const adventuresCount = raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0));
        await updateCharacterManualOverridesForDiscord(interaction.user, characterId, { adventuresCount });
        const refreshed = await findCharacterForDiscord(interaction.user, characterId);
        if (!refreshed) return true;
        await updateManageMessage(interaction, {
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, refreshed, ownerDiscordId)),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterManualFactionModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }
        const raw = interaction.fields.getTextInputValue('manualFactionRank').trim();
        const factionRank = raw === '' ? null : Math.max(0, Math.floor(Number(raw) || 0));
        await updateCharacterManualOverridesForDiscord(interaction.user, characterId, { factionRank });
        const refreshed = await findCharacterForDiscord(interaction.user, characterId);
        if (!refreshed) return true;
        await updateManageMessage(interaction, {
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, refreshed, ownerDiscordId)),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterRegisterNoteModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            return false;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isCharacterStatusSwitchEnabled) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registrationDisabled'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const status = String(character.guild_status || '').trim().toLowerCase();
        if (status !== 'draft' && status !== 'needs_changes') {
            await updateManageMessage(interaction, {
                ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const registrationState = await getCharacterSubmissionStateForDiscord(interaction.user, characterId);
        if (!registrationState.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registerFailed'), flags: MessageFlags.Ephemeral });
            return true;
        }

        if (registrationState.blockedReason) {
            await updateManageMessage(interaction, {
                content: buildCharacterRegistrationBlockedContent(
                    registrationState.blockedReason,
                    registrationState.counts,
                    await resolveInteractionLocale(interaction),
                ),
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const registrationNote = String(interaction.fields.getTextInputValue('registrationNote') || '').trim();

        const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, {
            guildStatus: 'pending',
            registrationNote,
        });
        if (!result.ok) {
            const failureMessage = result.reason === 'active_limit' || result.reason === 'filler_limit'
                ? buildCharacterRegistrationBlockedContent(
                    result.reason,
                    result.counts || null,
                    await resolveInteractionLocale(interaction),
                )
                : await translateInteraction(interaction, 'characters.registerFailed');
            await updateManageMessage(interaction, { content: failureMessage, flags: MessageFlags.Ephemeral });
            return true;
        }

        const refreshed = await findCharacterForDiscord(interaction.user, characterId);
        if (!refreshed) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, {
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, refreshed, ownerDiscordId)),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterUpgradeLevel_')) {
        const [, characterIdRaw, ownerDiscordId, selectedBubblesRaw, allowOutsideRaw] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            return false;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = await getCharacterProgressionUpgradeStateForDiscord(interaction.user, characterId);
        if (!state.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        const allowOutsideRangeWithoutDowntime = allowOutsideRaw === '1';
        const { level, bubbles } = normalizeProgressionUpgradeSelection(
            state,
            Number(interaction.values?.[0] || state.initialTargetLevel),
            Number(selectedBubblesRaw),
            allowOutsideRangeWithoutDowntime,
        );

        await interaction.update({
            ...buildCharacterProgressionUpgradeView({
                character: state.character,
                ownerDiscordId,
                state,
                selectedLevel: level,
                selectedBubbles: bubbles,
                allowOutsideRangeWithoutDowntime,
                locale,
            }),
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterUpgradeBubbles_')) {
        const [, characterIdRaw, ownerDiscordId, selectedLevelRaw, allowOutsideRaw] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            return false;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = await getCharacterProgressionUpgradeStateForDiscord(interaction.user, characterId);
        if (!state.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        const allowOutsideRangeWithoutDowntime = allowOutsideRaw === '1';
        const { level, bubbles } = normalizeProgressionUpgradeSelection(
            state,
            Number(selectedLevelRaw),
            Number(interaction.values?.[0] || state.initialTargetBubblesInLevel),
            allowOutsideRangeWithoutDowntime,
        );

        await interaction.update({
            ...buildCharacterProgressionUpgradeView({
                character: state.character,
                ownerDiscordId,
                state,
                selectedLevel: level,
                selectedBubbles: bubbles,
                allowOutsideRangeWithoutDowntime,
                locale,
            }),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterUpgradeToggleOutside_')) {
        const [, characterIdRaw, ownerDiscordId, levelRaw, bubblesRaw, allowOutsideRaw] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            return false;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = await getCharacterProgressionUpgradeStateForDiscord(interaction.user, characterId);
        if (!state.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        const allowOutsideRangeWithoutDowntime = allowOutsideRaw !== '1';
        const { level, bubbles } = normalizeProgressionUpgradeSelection(
            state,
            Number(levelRaw),
            Number(bubblesRaw),
            allowOutsideRangeWithoutDowntime,
        );

        await interaction.update({
            ...buildCharacterProgressionUpgradeView({
                character: state.character,
                ownerDiscordId,
                state,
                selectedLevel: level,
                selectedBubbles: bubbles,
                allowOutsideRangeWithoutDowntime,
                locale,
            }),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterUpgradeConfirm_')) {
        const [, characterIdRaw, ownerDiscordId, levelRaw, bubblesRaw, allowOutsideRaw] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            return false;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await upgradeCharacterProgressionForDiscord(
            interaction.user,
            characterId,
            Number(levelRaw),
            Number(bubblesRaw),
            allowOutsideRaw === '1',
        );

        if (!result.ok) {
            const locale = await resolveInteractionLocale(interaction);
            let content = await translateInteraction(interaction, 'characters.characterUpdated');

            if (result.reason === 'below_real' && result.minLevel) {
                content = t('characters.levelCannotBeBelowReal', { level: result.minLevel }, locale);
            } else if (result.reason === 'above_max' && result.maxLevel) {
                content = t('characters.upgradeLevelCurveMaxLevelReason', { level: result.maxLevel }, locale);
            } else if (result.reason === 'outside_manual_range' && result.minLevel && result.maxLevel) {
                content = t('characters.upgradeLevelCurveManualRangeHint', { level: result.minLevel, maxLevel: result.maxLevel }, locale);
            } else if (result.reason === 'bubble_shop_floor') {
                content = 'Bubble-Shop-Ausgaben duerfen den Charakter nicht unter sein aktuelles Level druecken.';
            } else if (result.reason === 'character_not_found' || result.reason === 'not_found') {
                content = await translateInteraction(interaction, 'characters.characterNotFound');
            }

            await updateManageMessage(interaction, { content, flags: MessageFlags.Ephemeral });
            return true;
        }

        const refreshed = await findCharacterForDiscord(interaction.user, characterId);
        if (!refreshed) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterUpdated'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, refreshed, ownerDiscordId)),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterUpgradeCancel_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            return false;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterCard_')) {
        const [, action, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidCharacterId'), flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let character;
        try {
            character = await findCharacterForDiscord(interaction.user, characterId);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            throw error;
        }
        if (!character) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'manage') {
            await interaction.update({
                ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
                content: '',
            });
            return true;
        }

        if (action === 'del') {
            await interaction.update({
                content: await translateInteraction(interaction, 'characters.deleteCharacterPrompt'),
                components: [buildDeleteConfirmRow({ characterId: character.id, ownerDiscordId })],
            });
            return true;
        }

        if (action === 'register') {
            if (!isCharacterStatusSwitchEnabled) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registrationDisabled'), flags: MessageFlags.Ephemeral });
                return true;
            }

            const status = String(character.guild_status || '').trim().toLowerCase();
            if (status !== 'draft' && status !== 'needs_changes') {
                await interaction.update({
                    ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
                    content: '',
                });
                return true;
            }

            const registrationState = await getCharacterSubmissionStateForDiscord(interaction.user, characterId);
            if (!registrationState.ok) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registerFailed'), flags: MessageFlags.Ephemeral });
                return true;
            }

            if (registrationState.blockedReason) {
                await updateManageMessage(interaction, {
                    content: buildCharacterRegistrationBlockedContent(
                        registrationState.blockedReason,
                        registrationState.counts,
                        await resolveInteractionLocale(interaction),
                    ),
                    flags: MessageFlags.Ephemeral,
                });
                return true;
            }

            await interaction.update({
                ...buildCharacterRegisterConfirmView({ character, ownerDiscordId }),
                content: '',
            });
            return true;
        }

        if (action === 'upgrade') {
            const state = await getCharacterProgressionUpgradeStateForDiscord(interaction.user, characterId);
            if (!state.ok) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.characterNotFound'), flags: MessageFlags.Ephemeral });
                return true;
            }

            const locale = await resolveInteractionLocale(interaction);
            const { level, bubbles } = normalizeProgressionUpgradeSelection(
                state,
                state.initialTargetLevel,
                state.initialTargetBubblesInLevel,
                false,
            );

            await interaction.update({
                ...buildCharacterProgressionUpgradeView({
                    character: state.character,
                    ownerDiscordId,
                    state,
                    selectedLevel: level,
                    selectedBubbles: bubbles,
                    allowOutsideRangeWithoutDowntime: false,
                    locale,
                }),
                content: '',
            });
            return true;
        }

        if (action === 'adv') {
            if (!canCharacterLogActivity(character)) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registerFirst'), flags: MessageFlags.Ephemeral });
                return true;
            }
            const row = buildAdventureMenuRow(character, ownerDiscordId, await resolveInteractionLocale(interaction));
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'dt') {
            if (!canCharacterLogActivity(character)) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registerFirst'), flags: MessageFlags.Ephemeral });
                return true;
            }
            const row = buildDowntimeMenuRow(character, ownerDiscordId, await resolveInteractionLocale(interaction));
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'back') {
            await interaction.update({
                ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
                content: '',
            });
            return true;
        }

        if (action === 'list') {
            await interaction.deferUpdate();
            try {
                const characters = await listCharactersForDiscord(interaction.user);
                const locale = await resolveInteractionLocale(interaction);
                const listView = buildCharacterListView({ ownerDiscordId, characters, locale });
                await interaction.editReply({
                    ...listView,
                    content: '',
                });
            } catch (error) {
                if (error instanceof DiscordNotLinkedError) {
                    await editNotLinked(interaction);
                    return true;
                }
                throw error;
            }
            return true;
        }

        await updateManageMessage(interaction, { content: 'Unknown action.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterManage_')) {
        const raw = interaction.customId.replace('characterManage_', '');
        const parts = raw.split('_');
        const ownerDiscordId = parts.pop();
        const characterIdRaw = parts.pop();
        const action = parts.join('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await updateManageMessage(interaction, { content: 'Invalid character ID.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'back') {
            await interaction.update({
                ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
                content: '',
            });
            return true;
        }

        if (action === 'basic') {
            const modal = new ModalBuilder()
                .setCustomId(`characterBasicsModal_${character.id}_${ownerDiscordId}`)
                .setTitle('Character details');

            const nameInput = new TextInputBuilder()
                .setCustomId('basicName')
                .setLabel('Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(character.name));

            const urlInput = new TextInputBuilder()
                .setCustomId('basicUrl')
                .setLabel('DnDBeyond Link (URL)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(character.external_link));

            const notesInput = new TextInputBuilder()
                .setCustomId('basicNotes')
                .setLabel('Notes (optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setValue(safeModalValue(character.notes));

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(urlInput),
                new ActionRowBuilder().addComponents(notesInput),
            );

            await interaction.showModal(modal);
            return true;
        }

        if (action === 'avatar') {
            const dm = await interaction.user.createDM();
            const sourceLink = interaction.message?.url ? `\nBack to character dialog: ${interaction.message.url}` : '';
            await dm.send(`Please send your avatar image here (JPG, PNG, GIF, WEBP, max 5 MB). I only store it for this character.${sourceLink}`);

            clearAvatarUpdateState(ownerDiscordId);
            setAvatarUpdateState(ownerDiscordId, {
                ownerDiscordId,
                characterId: character.id,
                promptMessage: interaction.message ?? null,
            });

            await interaction.update({
                ...buildCharacterManageView(character, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
                content: '',
            });
            return true;
        }

        if (action === 'classes') {
            try {
                character.locale = await resolveInteractionLocale(interaction);
                const classesView = await buildCharacterClassesView({ interaction, character, ownerDiscordId });
                await interaction.update({
                    embeds: [classesView.embed],
                    components: classesView.components,
                    content: '',
                });
            } catch (error) {
                if (error instanceof DiscordNotLinkedError) {
                    await replyNotLinked(interaction);
                    return true;
                }
                throw error;
            }
            return true;
        }

        if (action === 'faction') {
            character.locale = await resolveInteractionLocale(interaction);
            const factionView = buildCharacterFactionView({ character, ownerDiscordId });
            await interaction.update({
                embeds: [factionView.embed],
                components: factionView.components,
                content: '',
            });
            return true;
        }

        if (action === 'tracking_toggle') {
            const nextValue = !character.simplified_tracking;
            const result = await updateCharacterTrackingModeForDiscord(interaction.user, characterId, nextValue);
            if (!result.ok) {
                await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const refreshed = await findCharacterForDiscord(interaction.user, characterId);
            if (!refreshed) {
                await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.update({
                ...buildCharacterManageView(refreshed, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
                content: '',
            });
            return true;
        }

        if (action === 'avatar_mask_toggle') {
            const currentAvatarMasked = character.avatar_masked === null || character.avatar_masked === undefined
                ? true
                : Boolean(character.avatar_masked);
            const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, { avatarMasked: !currentAvatarMasked });
            if (!result.ok) {
                await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const refreshed = await findCharacterForDiscord(interaction.user, characterId);
            if (!refreshed) {
                await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.update({
                ...buildCharacterManageView(refreshed, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
                content: '',
            });
            return true;
        }

        if (action === 'private_mode_toggle') {
            const currentPrivateMode = character.private_mode === null || character.private_mode === undefined
                ? false
                : Boolean(character.private_mode);
            const result = await updateCharacterForDiscordAndSync(interaction.user, characterId, { privateMode: !currentPrivateMode });
            if (!result.ok) {
                await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const refreshed = await findCharacterForDiscord(interaction.user, characterId);
            if (!refreshed) {
                await updateManageMessage(interaction, { content: 'Character updated.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.update({
                ...buildCharacterManageView(refreshed, { ownerDiscordId, locale: await resolveInteractionLocale(interaction) }),
                content: '',
            });
            return true;
        }

        if (action === 'dm_bubbles') {
            const modal = new ModalBuilder()
                .setCustomId(`characterDmBubblesModal_${character.id}_${ownerDiscordId}`)
                .setTitle('DM Bubbles');

            const bubbleInput = new TextInputBuilder()
                .setCustomId('dmBubbles')
                .setLabel('DM Bubbles')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(String(character.dm_bubbles ?? 0)));

            modal.addComponents(new ActionRowBuilder().addComponents(bubbleInput));
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'manual_level') {
            if (!canCharacterLogActivity(character)) {
                await updateManageMessage(interaction, { content: 'Register with Magiergilde first.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const modal = new ModalBuilder()
                .setCustomId(`characterManualLevelModal_${character.id}_${ownerDiscordId}_${Date.now()}`)
                .setTitle('Set level');

            const currentLevel = calculateLevel(character);
            const currentBubblesInLevel = calculateBubblesInCurrentLevel(character, currentLevel);
            const manualInput = new TextInputBuilder()
                .setCustomId('manualLevel')
                .setLabel('Level (1-20)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(String(currentLevel)));

            const bubblesInput = new TextInputBuilder()
                .setCustomId('manualBubblesInLevel')
                .setLabel('Bubbles im Level (optional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(safeModalValue(String(currentBubblesInLevel)));

            modal.addComponents(
                new ActionRowBuilder().addComponents(manualInput),
                new ActionRowBuilder().addComponents(bubblesInput),
            );
            await interaction.showModal(modal);
            return true;
        }
        if (action === 'manual_adventures') {
            const modal = new ModalBuilder()
                .setCustomId(`characterManualAdventuresModal_${character.id}_${ownerDiscordId}`)
                .setTitle('Abenteuer-Anzahl (manuell)');

            const input = new TextInputBuilder()
                .setCustomId('manualAdventuresCount')
                .setLabel('Anzahl (leer = deaktivieren)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(safeModalValue(character.manual_adventures_count != null ? String(character.manual_adventures_count) : ''));

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'manual_faction') {
            const modal = new ModalBuilder()
                .setCustomId(`characterManualFactionModal_${character.id}_${ownerDiscordId}`)
                .setTitle('Fraktion-Level (manuell)');

            const input = new TextInputBuilder()
                .setCustomId('manualFactionRank')
                .setLabel('Level (leer = deaktivieren)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(safeModalValue(character.manual_faction_rank != null ? String(character.manual_faction_rank) : ''));

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'dm_coins') {
            const modal = new ModalBuilder()
                .setCustomId(`characterDmCoinsModal_${character.id}_${ownerDiscordId}`)
                .setTitle('DM Coins');

            const coinInput = new TextInputBuilder()
                .setCustomId('dmCoins')
                .setLabel('DM Coins')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(String(character.dm_coins ?? 0)));

            modal.addComponents(new ActionRowBuilder().addComponents(coinInput));
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'bubble_spend') {
            const definitions = definitionsForCharacter(character);
            const quantities = quantitiesForCharacter(character);
            const modal = new ModalBuilder()
                .setCustomId(`characterBubbleShopModal_${character.id}_${ownerDiscordId}`)
                .setTitle('Bubble Shop');

            const inputs = [
                {
                    id: TYPE_SKILL_PROFICIENCY,
                    label: `${t('characters.bubbleShopSkillProficiencyShort', {}, locale)} (0-${safeInt(definitions[TYPE_SKILL_PROFICIENCY]?.max)})`,
                },
                {
                    id: TYPE_RARE_LANGUAGE,
                    label: `${t('characters.bubbleShopRareLanguageShort', {}, locale)} (0-${safeInt(definitions[TYPE_RARE_LANGUAGE]?.max)})`,
                },
                {
                    id: TYPE_TOOL_OR_LANGUAGE,
                    label: `${t('characters.bubbleShopToolOrLanguageShort', {}, locale)} (0-${safeInt(definitions[TYPE_TOOL_OR_LANGUAGE]?.max)})`,
                },
                {
                    id: TYPE_DOWNTIME,
                    label: `${t('characters.bubbleShopDowntimeShort', {}, locale)} (0-${definitions[TYPE_DOWNTIME]?.max ?? 'unlimited'})`,
                },
            ];

            modal.addComponents(...inputs.map(({ id, label }) => (
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(id)
                        .setLabel(label)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue(safeModalValue(String(quantities[id] ?? 0))),
                )
            )));
            await interaction.showModal(modal);
            return true;
        }

        await updateManageMessage(interaction, { content: 'Unknown action.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterRegister')) {
        const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(idRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await updateManageMessage(interaction, { content: 'Invalid character ID.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await updateManageMessage(interaction, { content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'characterRegisterCancel') {
            await interaction.update({
                ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
                content: '',
            });
            return true;
        }

        if (action !== 'characterRegisterConfirm') {
            return false;
        }

        if (!isCharacterStatusSwitchEnabled) {
            await updateManageMessage(interaction, { content: 'Registration is currently disabled.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const status = String(character.guild_status || '').trim().toLowerCase();
        if (status !== 'draft' && status !== 'needs_changes') {
            await interaction.update({
                ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
                content: '',
            });
            return true;
        }

        const registrationState = await getCharacterSubmissionStateForDiscord(interaction.user, characterId);
        if (!registrationState.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.registerFailed'), flags: MessageFlags.Ephemeral });
            return true;
        }

        if (registrationState.blockedReason) {
            await updateManageMessage(interaction, {
                content: buildCharacterRegistrationBlockedContent(
                    registrationState.blockedReason,
                    registrationState.counts,
                    await resolveInteractionLocale(interaction),
                ),
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        await interaction.showModal(buildCharacterRegisterNoteModal({
            characterId,
            ownerDiscordId,
            initialNote: String(character.registration_note || '').trim(),
        }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteCharacter')) {
        const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(idRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await updateManageMessage(interaction, { content: 'Invalid character ID.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }
        if (action === 'deleteCharacterCancel') {
            try {
                await updateCharacterListMessage(interaction, ownerDiscordId);
            } catch (error) {
                if (error instanceof DiscordNotLinkedError) {
                    await interaction.update({ content: notLinkedContent(), components: [] });
                    return true;
                }
                throw error;
            }
            return true;
        }
        if (action !== 'deleteCharacterConfirm') return false;

        try {
            const result = await softDeleteCharacterForDiscord(interaction.user, characterId);
            if (!result.ok) {
                await interaction.update({ content: 'Character not found or already deleted.', components: [] });
                return true;
            }
            await syncCharacterApprovalAnnouncement(characterId);
            await updateCharacterListMessage(interaction, ownerDiscordId);
        } catch (error) {
             
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), components: [] });
                return true;
            }
            await interaction.update({ content: `Delete failed: ${error.message}`, components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advAdd_')) {
        const match = interaction.customId.match(/^advAdd_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (state && Number(state.characterId) !== characterId) {
            ensurePromptMessage(state, interaction);
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'You already have an open creation. Please finish it or click **Cancel**.',
            }));
            return true;
        }

        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const payload = await buildAdventureStepPayload({
            interaction,
            state,
            message: 'Choose the adventure duration.',
        });
        await updateAdventureMessage(state, payload);
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_back_')) {
        const match = interaction.customId.match(/^advCreate_back_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            await interaction.update({ content: '', embeds: [], components: [buildAdventureMenuRow({ id: characterId }, ownerDiscordId)] });
            return true;
        }

        if (state.step === 'duration') {
            clearAdventureCreationState(ownerDiscordId);
            setParticipantSearch(`create-${characterId}`, ownerDiscordId, '');
            await interaction.update({ content: '', embeds: [], components: [buildAdventureMenuRow({ id: characterId }, ownerDiscordId)] });
            return true;
        }

        state.step = getAdventurePreviousStep(state.step);
        ensurePromptMessage(state, interaction);
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_cancel_')) {
        const match = interaction.customId.match(/^advCreate_cancel_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        clearAdventureCreationState(ownerDiscordId);
        setParticipantSearch(`create-${characterId}`, ownerDiscordId, '');
        await interaction.update({ content: '', embeds: [], components: [buildAdventureMenuRow({ id: characterId }, ownerDiscordId)] });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_next_')) {
        const match = interaction.customId.match(/^advCreate_next_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const step = state.step;
        if (step === 'duration' && (state.data.durationSeconds === null || state.data.durationSeconds === undefined)) {
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Choose a duration before continuing.',
            }));
            return true;
        }

        if (step === 'date' && !state.data.startDate) {
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Choose a date before continuing.',
            }));
            return true;
        }

        if (step === 'quest' && state.data.hasAdditionalBubble === null) {
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Select whether this was a character quest.',
            }));
            return true;
        }

        state.step = getAdventureNextStep(step);
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_duration_')) {
        const parts = interaction.customId.split('_');
        if (parts.length < 5) return false;
        const value = parts[2];
        const characterId = Number(parts[3]);
        const ownerDiscordId = parts[4];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);

        if (value === 'custom') {
            await interaction.showModal(buildAdventureDurationModal(state));
            return true;
        }

        const durationSeconds = Number(value);
        if (!Number.isFinite(durationSeconds)) {
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Invalid selection. Please choose a duration.',
            }));
            return true;
        }

        state.data.durationSeconds = durationSeconds;
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreate_durationModal_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[2];
        const ownerDiscordId = parts[3];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        if (duration === null) {
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Invalid duration. Use HH:MM (e.g. 03:00), 400h 30m, or minutes.',
            }));
            return true;
        }

        state.data.durationSeconds = duration;
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_date_')) {
        const parts = interaction.customId.split('_');
        if (parts.length < 5) return false;
        const value = parts[2];
        const characterId = Number(parts[3]);
        const ownerDiscordId = parts[4];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);

        if (value === 'custom') {
            await interaction.showModal(buildAdventureDateModal(state));
            return true;
        }

        const date = new Date();
        if (value === 'yesterday') {
            date.setDate(date.getDate() - 1);
        }
        state.data.startDate = formatLocalIsoDate(date);
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreate_dateModal_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[2];
        const ownerDiscordId = parts[3];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        if (!startDate) {
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Invalid date. Use YYYY-MM-DD.',
            }));
            return true;
        }

        state.data.startDate = startDate;
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_title_edit_')) {
        const match = interaction.customId.match(/^advCreate_title_edit_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        await interaction.showModal(buildAdventureTitleModal(state));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreate_titleModal_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[2];
        const ownerDiscordId = parts[3];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();
        state.data.title = title;
        state.data.gameMaster = gameMaster;
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_notes_edit_')) {
        const match = interaction.customId.match(/^advCreate_notes_edit_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        await interaction.showModal(buildAdventureNotesModal(state));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreate_notesModal_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[2];
        const ownerDiscordId = parts[3];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const notes = (interaction.fields.getTextInputValue('advNotes') || '').trim();
        state.data.notes = notes;
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_confirm_')) {
        const match = interaction.customId.match(/^advCreate_confirm_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);

        if (state.data.durationSeconds === null || !state.data.startDate || state.data.hasAdditionalBubble === null) {
            if (state.data.durationSeconds === null) {
                state.step = 'duration';
            } else if (!state.data.startDate) {
                state.step = 'date';
            } else {
                state.step = 'quest';
            }
            await updateAdventureMessage(state, await buildAdventureStepPayload({
                interaction,
                state,
                message: 'Please fill in the missing details.',
            }));
            return true;
        }

        try {
            const isEdit = state.mode === 'edit' && Number(state.adventureId) > 0;
            let result;

            if (isEdit) {
                result = await updateAdventureForDiscord(interaction.user, state.adventureId, {
                    duration: state.data.durationSeconds,
                    startDate: state.data.startDate,
                    hasAdditionalBubble: state.data.hasAdditionalBubble === true,
                    title: state.data.title,
                    gameMaster: state.data.gameMaster,
                    notes: state.data.notes,
                    allyIds: state.data.allyIds,
                    guildCharacterIds: state.data.guildCharacterIds,
                });
            } else {
                result = await createAdventureForDiscord(interaction.user, {
                    characterId,
                    duration: state.data.durationSeconds,
                    startDate: state.data.startDate,
                    hasAdditionalBubble: state.data.hasAdditionalBubble === true,
                    title: state.data.title,
                    gameMaster: state.data.gameMaster,
                    notes: state.data.notes,
                    allyIds: state.data.allyIds,
                    guildCharacterIds: state.data.guildCharacterIds,
                });
            }

            if (!result?.ok) {
                await updateAdventureMessage(state, {
                    embeds: [buildAdventureStepEmbed('confirm', state, 'Adventure could not be saved.')],
                    components: buildAdventureConfirmRows(state),
                });
                return true;
            }

            const adventureId = isEdit ? Number(state.adventureId) : Number(result.id);
            clearAdventureCreationState(ownerDiscordId);
            setParticipantSearch(`create-${characterId}`, ownerDiscordId, '');

            if (isEdit && adventureId) {
                await syncAdventureParticipantsForDiscord(interaction.user, adventureId, {
                    allyIds: state.data.allyIds,
                    guildCharacterIds: state.data.guildCharacterIds,
                });
            }

            await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        } catch (error) {
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await updateAdventureMessage(state, { content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await updateAdventureMessage(state, {
                embeds: [buildAdventureStepEmbed('confirm', state, 'Failed to save adventure.')],
                components: buildAdventureConfirmRows(state),
            });
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advCreate_quest_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[2];
        const ownerDiscordId = parts[3];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const value = String(interaction.values?.[0] || '').toLowerCase();
        if (value === 'yes') state.data.hasAdditionalBubble = true;
        if (value === 'no') state.data.hasAdditionalBubble = false;

        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advCreate_participants_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[2];
        const ownerDiscordId = parts[3];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const searchKey = `create-${characterId}`;
        const search = getParticipantSearch(searchKey, ownerDiscordId);
        const [allies, guildCharacters] = await Promise.all([
            listAlliesForDiscord(interaction.user, characterId),
            listGuildCharactersForDiscord(interaction.user, characterId),
        ]);
        const filteredOptions = buildParticipantOptions({
            allies,
            guildCharacters,
            selectedAllyIds: state.data.allyIds,
            selectedGuildCharacterIds: state.data.guildCharacterIds,
            search,
        });

        const selectedValues = new Set(interaction.values ?? []);
        const toNumberSet = (values) => new Set(
            (values ?? [])
                .map(value => Number(value))
                .filter(value => Number.isFinite(value) && value > 0),
        );
        const allyIds = toNumberSet(state.data.allyIds);
        const guildCharacterIds = toNumberSet(state.data.guildCharacterIds);

        for (const option of filteredOptions) {
            const valueKey = `${option.type}:${option.id}`;
            const isSelected = selectedValues.has(valueKey);
            if (option.type === 'ally') {
                if (isSelected) {
                    allyIds.add(option.id);
                } else {
                    allyIds.delete(option.id);
                }
            }
            if (option.type === 'guild') {
                if (isSelected) {
                    guildCharacterIds.add(option.id);
                } else {
                    guildCharacterIds.delete(option.id);
                }
            }
        }

        state.data.allyIds = Array.from(allyIds);
        state.data.guildCharacterIds = Array.from(guildCharacterIds);

        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_participants_search_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[3];
        const ownerDiscordId = parts[4];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const searchKey = `create-${characterId}`;
        const locale = await resolveInteractionLocale(interaction);
        const modal = new ModalBuilder()
            .setCustomId(`advCreate_participants_searchModal_${characterId}_${ownerDiscordId}`)
            .setTitle(t('characters.participantSearchTitle', {}, locale));

        const searchInput = new TextInputBuilder()
            .setCustomId('participantSearch')
            .setLabel(t('characters.participantSearchCreateLabel', {}, locale))
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(safeModalValue(getParticipantSearch(searchKey, ownerDiscordId), 100));

        modal.addComponents(new ActionRowBuilder().addComponents(searchInput));
        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreate_participants_searchModal_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[3];
        const ownerDiscordId = parts[4];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        const searchKey = `create-${characterId}`;
        setParticipantSearch(searchKey, ownerDiscordId, interaction.fields.getTextInputValue('participantSearch'));
        ensurePromptMessage(state, interaction);
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_participants_clear_')) {
        const parts = interaction.customId.split('_');
        const characterIdRaw = parts[3];
        const ownerDiscordId = parts[4];
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        state.data.allyIds = [];
        state.data.guildCharacterIds = [];
        ensurePromptMessage(state, interaction);
        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        try {
            const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
            if (adventures.length === 0) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.noAdventuresFound'), embeds: [], components: [] });
                return true;
            }
            const locale = await resolveInteractionLocale(interaction);
            await updateManageMessage(interaction, {
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle(t('characters.adventureField', {}, locale)).setDescription(t('characters.chooseAdventure', {}, locale))],
                components: buildAdventureListRows({ characterId, ownerDiscordId, adventures, locale }),
                content: '',
            });
        } catch (error) {
             
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await updateManageMessage(interaction, {
                    content: notLinkedContent(),
                    components: [buildNotLinkedButtons(interaction.user.id)],
                    embeds: [],
                });
                return true;
            }
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.failedLoadAdventures'), embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtAdd_')) {
        const match = interaction.customId.match(/^dtAdd_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = createDowntimeState({ ownerDiscordId, characterId, mode: 'create' });
        state.step = 'duration';
        state.data.startDate = formatLocalIsoDate();
        setDowntimeCreationState(ownerDiscordId, state);
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({
            interaction,
            state,
            message: t('characters.chooseDowntimeDuration', {}, state.locale),
        }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_duration_custom_')) {
        const match = interaction.customId.match(/^dtCreate_duration_custom_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getDowntimeCreationState(ownerDiscordId);
        if (!state) {
            state = createDowntimeState({ ownerDiscordId, characterId, mode: 'create' });
            setDowntimeCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        await interaction.showModal(buildDowntimeDurationModal(state));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtCreate_durationModal_')) {
        const parts = interaction.customId.split('_');
        const characterId = Number(parts[2]);
        const ownerDiscordId = parts[3];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        if (duration === null) {
            ensurePromptMessage(state, interaction);
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: t('characters.invalidDuration', {}, state.locale),
            }));
            return true;
        }

        state.data.durationSeconds = duration;
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_date_custom_')) {
        const match = interaction.customId.match(/^dtCreate_date_custom_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getDowntimeCreationState(ownerDiscordId);
        if (!state) {
            state = createDowntimeState({ ownerDiscordId, characterId, mode: 'create' });
            setDowntimeCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        await interaction.showModal(buildDowntimeDateModal(state));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtCreate_dateModal_')) {
        const parts = interaction.customId.split('_');
        const characterId = Number(parts[2]);
        const ownerDiscordId = parts[3];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        if (!startDate) {
            ensurePromptMessage(state, interaction);
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: t('characters.invalidDate', {}, state.locale),
            }));
            return true;
        }

        state.data.startDate = startDate;
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ state }));
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dtCreate_type_')) {
        const parts = interaction.customId.split('_');
        const characterId = Number(parts[2]);
        const ownerDiscordId = parts[3];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        state.data.type = interaction.values?.[0] === 'faction' ? 'faction' : 'other';
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_notes_edit_')) {
        const match = interaction.customId.match(/^dtCreate_notes_edit_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        ensurePromptMessage(state, interaction);
        await interaction.showModal(buildDowntimeNotesModal(state));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtCreate_notesModal_')) {
        const parts = interaction.customId.split('_');
        const characterId = Number(parts[2]);
        const ownerDiscordId = parts[3];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        state.data.notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_back_')) {
        const match = interaction.customId.match(/^dtCreate_back_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        if (state.step === 'duration') {
            clearDowntimeCreationState(ownerDiscordId);
            await interaction.update({ content: '', embeds: [], components: [buildDowntimeMenuRow({ id: characterId }, ownerDiscordId, state.locale)] });
            return true;
        }

        state.step = getDowntimePreviousStep(state.step);
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_cancel_')) {
        const match = interaction.customId.match(/^dtCreate_cancel_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        clearDowntimeCreationState(ownerDiscordId);
        await interaction.update({ content: '', embeds: [], components: [buildDowntimeMenuRow({ id: characterId }, ownerDiscordId, await resolveInteractionLocale(interaction))] });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_next_')) {
        const match = interaction.customId.match(/^dtCreate_next_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        if (state.step === 'duration' && (state.data.durationSeconds === null || state.data.durationSeconds === undefined)) {
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: t('characters.continueWithDuration', {}, state.locale),
            }));
            return true;
        }

        if (state.step === 'date' && !state.data.startDate) {
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: t('characters.continueWithDate', {}, state.locale),
            }));
            return true;
        }

        state.step = getDowntimeNextStep(state.step);
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_confirm_')) {
        const match = interaction.customId.match(/^dtCreate_confirm_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getDowntimeCreationState(ownerDiscordId);
        if (!state) {
            state = createDowntimeState({ ownerDiscordId, characterId, mode: 'create' });
            setDowntimeCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);

        if (state.data.durationSeconds === null || !state.data.startDate || !state.data.type) {
            if (state.data.durationSeconds === null) {
                state.step = 'duration';
            } else if (!state.data.startDate) {
                state.step = 'date';
            } else {
                state.step = 'type';
            }
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: 'Please fill in the missing details.',
            }));
            return true;
        }

        try {
            const isEdit = state.mode === 'edit' && Number(state.downtimeId) > 0;
            let result;

            if (isEdit) {
                result = await updateDowntimeForDiscord(interaction.user, state.downtimeId, {
                    duration: state.data.durationSeconds,
                    startDate: state.data.startDate,
                    type: state.data.type,
                    notes: state.data.notes,
                });
            } else {
                result = await createDowntimeForDiscord(interaction.user, {
                    characterId,
                    duration: state.data.durationSeconds,
                    startDate: state.data.startDate,
                    type: state.data.type,
                    notes: state.data.notes,
                });
            }

            if (!result?.ok) {
                await updateDowntimeMessage(state, {
                    embeds: [buildDowntimeStepEmbed('confirm', state, 'Downtime could not be saved.')],
                    components: buildDowntimeConfirmRows(state),
                });
                return true;
            }

            const downtimeId = isEdit ? Number(state.downtimeId) : Number(result.id);
            clearDowntimeCreationState(ownerDiscordId);

            await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        } catch (error) {
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await updateDowntimeMessage(state, { content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await updateDowntimeMessage(state, {
                embeds: [buildDowntimeStepEmbed('confirm', state, 'Failed to save downtime.')],
                components: buildDowntimeConfirmRows(state),
            });
        }
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtCreateModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const typeRaw = String(interaction.fields.getTextInputValue('dtTypee') || '').trim().toLowerCase();
        const normalizedTypee = (() => {
            if (['faction', 'f', '1'].includes(typeRaw)) return 'faction';
            if (['other', 'o', '2'].includes(typeRaw)) return 'other';
            return null;
        })();
        if (!normalizedTypee) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidType'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();

        if (duration === null) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidDuration'), flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidDate'), flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await createDowntimeForDiscord(interaction.user, {
                characterId,
                duration,
                startDate,
                type: normalizedTypee,
                notes,
            });

            if (!result.ok) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeSaveFailed'), flags: MessageFlags.Ephemeral });
                return true;
            }

            const downtime = await findDowntimeForDiscord(interaction.user, result.id);
            if (!downtime) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeSaved'), flags: MessageFlags.Ephemeral });
                return true;
            }

            const view = buildDowntimeManageView({ downtime, ownerDiscordId, characterId });
            await updateManageMessage(interaction, {
                embeds: [view.embed],
                components: view.components,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
             
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeSaveFailed'), flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { embeds: [], components: [] });
            return true;
        }

        try {
            const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
            if (downtimes.length === 0) {
                await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.noDowntimesFound'), embeds: [], components: [] });
                return true;
            }
            const locale = await resolveInteractionLocale(interaction);
            await updateManageMessage(interaction, {
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle(t('characters.downtimeField', {}, locale)).setDescription(t('characters.chooseDowntime', {}, locale))],
                components: buildDowntimeListRows({ characterId, ownerDiscordId, downtimes, locale }),
                content: '',
            });
        } catch (error) {
             
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await updateManageMessage(interaction, {
                    content: notLinkedContent(),
                    components: [buildNotLinkedButtons(interaction.user.id)],
                    embeds: [],
                });
                return true;
            }
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.failedLoadDowntimes'), embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const adventureId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(adventureId) || adventureId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advParticipantsSearch_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const locale = await resolveInteractionLocale(interaction);
        const modal = new ModalBuilder()
            .setCustomId(`advParticipantsSearchModal_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setTitle(t('characters.participantSearchTitle', {}, locale));

        const searchInput = new TextInputBuilder()
            .setCustomId('participantSearch')
            .setLabel(t('characters.participantSearchManageLabel', {}, locale))
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(safeModalValue(getParticipantSearch(adventureId, ownerDiscordId), 100));

        modal.addComponents(new ActionRowBuilder().addComponents(searchInput));
        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advParticipantsSearchModal_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        setParticipantSearch(adventureId, ownerDiscordId, interaction.fields.getTextInputValue('participantSearch'));
        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await updateManageMessage(interaction, { content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await updateManageMessage(interaction, { embeds: [view.embed], components: view.components, flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advParticipantsSelect_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const [participants, allies, guildCharacters] = await Promise.all([
            listAdventureParticipantsForDiscord(interaction.user, adventureId),
            listAlliesForDiscord(interaction.user, characterId),
            listGuildCharactersForDiscord(interaction.user, characterId),
        ]);
        const search = getParticipantSearch(adventureId, ownerDiscordId);
        const filteredOptions = buildParticipantOptions({
            allies,
            guildCharacters,
            selectedAllyIds: participants.map(entry => Number(entry.id)),
            selectedGuildCharacterIds: [],
            search,
        });

        const selectedValues = new Set(interaction.values ?? []);
        const allyIds = new Set(participants.map(entry => Number(entry.id)));
        const guildCharacterIds = new Set();

        for (const option of filteredOptions) {
            const valueKey = `${option.type}:${option.id}`;
            const isSelected = selectedValues.has(valueKey);
            if (option.type === 'ally') {
                if (isSelected) {
                    allyIds.add(option.id);
                } else {
                    allyIds.delete(option.id);
                }
            }
            if (option.type === 'guild') {
                if (isSelected) {
                    guildCharacterIds.add(option.id);
                } else {
                    guildCharacterIds.delete(option.id);
                }
            }
        }

        const result = await syncAdventureParticipantsForDiscord(interaction.user, adventureId, {
            characterId,
            allyIds: Array.from(allyIds),
            guildCharacterIds: Array.from(guildCharacterIds),
        });

        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Participants could not be saved.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: await translateInteraction(interaction, 'characters.adventureNotFound'), embeds: [], components: [] });
            return true;
        }

        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advParticipantsClear_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        await syncAdventureParticipantsForDiscord(interaction.user, adventureId, {
            characterId,
            allyIds: [],
            guildCharacterIds: [],
        });

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advParticipantsBack_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dtSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const downtimeId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(downtimeId) || downtimeId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_back_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_duration_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        await interaction.showModal(buildAdventureManageDurationModal({
            adventureId,
            characterId,
            ownerDiscordId,
            adventure,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advManage_durationModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        if (duration === null) {
            await updateManageMessage(interaction, { content: 'Invalid duration. Use HH:MM (e.g. 03:00), 400h 30m, or minutes.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const result = await updateAdventureForDiscord(interaction.user, adventureId, { duration });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_date_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        await interaction.showModal(buildAdventureManageDateModal({
            adventureId,
            characterId,
            ownerDiscordId,
            adventure,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advManage_dateModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        if (!startDate) {
            await updateManageMessage(interaction, { content: 'Invalid date. Use YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const result = await updateAdventureForDiscord(interaction.user, adventureId, { startDate });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_title_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        await interaction.showModal(buildAdventureManageTitleModal({
            adventureId,
            characterId,
            ownerDiscordId,
            adventure,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advManage_titleModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();
        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const result = await updateAdventureForDiscord(interaction.user, adventureId, { title, gameMaster });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_notes_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        await interaction.showModal(buildAdventureManageNotesModal({
            adventureId,
            characterId,
            ownerDiscordId,
            adventure,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advManage_notesModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const notes = (interaction.fields.getTextInputValue('advNotes') || '').trim();
        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const result = await updateAdventureForDiscord(interaction.user, adventureId, { notes });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_quest_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const view = buildAdventureQuestManageView({ adventure, ownerDiscordId, characterId });
        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advManage_questSelect_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const value = String(interaction.values?.[0] || '').toLowerCase();
        const hasAdditionalBubble = value === 'yes';
        const result = await updateAdventureForDiscord(interaction.user, adventureId, { hasAdditionalBubble });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advManage_participants_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advDelete_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        await interaction.update({
            content: await translateInteraction(interaction, 'characters.deleteAdventurePrompt'),
            components: [buildAdventureDeleteConfirmRow({ adventureId, characterId, ownerDiscordId })],
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteAdventure')) {
        const [action, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteAdventureCancel') {
            await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
            return true;
        }

        if (action !== 'deleteAdventureConfirm') return false;

        const adventure = await loadEditableAdventure(interaction, adventureId, characterId);
        if (!adventure) return true;

        try {
            const result = await softDeleteAdventureForDiscord(interaction.user, adventureId);
            if (!result.ok) {
                await interaction.update({ content: await translateInteraction(interaction, 'characters.adventureNotFoundOrDeleted'), embeds: [], components: [] });
                return true;
            }

            const locale = await resolveInteractionLocale(interaction);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel(t('characters.backToList', {}, locale))
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: t('characters.adventureDeleted', {}, locale), embeds: [], components: [row] });
        } catch (error) {
             
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: await translateInteraction(interaction, 'characters.deleteFailed', { message: error.message }), embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
        if (adventures.length === 0) {
            await interaction.update({ content: await translateInteraction(interaction, 'characters.noAdventuresFound'), embeds: [], components: [] });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle(t('characters.adventureField', {}, locale)).setDescription(t('characters.chooseAdventure', {}, locale))],
            components: buildAdventureListRows({ characterId, ownerDiscordId, adventures, locale }),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advListBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let character;
        try {
            character = await findCharacterForDiscord(interaction.user, characterId);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            throw error;
        }

        if (!character) {
            await interaction.update({ content: 'Character not found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtListBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        let character;
        try {
            character = await findCharacterForDiscord(interaction.user, characterId);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            throw error;
        }

        if (!character) {
            await interaction.update({ content: 'Character not found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            ...(await buildCharacterCardPayloadForInteraction(interaction.user, character, ownerDiscordId)),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtManage_back_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtManage_duration_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.showModal(buildDowntimeManageDurationModal({
            downtimeId,
            characterId,
            ownerDiscordId,
            downtime,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtManage_durationModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        if (duration === null) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidDuration'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { duration });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtManage_date_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.showModal(buildDowntimeManageDateModal({
            downtimeId,
            characterId,
            ownerDiscordId,
            downtime,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtManage_dateModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        if (!startDate) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidDate'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { startDate });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtManage_type_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = buildDowntimeTypeManageView({ downtime, ownerDiscordId, characterId });
        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dtManage_typeSelect_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const typeValue = String(interaction.values?.[0] || '').toLowerCase();
        if (typeValue !== 'faction' && typeValue !== 'other') {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.invalidType'), flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { type: typeValue });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtManage_notes_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.showModal(buildDowntimeManageNotesModal({
            downtimeId,
            characterId,
            ownerDiscordId,
            downtime,
        }));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtManage_notesModal_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();
        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { notes });
        if (!result.ok) {
            await updateManageMessage(interaction, { content: await translateInteraction(interaction, 'characters.downtimeNotFound'), flags: MessageFlags.Ephemeral });
            return true;
        }

        await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtDelete_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: await translateInteraction(interaction, 'characters.deleteDowntimePrompt'),
            components: [buildDowntimeDeleteConfirmRow({ downtimeId, characterId, ownerDiscordId })],
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteDowntime')) {
        const [action, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteDowntimeCancel') {
            await refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId });
            return true;
        }

        if (action !== 'deleteDowntimeConfirm') return false;

        try {
            const result = await softDeleteDowntimeForDiscord(interaction.user, downtimeId);
            if (!result.ok) {
                await interaction.update({ content: await translateInteraction(interaction, 'characters.downtimeNotFoundOrDeleted'), embeds: [], components: [] });
                return true;
            }

            const locale = await resolveInteractionLocale(interaction);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel(t('characters.backToList', {}, locale))
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: t('characters.downtimeDeleted', {}, locale), embeds: [], components: [row] });
        } catch (error) {
             
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: await translateInteraction(interaction, 'characters.deleteFailed', { message: error.message }), embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateActionDenied(interaction, { flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
        if (downtimes.length === 0) {
            await interaction.update({ content: await translateInteraction(interaction, 'characters.noDowntimesFound'), embeds: [], components: [] });
            return true;
        }

        const locale = await resolveInteractionLocale(interaction);
        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle(t('characters.downtimeField', {}, locale)).setDescription(t('characters.chooseDowntime', {}, locale))],
            components: buildDowntimeListRows({ characterId, ownerDiscordId, downtimes, locale }),
            content: '',
        });
        return true;
    }

    return false;
}

module.exports = {
    handle,
    handleCreationAvatarMessage,
    handleAvatarUpdateMessage,
    storeCharacterAvatar,
    buildCreationStepPayload,
};
