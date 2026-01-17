const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
} = require('discord.js');
const { Agent } = require('undici');
const { updateCreationReply } = require('./interactionReplies');
const { updateManageMessage } = require('../utils/updateManageMessage');

const {
    DiscordNotLinkedError,
    createCharacterForDiscord,
    listCharactersForDiscord,
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
    listGuildCharactersForDiscord,
    listAdventureParticipantsForDiscord,
    syncAdventureParticipantsForDiscord,
    listDowntimesForDiscord,
    findDowntimeForDiscord,
    createDowntimeForDiscord,
    updateDowntimeForDiscord,
    softDeleteDowntimeForDiscord,
} = require('../appDb');

const { buildCharacterListView } = require('../commands/game/characters');
const { formatLocalIsoDate } = require('../dateUtils');

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
    buildCharacterCardPayload,
    buildCharacterCardRows,
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
    buildDowntimeListRow,
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
    formatSelectedParticipantNames,
    getParticipantSearch,
    getStartTierSelection,
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

function isOwnerOfInteraction(interaction, ownerDiscordId) {
    return String(interaction.user.id) === String(ownerDiscordId);
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
    const characters = await listCharactersForDiscord(interaction.user);
    const listView = buildCharacterListView({ ownerDiscordId, characters });
    await interaction.update({
        ...listView,
        content: '',
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

const allowedStartTiers = new Set(['bt', 'lt', 'ht']);
const allowedVersions = new Set(['2014', '2024']);
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

function creationStateKey(userId) {
    return String(userId);
}

function getCreationState(userId) {
    return pendingCharacterCreations.get(creationStateKey(userId)) || null;
}

function setCreationState(userId, state) {
    pendingCharacterCreations.set(creationStateKey(userId), state);
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
            durationSeconds: null,
            startDate: '',
            title: '',
            gameMaster: '',
            hasAdditionalBubble: null,
            notes: '',
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
            startDate: '',
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
    const step = state.step;
    const { characterId } = state;
    let participantsLabel = undefined;
    let participantOptions = [];

    if (step === 'participants' || step === 'confirm') {
        participantOptions = await listGuildCharactersForDiscord(interaction.user, characterId);
        participantsLabel = formatSelectedParticipantNames(participantOptions, state.data.guildCharacterIds);
    }

    if (step === 'duration') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || 'Choose the adventure duration.', participantsLabel)],
            components: buildAdventureDurationRows(state),
        };
    }

    if (step === 'date') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || 'Choose the date.', participantsLabel)],
            components: buildAdventureDateRows(state),
        };
    }

    if (step === 'title') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || 'Optional: add title and Game Master.', participantsLabel)],
            components: buildAdventureTitleRows(state),
        };
    }

    if (step === 'quest') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || 'Was this a character quest (+1 bubble)?', participantsLabel)],
            components: buildAdventureQuestRows(state),
        };
    }

    if (step === 'notes') {
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || 'Add or edit notes.', participantsLabel)],
            components: buildAdventureNotesRows(state),
        };
    }

    if (step === 'participants') {
        const components = buildAdventureParticipantsRows(state, participantOptions);
        return {
            embeds: [buildAdventureStepEmbed(step, state, message || 'Choose participants (approved characters).', participantsLabel)],
            components,
        };
    }

    return {
        embeds: [buildAdventureStepEmbed(step, state, message || 'Please confirm the details.', participantsLabel)],
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
                await activeInteraction.deleteReply().catch(() => {});
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
                        await activeInteraction.deleteReply().catch(() => {});
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
                await activeInteraction.deleteReply().catch(() => {});
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

function resolveAppUrl() {
    const direct = String(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    if (!direct) return '';
    try {
        return new URL(direct).toString().replace(/\/$/, '');
    } catch {
        return direct.replace(/\/$/, '');
    }
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

async function storeCharacterAvatar(characterId, avatarUrl) {
    const appUrl = resolveAppUrl();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!appUrl || !token) {
        console.warn('[bot] Avatar upload skipped: BOT_PUBLIC_APP_URL/APP_URL or BOT_HTTP_TOKEN missing.');
        return false;
    }

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
            return false;
        }

        if (!contentType.includes('application/json')) {
            const text = await response.text().catch(() => '');
            const preview = text.length > 300 ? `${text.slice(0, 300)}...` : text;
            console.warn(`[bot] Avatar upload unexpected response. content-type=${contentType} body=${preview}`);
            return false;
        }

        const payload = await response.json().catch(() => null);
        if (payload?.avatar_path) {
            return payload.avatar_path;
        }
        return true;
    } catch (error) {
        const code = error?.cause?.code || error?.code;
        if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            console.warn('[bot] Avatar upload TLS error. Endpoint:', `${appUrl}/bot/character-avatars`);
        }

        console.warn('[bot] Avatar upload error.', error);
        return false;
    }
}

async function showCreationError(interaction, state, ownerDiscordId, message) {
    state.step = 'basic';
    const payload = {
        embeds: [buildCreationBasicsEmbed(state, message)],
        components: buildCreationBasicsRows(ownerDiscordId),
    };
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await updateCreationMessage(state, payload);
    await interaction.deleteReply().catch(() => {});
}

async function finalizeCharacterCreation(state) {
    const { data, ownerDiscordId } = state;
    if (!data.name || !data.externalLink || !data.startTier || !data.version || !Array.isArray(data.classIds) || data.classIds.length === 0) {
        await updateCreationMessage(state, {
            content: 'Character data incomplete. Please start again.',
            embeds: [],
            components: [],
        });
        clearCreationState(state.userId);
        return;
    }

    const result = await createCharacterForDiscord(state.promptInteraction.user, {
        name: data.name,
        startTier: data.startTier,
        externalLink: data.externalLink,
        notes: data.notes,
        avatar: data.avatar,
        faction: data.faction ?? 'none',
        version: data.version ?? '2024',
        isFiller: data.isFiller,
        classIds: data.classIds,
    });

    clearCreationState(state.userId);

    if (!result.ok) {
        await updateCreationMessage(state, {
            content: 'Character could not be created.',
            embeds: [],
            components: [],
        });
        return;
    }

    if (result.id && data.avatar && isHttpUrl(data.avatar)) {
        const storedAvatar = await storeCharacterAvatar(result.id, data.avatar);
        if (storedAvatar && typeof storedAvatar === 'string') {
            data.avatar = storedAvatar;
        }
    }

    const character = await findCharacterForDiscord(state.promptInteraction.user, result.id);
    if (!character) {
        await updateCreationMessage(state, {
            content: 'Character created.',
            embeds: [],
            components: [],
        });
        return;
    }

    await updateCreationMessage(state, {
        ...buildCharacterCardPayload({ character, ownerDiscordId }),
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

    state.data.avatar = attachment.url;
    await message.delete().catch(() => {});

    const payload = {
        embeds: [buildAvatarStepEmbed(state, 'Avatar saved. You can continue.')],
        components: [
            buildAvatarUploadRow(ownerDiscordId),
            ...buildCreationStepActionRows(ownerDiscordId, 'avatar'),
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
    const attachment = attachments.find(item => String(item.contentTypee || '').startsWith('image/')) || attachments[0];
    if (!attachment?.url) return false;

    await message.delete().catch(() => {});

    const storedAvatar = await storeCharacterAvatar(state.characterId, attachment.url);
    clearAvatarUpdateState(message.author.id);

    if (!state.promptMessage?.editable) {
        return true;
    }

    if (!storedAvatar) {
        await state.promptMessage.edit({
            content: 'Avatar could not be saved.',
        }).catch(() => {});
        return true;
    }

    const character = await findCharacterForDiscord(message.author, state.characterId);
    if (!character) {
        await state.promptMessage.edit({ content: 'Character not found.' }).catch(() => {});
        return true;
    }

    await state.promptMessage.edit({
        ...buildCharacterManageView(character, { ownerDiscordId: state.ownerDiscordId }),
        content: '',
    }).catch(() => {});
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
                await activeInteraction.deleteReply().catch(() => {});
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
                        await activeInteraction.deleteReply().catch(() => {});
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
            await activeInteraction.deleteReply().catch(() => {});
        }
        return true;
    }

    return false;
}

async function buildDowntimeStepPayload({ interaction, state, message }) {
    const step = state.step;
    const descriptionMap = {
        duration: 'Choose the downtime duration.',
        date: 'Choose the downtime date.',
        type: 'Choose the downtime type.',
        notes: 'Add or edit notes.',
        confirm: 'Please confirm the details.',
    };
    const description = message || descriptionMap[step] || 'Continue.';

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
        await updateManageMessage(interaction, { content: 'Adventure not found.', embeds: [], components: [] });
        return true;
    }

    const view = buildAdventureManageView({ adventure, participants, ownerDiscordId, characterId });
    await updateManageMessage(interaction, { content: '', embeds: [view.embed], components: view.components });
    return true;
}

async function refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId }) {
    const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
    if (!downtime || Number(downtime.character_id) !== characterId) {
        await updateManageMessage(interaction, { content: 'Downtime not found.', embeds: [], components: [] });
        return true;
    }

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
    if (interaction.isButton() && interaction.customId.startsWith('charactersAction_new_')) {
        const ownerDiscordId = interaction.customId.replace('charactersAction_new_', '');

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Please use this command in a server (not in DMs).', flags: MessageFlags.Ephemeral });
            return true;
        }

        const existingState = getCreationState(ownerDiscordId);
        if (existingState) {
            if (existingState.step === 'basic' && !existingState.promptInteraction) {
                await interaction.showModal(buildCreationBasicModal(ownerDiscordId, existingState));
                return true;
            }

            if (existingState.promptInteraction) {
                await interaction.deferUpdate();
                return true;
            }

            await interaction.reply({
                embeds: [buildCreationEmbed(1, 'Create character', 'You already have an open creation. Please finish it or click **Cancel**.')],
                components: [buildCreationCancelRow(ownerDiscordId)],
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        const state = {
            userId: ownerDiscordId,
            ownerDiscordId,
            channelId: interaction.channelId,
            step: 'basic',
            data: {
                classIds: [],
                isFiller: false,
            },
            promptInteraction: interaction,
            promptMessage: interaction.message ?? null,
        };
        setCreationState(ownerDiscordId, state);

        await interaction.update({
            embeds: [buildCreationBasicsEmbed(state, 'Start with the basic details.')],
            components: buildCreationBasicsRows(ownerDiscordId),
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersSelect_')) {
        const ownerDiscordId = interaction.customId.replace('charactersSelect_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const selectedId = Number(interaction.values[0]);
        if (!Number.isFinite(selectedId) || selectedId < 1) {
            await interaction.reply({ content: 'Invalid selection.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            ...buildCharacterCardPayload({ character, ownerDiscordId }),
            content: '',
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('charactersCreate_basic_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_basic_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const name = interaction.fields.getTextInputValue('createName').trim();
        const externalLink = interaction.fields.getTextInputValue('createLink').trim();
        const notes = interaction.fields.getTextInputValue('createNotes').trim();

        if (!name) {
            await showCreationError(interaction, state, ownerDiscordId, 'Name fehlt.');
            return true;
        }
        if (!isHttpUrl(externalLink)) {
            await showCreationError(interaction, state, ownerDiscordId, 'Der External Link muss eine http/https URL sein.');
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
            await interaction.deleteReply().catch(() => {});
            return true;
        }

        await updateCreationMessage(state, payload);
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_cancel_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_cancel_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        clearCreationState(ownerDiscordId);
        try {
            const characters = await listCharactersForDiscord(interaction.user);
            const listView = buildCharacterListView({ ownerDiscordId, characters });
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
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.classIds = interaction.values.map(value => Number(value)).filter(value => Number.isFinite(value));
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

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersCreate_tier_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_tier_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
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

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersCreate_faction_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_faction_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.faction = interaction.values[0];
        state.step = 'faction';

        await interaction.update({
            embeds: [
                buildCreationEmbed(5, 'Choose faction', 'Choose the faction.'),
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
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
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
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
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
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
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
                    buildCreationEmbed(5, 'Choose faction', 'Choose the faction.'),
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

        await interaction.reply({ content: 'No previous step available.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_next_')) {
        const suffix = interaction.customId.replace('charactersCreate_next_', '');
        const [stepKey, ownerDiscordId] = suffix.split('_');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
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
                    buildCreationEmbed(5, 'Choose faction', 'Choose the faction.'),
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

        await interaction.reply({ content: 'Unknown step.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_basicopen_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_basicopen_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'No active creation found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const dm = await interaction.user.createDM();
        const sourceLink = state?.promptMessage?.url ? `\nBack to character dialog: ${state.promptMessage.url}` : '';
        await dm.send(`Please send your avatar image here. I only store it for this character.${sourceLink}`);

        await interaction.deferUpdate();
        await updateCreationMessage(state, {
            embeds: [buildAvatarStepEmbed(state, 'I sent you a DM. Upload your avatar image there.')],
            components: [
                buildAvatarUploadRow(ownerDiscordId),
                ...buildCreationStepActionRows(ownerDiscordId, 'avatar'),
            ],
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('characterClassesSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const classIds = interaction.values.map(value => Number(value)).filter(value => Number.isFinite(value));
        try {
            const result = await syncCharacterClassesForDiscord(interaction.user, characterId, classIds);
            if (!result.ok) {
                await interaction.reply({ content: 'Classes konnten nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const character = await findCharacterForDiscord(interaction.user, characterId);
            if (!character) {
                await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
                return true;
            }

            await interaction.update({
                ...buildCharacterManageView(character, { ownerDiscordId }),
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const faction = String(interaction.values[0] || '').trim().toLowerCase();
        if (!allowedFactions.has(faction)) {
            await interaction.reply({ content: 'Invalid faction.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateCharacterForDiscord(interaction.user, characterId, { faction });
        if (!result.ok) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            ...buildCharacterManageView(character, { ownerDiscordId }),
            content: '',
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterBasicsModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const name = interaction.fields.getTextInputValue('basicName').trim();
        const url = interaction.fields.getTextInputValue('basicUrl').trim();
        const notes = interaction.fields.getTextInputValue('basicNotes') || '';

        if (!name) {
            await interaction.reply({ content: 'Name fehlt.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isHttpUrl(url)) {
            await interaction.reply({ content: 'Invalid URL (http/https only).', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateCharacterForDiscord(interaction.user, characterId, {
            name,
            externalLink: url,
            notes,
        });

        if (!result.ok) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.reply({
            ...buildCharacterManageView(character, { ownerDiscordId }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterDmBubblesModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const dmBubbles = interaction.fields.getTextInputValue('dmBubbles');
        const result = await updateCharacterForDiscord(interaction.user, characterId, { dmBubbles });
        if (!result.ok) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.reply({
            ...buildCharacterManageView(character, { ownerDiscordId }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterDmCoinsModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const dmCoins = interaction.fields.getTextInputValue('dmCoins');
        const result = await updateCharacterForDiscord(interaction.user, characterId, { dmCoins });
        if (!result.ok) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.reply({
            ...buildCharacterManageView(character, { ownerDiscordId }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('characterBubbleSpendModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const bubbleShopSpend = interaction.fields.getTextInputValue('bubbleSpend');
        const result = await updateCharacterForDiscord(interaction.user, characterId, { bubbleShopSpend });
        if (!result.ok) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Character updated.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.reply({
            ...buildCharacterManageView(character, { ownerDiscordId }),
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('characterCard_')) {
        const [, action, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await interaction.reply({ content: 'Invalid character ID.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'manage') {
            await interaction.update({
                ...buildCharacterManageView(character, { ownerDiscordId }),
                content: '',
            });
            return true;
        }

        if (action === 'del') {
            await interaction.update({
                content: 'Delete character?',
                components: [buildDeleteConfirmRow({ characterId: character.id, ownerDiscordId })],
            });
            return true;
        }

        if (action === 'adv') {
            const row = buildAdventureMenuRow(character, ownerDiscordId);
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'dt') {
            const row = buildDowntimeMenuRow(character, ownerDiscordId);
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'back') {
            await interaction.update({
                components: buildCharacterCardRows({ characterId: character.id, ownerDiscordId, isFiller: character.is_filler }),
                content: '',
            });
            return true;
        }

        if (action === 'list') {
            await interaction.deferUpdate();
            try {
                const characters = await listCharactersForDiscord(interaction.user);
                const listView = buildCharacterListView({
                    ownerDiscordId,
                    characters,
                });
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

        await interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Invalid character ID.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Character not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'back') {
            await interaction.update({
                ...buildCharacterCardPayload({ character, ownerDiscordId }),
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
                .setLabel('External Link (URL)')
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
            await dm.send(`Please send your avatar image here. I only store it for this character.${sourceLink}`);

            clearAvatarUpdateState(ownerDiscordId);
            setAvatarUpdateState(ownerDiscordId, {
                ownerDiscordId,
                characterId: character.id,
                promptMessage: interaction.message ?? null,
            });

            await interaction.update({
                ...buildCharacterManageView(character, { ownerDiscordId }),
                content: '',
            });
            return true;
        }

        if (action === 'classes') {
            try {
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
            const factionView = buildCharacterFactionView({ character, ownerDiscordId });
            await interaction.update({
                embeds: [factionView.embed],
                components: factionView.components,
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
            const modal = new ModalBuilder()
                .setCustomId(`characterBubbleSpendModal_${character.id}_${ownerDiscordId}`)
                .setTitle('Bubble Shop Spend');

            const spendInput = new TextInputBuilder()
                .setCustomId('bubbleSpend')
                .setLabel('Bubble Shop Spend')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(safeModalValue(String(character.bubble_shop_spend ?? 0)));

            modal.addComponents(new ActionRowBuilder().addComponents(spendInput));
            await interaction.showModal(modal);
            return true;
        }

        await interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteCharacter')) {
        const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(idRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await interaction.reply({ content: 'Invalid character ID.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await updateCharacterListMessage(interaction, ownerDiscordId);
        } catch (error) {
            // eslint-disable-next-line no-console
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            await interaction.update({ content: '', embeds: [], components: [buildAdventureMenuRow({ id: characterId }, ownerDiscordId)] });
            return true;
        }

        if (state.step === 'duration') {
            clearAdventureCreationState(ownerDiscordId);
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        clearAdventureCreationState(ownerDiscordId);
        await interaction.update({ content: '', embeds: [], components: [buildAdventureMenuRow({ id: characterId }, ownerDiscordId)] });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advCreate_next_')) {
        const match = interaction.customId.match(/^advCreate_next_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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

            if (isEdit && adventureId) {
                await syncAdventureParticipantsForDiscord(interaction.user, adventureId, {
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        let state = getAdventureCreationState(ownerDiscordId);
        if (!state) {
            state = createAdventureState({ ownerDiscordId, characterId });
            setAdventureCreationState(ownerDiscordId, state);
        }

        ensurePromptMessage(state, interaction);
        const selectedIds = Array.from(
            new Set((interaction.values || [])
                .map(value => Number(value))
                .filter(value => Number.isFinite(value) && value > 0)),
        );
        state.data.guildCharacterIds = selectedIds;

        await updateAdventureMessage(state, await buildAdventureStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        try {
            const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
            if (adventures.length === 0) {
                await updateManageMessage(interaction, { content: 'No adventures found.', embeds: [], components: [] });
                return true;
            }
            await updateManageMessage(interaction, {
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Adventure').setDescription('Choose an adventure.')],
                components: buildAdventureListRows({ characterId, ownerDiscordId, adventures }),
                content: '',
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await updateManageMessage(interaction, {
                    content: notLinkedContent(),
                    components: [buildNotLinkedButtons(interaction.user.id)],
                    embeds: [],
                });
                return true;
            }
            await updateManageMessage(interaction, { content: 'Failed to load adventures.', embeds: [], components: [] });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            message: 'Choose the downtime duration.',
        }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_duration_custom_')) {
        const match = interaction.customId.match(/^dtCreate_duration_custom_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
                message: 'Invalid duration. Use HH:MM (e.g. 03:00), 400h 30m, or minutes.',
            }));
            return true;
        }

        state.data.durationSeconds = duration;
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_date_custom_')) {
        const match = interaction.customId.match(/^dtCreate_date_custom_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
                message: 'Invalid date. Use YYYY-MM-DD.',
            }));
            return true;
        }

        state.data.startDate = startDate;
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dtCreate_type_')) {
        const parts = interaction.customId.split('_');
        const characterId = Number(parts[2]);
        const ownerDiscordId = parts[3];
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        state.data.type = interaction.values?.[0] === 'faction' ? 'faction' : 'other';
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_notes_edit_')) {
        const match = interaction.customId.match(/^dtCreate_notes_edit_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        state.data.notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_back_')) {
        const match = interaction.customId.match(/^dtCreate_back_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        if (state.step === 'duration') {
            clearDowntimeCreationState(ownerDiscordId);
            await interaction.update({ content: '', embeds: [], components: [buildDowntimeMenuRow({ id: characterId }, ownerDiscordId)] });
            return true;
        }

        state.step = getDowntimePreviousStep(state.step);
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_cancel_')) {
        const match = interaction.customId.match(/^dtCreate_cancel_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        clearDowntimeCreationState(ownerDiscordId);
        await interaction.update({ content: '', embeds: [], components: [buildDowntimeMenuRow({ id: characterId }, ownerDiscordId)] });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_next_')) {
        const match = interaction.customId.match(/^dtCreate_next_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getDowntimeCreationState(ownerDiscordId);
        if (!state) return false;

        if (state.step === 'duration' && (state.data.durationSeconds === null || state.data.durationSeconds === undefined)) {
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: 'Please set a duration before continuing.',
            }));
            return true;
        }

        if (state.step === 'date' && !state.data.startDate) {
            await updateDowntimeMessage(state, await buildDowntimeStepPayload({
                interaction,
                state,
                message: 'Please set a date before continuing.',
            }));
            return true;
        }

        state.step = getDowntimeNextStep(state.step);
        ensurePromptMessage(state, interaction);
        await updateDowntimeMessage(state, await buildDowntimeStepPayload({ interaction, state }));
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtCreate_confirm_')) {
        const match = interaction.customId.match(/^dtCreate_confirm_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const typeRaw = String(interaction.fields.getTextInputValue('dtTypee') || '').trim().toLowerCase();
        const normalizedTypee = (() => {
            if (['faction', 'f', '1'].includes(typeRaw)) return 'faction';
            if (['other', 'o', '2'].includes(typeRaw)) return 'other';
            return null;
        })();
        if (!normalizedTypee) {
            await interaction.reply({ content: 'Invalid type. Use `faction` or `other`.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();

        if (duration === null) {
            await interaction.reply({ content: 'Invalid duration. Use HH:MM (e.g. 03:00), 400h 30m, or minutes.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Invalid date. Use YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
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
                await interaction.reply({ content: 'Downtime could not be saved.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const downtime = await findDowntimeForDiscord(interaction.user, result.id);
            if (!downtime) {
                await interaction.reply({ content: 'Downtime saved.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const view = buildDowntimeManageView({ downtime, ownerDiscordId, characterId });
            await interaction.reply({
                embeds: [view.embed],
                components: view.components,
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Failed to save downtime.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await updateManageMessage(interaction, { content: 'You cannot perform this action.', embeds: [], components: [] });
            return true;
        }

        try {
            const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
            if (downtimes.length === 0) {
                await updateManageMessage(interaction, { content: 'No downtimes found.', embeds: [], components: [] });
                return true;
            }
            await updateManageMessage(interaction, {
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('Choose a downtime.')],
                components: [buildDowntimeListRow({ characterId, ownerDiscordId, downtimes })],
                content: '',
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await updateManageMessage(interaction, {
                    content: notLinkedContent(),
                    components: [buildNotLinkedButtons(interaction.user.id)],
                    embeds: [],
                });
                return true;
            }
            await updateManageMessage(interaction, { content: 'Failed to load downtimes.', embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const adventureId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(adventureId) || adventureId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`advParticipantsSearchModal_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setTitle('Search participants');

        const searchInput = new TextInputBuilder()
            .setCustomId('participantSearch')
            .setLabel('Search (name or label)')
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        setParticipantSearch(adventureId, ownerDiscordId, interaction.fields.getTextInputValue('participantSearch'));
        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.reply({ embeds: [view.embed], components: view.components, flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advParticipantsSelect_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const allyIds = [];
        const guildCharacterIds = [];
        for (const value of interaction.values ?? []) {
            const [type, idRaw] = String(value).split(':');
            const id = Number(idRaw);
            if (!Number.isFinite(id) || id < 1) continue;
            if (type === 'ally') allyIds.push(id);
            if (type === 'guild') guildCharacterIds.push(id);
        }

        const result = await syncAdventureParticipantsForDiscord(interaction.user, adventureId, {
            characterId,
            allyIds,
            guildCharacterIds,
        });

        if (!result.ok) {
            await interaction.reply({ content: 'Participants could not be saved.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        if (duration === null) {
            await interaction.reply({ content: 'Invalid duration. Use HH:MM (e.g. 03:00), 400h 30m, or minutes.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateAdventureForDiscord(interaction.user, adventureId, { duration });
        if (!result.ok) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        if (!startDate) {
            await interaction.reply({ content: 'Invalid date. Use YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateAdventureForDiscord(interaction.user, adventureId, { startDate });
        if (!result.ok) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();
        const result = await updateAdventureForDiscord(interaction.user, adventureId, { title, gameMaster });
        if (!result.ok) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const notes = (interaction.fields.getTextInputValue('advNotes') || '').trim();
        const result = await updateAdventureForDiscord(interaction.user, adventureId, { notes });
        if (!result.ok) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = buildAdventureQuestManageView({ adventure, ownerDiscordId, characterId });
        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advManage_questSelect_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: adventureId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const value = String(interaction.values?.[0] || '').toLowerCase();
        const hasAdditionalBubble = value === 'yes';
        const result = await updateAdventureForDiscord(interaction.user, adventureId, { hasAdditionalBubble });
        if (!result.ok) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: 'Delete adventure?',
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteAdventureCancel') {
            await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
            return true;
        }

        if (action !== 'deleteAdventureConfirm') return false;

        try {
            const result = await softDeleteAdventureForDiscord(interaction.user, adventureId);
            if (!result.ok) {
                await interaction.update({ content: 'Adventure not found or already deleted.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back to list')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: 'Adventure deleted.', embeds: [], components: [row] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: `Delete failed: ${error.message}`, embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
        if (adventures.length === 0) {
            await interaction.update({ content: 'No adventures found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Adventure').setDescription('Choose an adventure.')],
            components: buildAdventureListRows({ characterId, ownerDiscordId, adventures }),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advListBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            ...buildCharacterCardPayload({ character, ownerDiscordId }),
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtManage_back_')) {
        const parsed = parseManageIds(interaction.customId);
        if (!parsed) return false;
        const { recordId: downtimeId, characterId, ownerDiscordId } = parsed;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        if (duration === null) {
            await interaction.reply({ content: 'Invalid duration. Use HH:MM (e.g. 03:00), 400h 30m, or minutes.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { duration });
        if (!result.ok) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        if (!startDate) {
            await interaction.reply({ content: 'Invalid date. Use YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { startDate });
        if (!result.ok) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const typeValue = String(interaction.values?.[0] || '').toLowerCase();
        if (typeValue !== 'faction' && typeValue !== 'other') {
            await interaction.reply({ content: 'Invalid type. Use `faction` or `other`.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { type: typeValue });
        if (!result.ok) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();
        const result = await updateDowntimeForDiscord(interaction.user, downtimeId, { notes });
        if (!result.ok) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: 'Delete downtime?',
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
                await interaction.update({ content: 'Downtime not found or already deleted.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back to list')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: 'Downtime deleted.', embeds: [], components: [row] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: `Delete failed: ${error.message}`, embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
        if (downtimes.length === 0) {
            await interaction.update({ content: 'No downtimes found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('Choose a downtime.')],
            components: [buildDowntimeListRow({ characterId, ownerDiscordId, downtimes })],
            content: '',
        });
        return true;
    }

    return false;
}

module.exports = { handle, handleCreationAvatarMessage, handleAvatarUpdateMessage };
