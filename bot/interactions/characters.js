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

const {
    DiscordNotLinkedError,
    createCharacterForDiscord,
    listCharactersForDiscord,
    findCharacterForDiscord,
    updateCharacterForDiscord,
    listCharacterClassesForDiscord,
    listCharacterClassIdsForDiscord,
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
    buildCharacterEmbed,
    resolvePublicAvatarUrl,
    tryBuildLocalAvatarAttachment,
    buildCharacterListView,
} = require('../commands/game/characters');

const { replyNotLinked, notLinkedContent, buildNotLinkedButtons } = require('../linkingUi');
const {
    pendingCharacterCreations,
    pendingCharacterAvatarUpdates,
    pendingAdventureCreations,
    pendingDowntimeCreations,
    participantReturnTargets,
} = require('../state');

function isOwnerOfInteraction(interaction, ownerDiscordId) {
    return String(interaction.user.id) === String(ownerDiscordId);
}

function participantReturnKey(adventureId, ownerDiscordId) {
    return `${adventureId}:${ownerDiscordId}`;
}

function getParticipantReturnTarget(adventureId, ownerDiscordId) {
    return participantReturnTargets.get(participantReturnKey(adventureId, ownerDiscordId)) || 'detail';
}

function setParticipantReturnTarget(adventureId, ownerDiscordId, target) {
    participantReturnTargets.set(participantReturnKey(adventureId, ownerDiscordId), target);
}

function clearParticipantReturnTarget(adventureId, ownerDiscordId) {
    participantReturnTargets.delete(participantReturnKey(adventureId, ownerDiscordId));
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

function isHttpUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function safeModalValue(value, max = 4000) {
    const text = String(value ?? '');
    if (text.length <= max) return text;
    return text.slice(0, max);
}

function parseIsoDate(value) {
    const raw = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    return raw;
}

const adventureParticipantSearch = new Map();

function participantSearchKey(adventureId, ownerDiscordId) {
    return `${adventureId}:${ownerDiscordId}`;
}

function setParticipantSearch(adventureId, ownerDiscordId, query) {
    const key = participantSearchKey(adventureId, ownerDiscordId);
    const text = String(query || '').trim();
    if (!text) {
        adventureParticipantSearch.delete(key);
        return '';
    }
    adventureParticipantSearch.set(key, text);
    return text;
}

function getParticipantSearch(adventureId, ownerDiscordId) {
    return adventureParticipantSearch.get(participantSearchKey(adventureId, ownerDiscordId)) || '';
}

function formatDuration(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatParticipantName(participant) {
    const rawName = String(participant?.name || '').trim();
    const linkedName = String(participant?.linked_name || '').trim();
    if (linkedName && rawName && linkedName.toLowerCase() !== rawName.toLowerCase()) {
        return `${linkedName} (${rawName})`;
    }
    return linkedName || rawName || 'Unbekannt';
}

function formatParticipantList(participants) {
    if (!participants || participants.length === 0) return 'No participants';
    const names = participants.map(formatParticipantName);
    const joined = names.join(', ');
    if (joined.length <= 1024) return joined;
    const trimmed = names.slice(0, 10).join(', ');
    const remaining = Math.max(0, names.length - 10);
    return `${trimmed}${remaining > 0 ? ` (+${remaining} weitere)` : ''}`;
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
const allowedFactions = new Set([
    'none',
    'heiler',
    'handwerker',
    'feldforscher',
    'bibliothekare',
    'diplomaten',
    'gardisten',
    'unterhalter',
    'logistiker',
    'flora & fauna',
]);

function formatFactionLabel(value) {
    const text = String(value || '').trim();
    if (!text || text === 'none') return 'None';
    return text
        .split(' ')
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : word)
        .join(' ');
}

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

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

function buildCharacterManageRows({ characterId, ownerDiscordId }) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_basic_${characterId}_${ownerDiscordId}`)
                .setLabel('Name/Link/Notes')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_avatar_${characterId}_${ownerDiscordId}`)
                .setLabel('Avatar')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_classes_${characterId}_${ownerDiscordId}`)
                .setLabel('Classes')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_faction_${characterId}_${ownerDiscordId}`)
                .setLabel('Faction')
                .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_dm_bubbles_${characterId}_${ownerDiscordId}`)
                .setLabel('DM Bubbles')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_dm_coins_${characterId}_${ownerDiscordId}`)
                .setLabel('DM Coins')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_bubble_spend_${characterId}_${ownerDiscordId}`)
                .setLabel('Bubble Shop')
                .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCharacterManageView(character, { ownerDiscordId }) {
    const name = String(character.name || `Character ${character.id}`);
    const classNames = String(character.class_names || '').trim() || '-';
    const isFiller = Boolean(character.is_filler);
    const startTierRaw = String(character.start_tier || '').trim();
    const startTier = isFiller ? 'Filler' : (startTierRaw ? startTierRaw.toUpperCase() : '-');
    const version = String(character.version || '2024');
    const faction = formatFactionLabel(character.faction);
    const notesRaw = String(character.notes || '').trim();
    const notes = notesRaw ? notesRaw.slice(0, 1000) : '-';
    const avatarRaw = String(character.avatar || '').trim();
    const avatar = avatarRaw ? 'Present' : 'No avatar';
    const externalLink = String(character.external_link || character.externalLink || '').trim();
    const linkValue = externalLink
        ? (isHttpUrl(externalLink) ? `[Open link](${externalLink})` : externalLink.slice(0, 1000))
        : '-';
    const dmBubbles = String(safeInt(character.dm_bubbles));
    const dmCoins = String(safeInt(character.dm_coins));
    const bubbleSpend = String(safeInt(character.bubble_shop_spend));

    const descriptionParts = [name];
    if (startTier !== '-') {
        descriptionParts.push(startTier);
    }

    const embed = new EmbedBuilder()
        .setTitle('Manage character')
        .setColor(0x4f46e5)
        .setDescription(descriptionParts.join(' - '))
        .addFields(
            { name: 'Classes', value: classNames, inline: false },
            { name: 'Faction', value: faction, inline: true },
            { name: 'Version', value: version, inline: true },
            { name: 'Starting tier', value: startTier, inline: true },
            { name: 'Avatar', value: avatar, inline: true },
            { name: 'External Link', value: linkValue, inline: false },
            { name: 'Notes', value: notes, inline: false },
            { name: 'DM Bubbles', value: dmBubbles, inline: true },
            { name: 'DM Coins', value: dmCoins, inline: true },
            { name: 'Bubble Shop', value: bubbleSpend, inline: true },
        );

    return {
        embeds: [embed],
        components: buildCharacterManageRows({ characterId: character.id, ownerDiscordId }),
    };
}

function buildCharacterCardPayload({ character, ownerDiscordId }) {
    const attachment = tryBuildLocalAvatarAttachment(character);
    const url = resolvePublicAvatarUrl(character.avatar);

    const files = [];
    let thumbnail = url;
    if (attachment) {
        files.push({ attachment: attachment.filePath, name: attachment.fileName });
        thumbnail = `attachment://${attachment.fileName}`;
    }

    return {
        embeds: [buildCharacterEmbed(character, { thumbnailUrlOrAttachment: thumbnail })],
        components: buildCharacterCardRows({
            ownerDiscordId,
            characterId: character.id,
            isFiller: character.is_filler,
        }),
        files,
    };
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

function getAdventureStepNumber(stepKey) {
    const index = adventureCreationSteps.indexOf(stepKey);
    return index >= 0 ? index + 1 : 1;
}

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

function getDowntimeStepNumber(stepKey) {
    const index = downtimeCreationSteps.indexOf(stepKey);
    return index >= 0 ? index + 1 : 1;
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

function buildStepperNavRows({
    backId,
    nextId,
    cancelId,
    nextLabel = 'Next',
    nextStyle = ButtonStyle.Primary,
    disableNext = false,
    disableBack = false,
    cancelLabel = 'Cancel',
}) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(backId)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disableBack),
            new ButtonBuilder()
                .setCustomId(nextId)
                .setLabel(nextLabel)
                .setStyle(nextStyle)
                .setDisabled(disableNext),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(cancelId)
                .setLabel(cancelLabel)
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function truncateText(value, max = 200) {
    const text = String(value || '').trim();
    if (!text) return '-';
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}...`;
}

function getAdventureFieldValues(state, participantsLabel) {
    const duration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined
        ? formatDuration(state.data.durationSeconds)
        : '-';
    const date = state?.data?.startDate || '-';
    const title = state?.data?.title ? truncateText(state.data.title, 120) : '-';
    const gameMaster = state?.data?.gameMaster ? truncateText(state.data.gameMaster, 120) : '-';
    const quest = state?.data?.hasAdditionalBubble === true
        ? 'Yes (+1 bubble)'
        : state?.data?.hasAdditionalBubble === false
            ? 'No'
            : '-';
    const notes = state?.data?.notes ? truncateText(state.data.notes, 200) : '-';
    const participants = participantsLabel || (state?.data?.guildCharacterIds?.length ? `${state.data.guildCharacterIds.length} selected` : '-');

    return { duration, date, title, gameMaster, quest, notes, participants };
}

function formatAdventureSummaryFields(state, participantsLabel) {
    const values = getAdventureFieldValues(state, participantsLabel);
    return [
        { name: 'Duration', value: values.duration, inline: true },
        { name: 'Date', value: values.date, inline: true },
        { name: 'Character quest', value: values.quest, inline: true },
        { name: 'Title', value: values.title, inline: false },
        { name: 'Game Master', value: values.gameMaster, inline: false },
        { name: 'Notes', value: values.notes, inline: false },
        { name: 'Participants', value: values.participants, inline: false },
    ];
}

function formatAdventureStepFields(stepKey, state, participantsLabel) {
    const values = getAdventureFieldValues(state, participantsLabel);
    switch (stepKey) {
        case 'duration':
            return [{ name: 'Duration', value: values.duration, inline: true }];
        case 'date':
            return [{ name: 'Date', value: values.date, inline: true }];
        case 'title':
            return [
                { name: 'Title', value: values.title, inline: false },
                { name: 'Game Master', value: values.gameMaster, inline: false },
            ];
        case 'quest':
            return [{ name: 'Character quest', value: values.quest, inline: true }];
        case 'notes':
            return [{ name: 'Notes', value: values.notes, inline: false }];
        case 'participants':
            return [{ name: 'Participants', value: values.participants, inline: false }];
        default:
            return [];
    }
}

function buildAdventureStepEmbed(stepKey, state, description, participantsLabel) {
    const stepNumber = getAdventureStepNumber(stepKey);
    const title = state?.mode === 'edit' ? 'Edit adventure' : 'Create adventure';
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .setDescription(description)
        .setFooter({ text: `Step ${stepNumber}/7` });

    const fields = stepKey === 'confirm'
        ? formatAdventureSummaryFields(state, participantsLabel)
        : formatAdventureStepFields(stepKey, state, participantsLabel);
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    return embed;
}

function buildAdventureDurationRows(state) {
    const { characterId, ownerDiscordId } = state;
    const hasDuration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_10800_${characterId}_${ownerDiscordId}`)
                .setLabel('1 Bubble (3h)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_21600_${characterId}_${ownerDiscordId}`)
                .setLabel('2 Bubble (6h)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_32400_${characterId}_${ownerDiscordId}`)
                .setLabel('3 Bubble (9h)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_custom_${characterId}_${ownerDiscordId}`)
                .setLabel('Custom duration')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: !hasDuration,
    }));
}

function buildAdventureDateRows(state) {
    const { characterId, ownerDiscordId } = state;
    const hasDate = Boolean(state?.data?.startDate);
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_date_today_${characterId}_${ownerDiscordId}`)
                .setLabel('Today')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_date_yesterday_${characterId}_${ownerDiscordId}`)
                .setLabel('Yesterday')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_date_custom_${characterId}_${ownerDiscordId}`)
                .setLabel('Custom date')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: !hasDate,
    }));
}

function buildAdventureTitleRows(state) {
    const { characterId, ownerDiscordId } = state;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_title_edit_${characterId}_${ownerDiscordId}`)
                .setLabel('Edit title & GM')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
    }));
}

function buildAdventureQuestRows(state) {
    const { characterId, ownerDiscordId } = state;
    const selected = state?.data?.hasAdditionalBubble;

    const select = new StringSelectMenuBuilder()
        .setCustomId(`advCreate_quest_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select character quest...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Yes, character quest (+1 bubble)')
                .setValue('yes')
                .setDefault(selected === true),
            new StringSelectMenuOptionBuilder()
                .setLabel('No')
                .setValue('no')
                .setDefault(selected === false),
        );

    return [new ActionRowBuilder().addComponents(select)].concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: selected === null || selected === undefined,
    }));
}

function buildAdventureNotesRows(state) {
    const { characterId, ownerDiscordId } = state;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_notes_edit_${characterId}_${ownerDiscordId}`)
                .setLabel('Edit notes')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
    }));
}

function buildAdventureParticipantsRows(state, options) {
    const { characterId, ownerDiscordId } = state;
    const selectedIds = new Set((state?.data?.guildCharacterIds || []).map(String));
    const components = [];

    if (options.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`advCreate_participants_${characterId}_${ownerDiscordId}`)
            .setPlaceholder('Select participants...')
            .setMinValues(0)
            .setMaxValues(Math.min(25, options.length));

        options.slice(0, 25).forEach(option => {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(String(option.name).slice(0, 100))
                    .setValue(String(option.id))
                    .setDefault(selectedIds.has(String(option.id))),
            );
        });

        components.push(new ActionRowBuilder().addComponents(select));
    } else {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_participants_empty_${characterId}_${ownerDiscordId}`)
                .setLabel('No participants available')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        ));
    }

    return components.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
    }));
}

function buildAdventureConfirmRows(state) {
    const { characterId, ownerDiscordId } = state;
    const confirmLabel = state?.mode === 'edit' ? 'Save adventure' : 'Create adventure';
    const confirmStyle = state?.mode === 'edit' ? ButtonStyle.Primary : ButtonStyle.Success;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_back_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advCreate_confirm_${characterId}_${ownerDiscordId}`)
                .setLabel(confirmLabel)
                .setStyle(confirmStyle),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_cancel_${characterId}_${ownerDiscordId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAdventureMenuRow(character, ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`advAdd_${character.id}_${ownerDiscordId}`)
            .setLabel('New adventure')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`advList_${character.id}_${ownerDiscordId}`)
            .setLabel('List')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeMenuRow(character, ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`dtAdd_${character.id}_${ownerDiscordId}`)
            .setLabel('Add downtime')
            .setStyle(ButtonStyle.Success)
            .setDisabled(Boolean(character.is_filler)),
        new ButtonBuilder()
            .setCustomId(`dtList_${character.id}_${ownerDiscordId}`)
            .setLabel('List')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(character.is_filler)),
        new ButtonBuilder()
            .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary),
    );
}

function formatSelectedParticipantNames(options, selectedIds, maxLength = 900) {
    if (!selectedIds || selectedIds.length === 0) return '-';
    const selectedSet = new Set(selectedIds.map(String));
    const names = options
        .filter(entry => selectedSet.has(String(entry.id)))
        .map(entry => String(entry.name || '').trim())
        .filter(Boolean);
    if (names.length === 0) return '-';
    const joined = names.join(', ');
    if (joined.length <= maxLength) return joined;
    const trimmed = names.slice(0, 10).join(', ');
    const remaining = Math.max(0, names.length - 10);
    return `${trimmed}${remaining > 0 ? ` (+${remaining} weitere)` : ''}`;
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
            embeds: [buildAdventureStepEmbed(step, state, message || 'Add optional notes.', participantsLabel)],
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

    if (state?.promptMessage?.editable) {
        try {
            await state.promptMessage.edit(payload);
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
                    return true;
                }
            }
        } catch {
            // fall through
        }
    }

    if (activeInteraction?.isMessageComponent?.() || activeInteraction?.isModalSubmit?.()) {
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

    return false;
}

function buildAdventureDurationModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_durationModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Enter duration');

    const durationValue = state?.data?.durationSeconds
        ? formatDuration(state.data.durationSeconds)
        : '';

    const durationInput = new TextInputBuilder()
        .setCustomId('advDuration')
        .setLabel('Duration (HH:MM, 400h 30m, or minutes)')
        .setPlaceholder('03:00')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(durationValue));

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildAdventureDateModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_dateModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Enter date');

    const dateInput = new TextInputBuilder()
        .setCustomId('advDate')
        .setLabel('Date (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.startDate || new Date().toISOString().slice(0, 10), 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildAdventureTitleModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_titleModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Title & GM');

    const titleInput = new TextInputBuilder()
        .setCustomId('advTitle')
        .setLabel('Title (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.title));

    const gmInput = new TextInputBuilder()
        .setCustomId('advGm')
        .setLabel('Game Master (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.gameMaster));

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(gmInput),
    );
    return modal;
}

function buildAdventureNotesModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_notesModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Notes');

    const notesInput = new TextInputBuilder()
        .setCustomId('advNotes')
        .setLabel('Notes (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.notes));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
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

function buildCreationCancelRow(ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCreationEmbed(step, title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .setDescription(description)
        .setFooter({ text: `Step ${step}/7` });
}

function buildClassesRow({ ownerDiscordId, classes, selectedIds }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`charactersCreate_classes_${ownerDiscordId}`)
        .setPlaceholder('Select classes...')
        .setMinValues(1)
        .setMaxValues(Math.min(25, classes.length));

    const selectedSet = new Set(selectedIds.map(String));

    classes.slice(0, 25).forEach(entry => {
        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(String(entry.name).slice(0, 100))
                .setValue(String(entry.id))
                .setDefault(selectedSet.has(String(entry.id))),
        );
    });

    return new ActionRowBuilder().addComponents(select);
}

function buildStartTierRow(ownerDiscordId, selectedValue) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`charactersCreate_tier_${ownerDiscordId}`)
        .setPlaceholder('Select starting tier...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
            { label: 'BT', value: 'bt' },
            { label: 'LT', value: 'lt' },
            { label: 'HT', value: 'ht' },
            { label: 'Filler', value: 'filler' },
        ].map(option =>
            new StringSelectMenuOptionBuilder()
                .setLabel(option.label)
                .setValue(option.value)
                .setDefault(option.value === selectedValue),
        ));

    return new ActionRowBuilder().addComponents(select);
}

function getStartTierSelection(state) {
    if (state?.data?.isFiller) {
        return 'filler';
    }
    return state?.data?.startTier;
}

function buildFactionRow(ownerDiscordId, selectedValue) {
    const options = [
        { label: 'None', value: 'none' },
        { label: 'Heiler', value: 'heiler' },
        { label: 'Handwerker', value: 'handwerker' },
        { label: 'Feldforscher', value: 'feldforscher' },
        { label: 'Bibliothekare', value: 'bibliothekare' },
        { label: 'Diplomaten', value: 'diplomaten' },
        { label: 'Gardisten', value: 'gardisten' },
        { label: 'Unterhalter', value: 'unterhalter' },
        { label: 'Logistiker', value: 'logistiker' },
        { label: 'Flora & Fauna', value: 'flora & fauna' },
    ];

    const select = new StringSelectMenuBuilder()
        .setCustomId(`charactersCreate_faction_${ownerDiscordId}`)
        .setPlaceholder('Select faction...')
        .setMinValues(1)
        .setMaxValues(1);

    options.forEach(option => {
        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(option.label)
                .setValue(option.value)
                .setDefault(option.value === selectedValue),
        );
    });

    return new ActionRowBuilder().addComponents(select);
}

function buildVersionRow(ownerDiscordId, selectedValue) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`charactersCreate_version_${ownerDiscordId}`)
        .setPlaceholder('Select version...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
            { label: '2014', value: '2014' },
            { label: '2024', value: '2024' },
        ].map(option =>
            new StringSelectMenuOptionBuilder()
                .setLabel(option.label)
                .setValue(option.value)
                .setDefault(option.value === selectedValue),
        ));

    return new ActionRowBuilder().addComponents(select);
}

function buildCreationConfirmRows(ownerDiscordId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_back_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersCreate_confirm_${ownerDiscordId}`)
                .setLabel('Create character')
                .setStyle(ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCreationBasicsRows(ownerDiscordId) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_basicopen_${ownerDiscordId}`)
                .setLabel('Weiter')
                .setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCreationStepActionRows(ownerDiscordId, stepKey) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_back_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersCreate_next_${stepKey}_${ownerDiscordId}`)
                .setLabel('Weiter')
                .setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAvatarUploadRow(ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersCreate_avatar_dm_${ownerDiscordId}`)
            .setLabel('Upload avatar in DM')
            .setStyle(ButtonStyle.Primary),
    );
}

function buildCreationBasicsEmbed(state, message) {
    const embed = buildCreationEmbed(1, 'Create character', message || 'Bearbeite die Basisangaben.');
    embed.addFields(
        { name: 'Name', value: state?.data?.name || '-', inline: false },
        { name: 'External Link', value: state?.data?.externalLink || '-', inline: false },
        { name: 'Avatar', value: state?.data?.avatar || 'No avatar', inline: false },
        { name: 'Notes', value: state?.data?.notes || '-', inline: false },
    );
    return embed;
}

function buildAvatarStepEmbed(state, message) {
    const description = message
        || 'Upload an avatar image (optional). Use **Upload avatar in DM** and click **Next**.';
    const embed = buildCreationEmbed(2, 'Upload avatar', description);
    embed.addFields({
        name: 'Avatar',
        value: state?.data?.avatar ? 'Uploaded' : 'No avatar',
        inline: false,
    });
    return embed;
}

async function buildCreationSummaryEmbed(state) {
    const classes = await listCharacterClassesForDiscord();
    const classById = new Map(classes.map(entry => [Number(entry.id), entry.name]));
    const classNames = (state.data.classIds || [])
        .map(id => classById.get(Number(id)))
        .filter(Boolean);

    const tierLabel = state.data.isFiller ? 'Filler' : String(state.data.startTier || '').toUpperCase();
    const embed = new EmbedBuilder()
        .setTitle('Zusammenfassung')
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Name', value: state.data.name || '-', inline: false },
            { name: 'External Link', value: state.data.externalLink || '-', inline: false },
            { name: 'Avatar', value: state.data.avatar || 'No avatar', inline: false },
            { name: 'Classes', value: classNames.length > 0 ? classNames.join(', ') : '-', inline: false },
            { name: 'Starting tier', value: tierLabel || '-', inline: true },
            { name: 'Faction', value: state.data.faction || 'none', inline: true },
            { name: 'Version', value: state.data.version || '2024', inline: true },
            { name: 'Notes', value: state.data.notes ? state.data.notes : '-', inline: false },
        );

    return embed;
}

function buildCreationBasicModal(ownerDiscordId, state) {
    const modal = new ModalBuilder()
        .setCustomId(`charactersCreate_basic_${ownerDiscordId}`)
        .setTitle('Create character');

    const nameInput = new TextInputBuilder()
        .setCustomId('createName')
        .setLabel('Character name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.name));

    const linkInput = new TextInputBuilder()
        .setCustomId('createLink')
        .setLabel('External Link (URL)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.externalLink));

    const notesInput = new TextInputBuilder()
        .setCustomId('createNotes')
        .setLabel('Notes (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.notes));

    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(linkInput),
        new ActionRowBuilder().addComponents(notesInput),
    );

    return modal;
}

async function updateCreationReply(state, payload) {
    const interaction = state?.promptInteraction;
    if (!interaction || !interaction.isRepliable?.()) return;

    if (interaction.replied || interaction.deferred) {
        await interaction.editReply(payload);
        return;
    }

    const replyPayload = {
        ...payload,
        flags: payload?.flags ?? MessageFlags.Ephemeral,
    };

    await interaction.reply(replyPayload);
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
                'Content-Typee': 'application/json',
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

        const contentTypee = String(response.headers.get('content-type') || '');

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            const preview = text.length > 300 ? `${text.slice(0, 300)}...` : text;
            console.warn(`[bot] Avatar upload failed (${response.status}). content-type=${contentTypee} body=${preview}`);
            return false;
        }

        if (!contentTypee.includes('application/json')) {
            const text = await response.text().catch(() => '');
            const preview = text.length > 300 ? `${text.slice(0, 300)}...` : text;
            console.warn(`[bot] Avatar upload unexpected response. content-type=${contentTypee} body=${preview}`);
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
    const attachment = attachments.find(item => String(item.contentTypee || '').startsWith('image/')) || attachments[0];
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


async function buildCharacterClassesView({ interaction, character, ownerDiscordId }) {
    const classes = await listCharacterClassesForDiscord();
    const selectedIds = await listCharacterClassIdsForDiscord(interaction.user, character.id);
    const selectedSet = new Set(selectedIds.map(String));

    const select = new StringSelectMenuBuilder()
        .setCustomId(`characterClassesSelect_${character.id}_${ownerDiscordId}`)
        .setPlaceholder('Select classes...')
        .setMinValues(0)
        .setMaxValues(Math.min(25, classes.length));

    classes.slice(0, 25).forEach(entry => {
        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(String(entry.name).slice(0, 100))
                .setValue(String(entry.id))
                .setDefault(selectedSet.has(String(entry.id))),
        );
    });

    const embed = new EmbedBuilder()
        .setTitle('Classes')
        .setColor(0x4f46e5)
        .setDescription(`Selected for ${character.name}.`);

    const components = [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${character.id}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embed, components };
}

function buildCharacterFactionView({ character, ownerDiscordId }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`characterFactionSelect_${character.id}_${ownerDiscordId}`)
        .setPlaceholder('Select faction...')
        .setMinValues(1)
        .setMaxValues(1);

    Array.from(allowedFactions).forEach(faction => {
        select.addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(formatFactionLabel(faction))
                .setValue(String(faction))
                .setDefault(String(character.faction || 'none') === String(faction)),
        );
    });

    const embed = new EmbedBuilder()
        .setTitle('Faction')
        .setColor(0x4f46e5)
        .setDescription(`Selected for ${character.name}.`);

    const components = [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${character.id}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embed, components };
}

function buildDeleteConfirmRow({ characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteCharacterConfirm_${characterId}_${ownerDiscordId}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteCharacterCancel_${characterId}_${ownerDiscordId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildAdventureDeleteConfirmRow({ adventureId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteAdventureConfirm_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteAdventureCancel_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeDeleteConfirmRow({ downtimeId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeConfirm_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeCancel_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCharacterCardRows({ characterId, ownerDiscordId, isFiller }) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_adv_${characterId}_${ownerDiscordId}`)
                .setLabel('Adventure')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`characterCard_dt_${characterId}_${ownerDiscordId}`)
                .setLabel('Downtime')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(Boolean(isFiller)),
            new ButtonBuilder()
                .setCustomId(`characterCard_manage_${characterId}_${ownerDiscordId}`)
                .setLabel('Manage')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`characterCard_del_${characterId}_${ownerDiscordId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_list_${characterId}_${ownerDiscordId}`)
                .setLabel('Back to list')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAdventureListRows({ characterId, ownerDiscordId, adventures }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select adventure...')
        .addOptions(
            adventures.slice(0, 25).map(a => {
                const title = String(a.title || '').trim() || '(No title)';
                const extra = a.has_additional_bubble ? ' +1' : '';
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${a.start_date} - ${title}`.slice(0, 100))
                    .setDescription(`${formatDuration(a.duration)}${extra}`)
                    .setValue(String(a.id));
            }),
        );
    return [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advListBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Back to character')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function getDowntimeFieldValues(state) {
    const duration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined
        ? formatDuration(state.data.durationSeconds)
        : '-';
    const date = state?.data?.startDate || '-';
    const type = state?.data?.type || '-';
    const notes = state?.data?.notes ? truncateText(state.data.notes, 200) : '-';

    return { duration, date, type, notes };
}

function formatDowntimeSummaryFields(state) {
    const values = getDowntimeFieldValues(state);
    return [
        { name: 'Duration', value: values.duration, inline: true },
        { name: 'Date', value: values.date, inline: true },
        { name: 'Type', value: values.type, inline: true },
        { name: 'Notes', value: values.notes, inline: false },
    ];
}

function formatDowntimeStepFields(stepKey, state) {
    const values = getDowntimeFieldValues(state);
    switch (stepKey) {
        case 'duration':
            return [{ name: 'Duration', value: values.duration, inline: true }];
        case 'date':
            return [{ name: 'Date', value: values.date, inline: true }];
        case 'type':
            return [{ name: 'Type', value: values.type, inline: true }];
        case 'notes':
            return [{ name: 'Notes', value: values.notes, inline: false }];
        default:
            return [];
    }
}

function buildDowntimeStepEmbed(stepKey, state, description) {
    const stepNumber = getDowntimeStepNumber(stepKey);
    const title = state?.mode === 'edit' ? 'Edit downtime' : 'Create downtime';
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .setDescription(description)
        .setFooter({ text: `Step ${stepNumber}/5` });

    const fields = stepKey === 'confirm'
        ? formatDowntimeSummaryFields(state)
        : formatDowntimeStepFields(stepKey, state);
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    return embed;
}

function buildDowntimeDurationRows(state) {
    const { characterId, ownerDiscordId } = state;
    const hasDuration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_duration_custom_${characterId}_${ownerDiscordId}`)
                .setLabel('Set duration')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `dtCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `dtCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `dtCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: !hasDuration,
    }));
}

function buildDowntimeDateRows(state) {
    const { characterId, ownerDiscordId } = state;
    const hasDate = Boolean(state?.data?.startDate);
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_date_custom_${characterId}_${ownerDiscordId}`)
                .setLabel('Set date')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `dtCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `dtCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `dtCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: !hasDate,
    }));
}

function buildDowntimeTypeRows(state) {
    const { characterId, ownerDiscordId } = state;
    const selected = String(state?.data?.type || 'other').toLowerCase();

    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtCreate_type_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select type...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Faction')
                .setValue('faction')
                .setDefault(selected === 'faction'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Other')
                .setValue('other')
                .setDefault(selected === 'other'),
        );

    return [new ActionRowBuilder().addComponents(select)].concat(buildStepperNavRows({
        backId: `dtCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `dtCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `dtCreate_cancel_${characterId}_${ownerDiscordId}`,
    }));
}

function buildDowntimeNotesRows(state) {
    const { characterId, ownerDiscordId } = state;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_notes_edit_${characterId}_${ownerDiscordId}`)
                .setLabel('Edit notes')
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `dtCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `dtCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `dtCreate_cancel_${characterId}_${ownerDiscordId}`,
    }));
}

function buildDowntimeConfirmRows(state) {
    const { characterId, ownerDiscordId } = state;
    const confirmLabel = state?.mode === 'edit' ? 'Save downtime' : 'Create downtime';
    const confirmStyle = state?.mode === 'edit' ? ButtonStyle.Primary : ButtonStyle.Success;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_back_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtCreate_confirm_${characterId}_${ownerDiscordId}`)
                .setLabel(confirmLabel)
                .setStyle(confirmStyle),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_cancel_${characterId}_${ownerDiscordId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildDowntimeDurationModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`dtCreate_durationModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Downtime duration');

    const durationInput = new TextInputBuilder()
        .setCustomId('dtDuration')
        .setLabel('Duration (HH:MM, 400h 30m, or minutes)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined
            ? formatDuration(state.data.durationSeconds)
            : '');

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildDowntimeDateModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`dtCreate_dateModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Downtime date');

    const dateInput = new TextInputBuilder()
        .setCustomId('dtDate')
        .setLabel('Date (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.startDate, 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildDowntimeNotesModal(state) {
    const { characterId, ownerDiscordId } = state;
    const modal = new ModalBuilder()
        .setCustomId(`dtCreate_notesModal_${characterId}_${ownerDiscordId}`)
        .setTitle('Downtime notes');

    const notesInput = new TextInputBuilder()
        .setCustomId('dtNotes')
        .setLabel('Notes (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.notes));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
}

function buildDowntimeManageDurationModal({ downtimeId, characterId, ownerDiscordId, downtime }) {
    const modal = new ModalBuilder()
        .setCustomId(`dtManage_durationModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Downtime duration');

    const durationInput = new TextInputBuilder()
        .setCustomId('dtDuration')
        .setLabel('Duration (HH:MM, 400h 30m, or minutes)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(formatDuration(Number(downtime.duration || 0)));

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildDowntimeManageDateModal({ downtimeId, characterId, ownerDiscordId, downtime }) {
    const modal = new ModalBuilder()
        .setCustomId(`dtManage_dateModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Downtime date');

    const dateInput = new TextInputBuilder()
        .setCustomId('dtDate')
        .setLabel('Date (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(downtime.start_date, 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildDowntimeManageNotesModal({ downtimeId, characterId, ownerDiscordId, downtime }) {
    const modal = new ModalBuilder()
        .setCustomId(`dtManage_notesModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Downtime notes');

    const notesInput = new TextInputBuilder()
        .setCustomId('dtNotes')
        .setLabel('Notes')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(downtime.notes, 1000));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
}

function buildAdventureManageDurationModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const modal = new ModalBuilder()
        .setCustomId(`advManage_durationModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Adventure duration');

    const durationInput = new TextInputBuilder()
        .setCustomId('advDuration')
        .setLabel('Duration (HH:MM, 400h 30m, or minutes)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(formatDuration(Number(adventure.duration || 0)));

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildAdventureManageDateModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const modal = new ModalBuilder()
        .setCustomId(`advManage_dateModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Adventure date');

    const dateInput = new TextInputBuilder()
        .setCustomId('advDate')
        .setLabel('Date (YYYY-MM-DD)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(adventure.start_date, 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildAdventureManageTitleModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const modal = new ModalBuilder()
        .setCustomId(`advManage_titleModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Adventure title & GM');

    const titleInput = new TextInputBuilder()
        .setCustomId('advTitle')
        .setLabel('Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(safeModalValue(adventure.title, 100));

    const gmInput = new TextInputBuilder()
        .setCustomId('advGm')
        .setLabel('Game Master')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(safeModalValue(adventure.game_master, 100));

    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(gmInput),
    );
    return modal;
}

function buildAdventureManageNotesModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const modal = new ModalBuilder()
        .setCustomId(`advManage_notesModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle('Adventure notes');

    const notesInput = new TextInputBuilder()
        .setCustomId('advNotes')
        .setLabel('Notes')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(adventure.notes, 1000));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
}

async function updateDowntimeMessage(state, payload) {
    const activeInteraction = state?.activeInteraction;

    if (state?.promptMessage?.editable) {
        try {
            await state.promptMessage.edit(payload);
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
                    return true;
                }
            }
        } catch {
            // fall through
        }
    }

    if (activeInteraction?.isMessageComponent?.() || activeInteraction?.isModalSubmit?.()) {
        try {
            await activeInteraction.update(payload);
            return true;
        } catch {
            // fall through
        }
    }

    if (state?.promptInteraction?.isRepliable?.()) {
        await state.promptInteraction.editReply(payload);
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
        notes: 'Add optional notes.',
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

function buildAdventureActionRow({ adventureId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`advEdit_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Edit')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildAdventureManageRows({ adventureId, characterId, ownerDiscordId }) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advManage_duration_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Duration')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advManage_date_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Date')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advManage_title_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Title/GM')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advManage_quest_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Quest')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advManage_notes_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Notes')
                .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advManage_participants_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Participants')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`advManage_back_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAdventureManageEmbed(adventure, participants) {
    const questValue = adventure.has_additional_bubble ? 'Yes (+1 bubble)' : 'No';
    const notesValue = String(adventure.notes || '').trim() || '-';
    const titleValue = String(adventure.title || '').trim() || '-';
    const gameMasterValue = String(adventure.game_master || '').trim() || '-';
    const participantValue = participants.length > 0 ? formatParticipantList(participants) : '-';

    return new EmbedBuilder()
        .setTitle('Manage adventure')
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Date', value: String(adventure.start_date), inline: true },
            { name: 'Duration', value: formatDuration(adventure.duration), inline: true },
            { name: 'Character quest', value: questValue, inline: true },
            { name: 'Title', value: titleValue, inline: false },
            { name: 'Game Master', value: gameMasterValue, inline: false },
            { name: 'Notes', value: notesValue.slice(0, 1024), inline: false },
            { name: 'Participants', value: participantValue, inline: false },
        );
}

function buildAdventureManageView({ adventure, participants, ownerDiscordId, characterId }) {
    return {
        embed: buildAdventureManageEmbed(adventure, participants),
        components: buildAdventureManageRows({ adventureId: adventure.id, characterId, ownerDiscordId }),
    };
}

function buildAdventureQuestManageView({ adventure, ownerDiscordId, characterId }) {
    const selected = adventure.has_additional_bubble ? 'yes' : 'no';
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advManage_questSelect_${adventure.id}_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select character quest...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Yes, character quest (+1 bubble)')
                .setValue('yes')
                .setDefault(selected === 'yes'),
            new StringSelectMenuOptionBuilder()
                .setLabel('No')
                .setValue('no')
                .setDefault(selected === 'no'),
        );

    const embed = new EmbedBuilder()
        .setTitle('Update character quest')
        .setColor(0x4f46e5)
        .setDescription('Select whether this was a character quest.');

    return {
        embed,
        components: [
            new ActionRowBuilder().addComponents(select),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advManage_back_${adventure.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary),
            ),
        ],
    };
}

function buildDowntimeListRow({ characterId, ownerDiscordId, downtimes }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select downtime...')
        .addOptions(
            downtimes.slice(0, 25).map(d =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${d.start_date} - ${String(d.type || 'other')}`.slice(0, 100))
                    .setDescription(formatDuration(d.duration))
                    .setValue(String(d.id)),
            ),
        );
    return new ActionRowBuilder().addComponents(select);
}

function buildDowntimeManageRows({ downtimeId, characterId, ownerDiscordId }) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtManage_duration_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Duration')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtManage_date_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Date')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtManage_type_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Type')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtManage_notes_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Notes')
                .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dtManage_back_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildDowntimeManageEmbed(downtime) {
    const notesValue = String(downtime.notes || '').trim() || '-';
    const typeValue = String(downtime.type || 'other');

    return new EmbedBuilder()
        .setTitle('Manage downtime')
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Date', value: String(downtime.start_date), inline: true },
            { name: 'Duration', value: formatDuration(downtime.duration), inline: true },
            { name: 'Type', value: typeValue, inline: true },
            { name: 'Notes', value: notesValue.slice(0, 1024), inline: false },
        );
}

function buildDowntimeManageView({ downtime, ownerDiscordId, characterId }) {
    return {
        embed: buildDowntimeManageEmbed(downtime),
        components: buildDowntimeManageRows({ downtimeId: downtime.id, characterId, ownerDiscordId }),
    };
}

function buildDowntimeTypeManageView({ downtime, ownerDiscordId, characterId }) {
    const selected = String(downtime.type || 'other').toLowerCase();
    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtManage_typeSelect_${downtime.id}_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select type...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Faction')
                .setValue('faction')
                .setDefault(selected === 'faction'),
            new StringSelectMenuOptionBuilder()
                .setLabel('Other')
                .setValue('other')
                .setDefault(selected === 'other'),
        );

    const embed = new EmbedBuilder()
        .setTitle('Update downtime type')
        .setColor(0x4f46e5)
        .setDescription('Select the downtime type.');

    return {
        embed,
        components: [
            new ActionRowBuilder().addComponents(select),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtManage_back_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary),
            ),
        ],
    };
}

function buildAdventureEmbed(adventure, title, participants = []) {
    const extra = adventure.has_additional_bubble ? ' +1' : '';
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Date', value: String(adventure.start_date), inline: true },
            { name: 'Duration', value: `${formatDuration(adventure.duration)}${extra}`, inline: true },
            { name: 'ID', value: String(adventure.id), inline: true },
        );

    if (participants.length > 0) {
        embed.addFields({ name: 'Participants', value: formatParticipantList(participants), inline: false });
    }

    if (adventure.title) embed.addFields({ name: 'Title', value: String(adventure.title).slice(0, 1024), inline: false });
    if (adventure.game_master) embed.addFields({ name: 'GM', value: String(adventure.game_master).slice(0, 1024), inline: false });
    if (adventure.notes) embed.addFields({ name: 'Notes', value: String(adventure.notes).slice(0, 1024), inline: false });
    return embed;
}

function buildDowntimeEmbed(downtime, title) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Date', value: String(downtime.start_date), inline: true },
            { name: 'Duration', value: formatDuration(downtime.duration), inline: true },
            { name: 'Type', value: String(downtime.type || 'other'), inline: true },
            { name: 'ID', value: String(downtime.id), inline: true },
        );

    if (downtime.notes) embed.addFields({ name: 'Notes', value: String(downtime.notes).slice(0, 1024), inline: false });
    return embed;
}

function buildParticipantOptions({ allies, guildCharacters, selectedAllyIds, selectedGuildCharacterIds, search }) {
    const linkedIds = new Set(allies.map(ally => ally.linked_character_id).filter(Boolean).map(String));
    const availableGuildCharacters = guildCharacters.filter(character => !linkedIds.has(String(character.id)));
    const guildNameById = new Map(guildCharacters.map(character => [String(character.id), character.name]));
    const query = String(search || '').trim().toLowerCase();

    const allyOptions = allies.map(ally => {
        const linkedName = ally.linked_character_id ? guildNameById.get(String(ally.linked_character_id)) : '';
        const label = linkedName && linkedName.toLowerCase() !== String(ally.name).toLowerCase()
            ? `${linkedName} (${ally.name})`
            : String(ally.name);
        const description = ally.linked_character_id
            ? linkedName ? `Linked - ${linkedName}` : 'Linked guild member'
            : 'Custom ally';
        return {
            key: `ally_${ally.id}`,
            type: 'ally',
            id: Number(ally.id),
            label,
            description,
            selected: selectedAllyIds.includes(Number(ally.id)),
        };
    });

    const guildOptions = availableGuildCharacters.map(character => ({
        key: `guild_${character.id}`,
        type: 'guild',
        id: Number(character.id),
        label: String(character.name),
        description: 'Guild member',
        selected: selectedGuildCharacterIds.includes(Number(character.id)),
    }));

    const combined = [...allyOptions, ...guildOptions].filter(option => {
        if (!query) return true;
        return `${option.label} ${option.description}`.toLowerCase().includes(query);
    });

    combined.sort((a, b) => a.label.localeCompare(b.label));
    return combined;
}

function buildAdventureParticipantsSelect({ adventureId, characterId, ownerDiscordId, options }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advParticipantsSelect_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Select participants...')
        .setMinValues(0)
        .setMaxValues(Math.min(25, options.length));

    options.forEach(option => {
        const builder = new StringSelectMenuOptionBuilder()
            .setLabel(option.label.slice(0, 100))
            .setDescription(option.description.slice(0, 100))
            .setValue(`${option.type}:${option.id}`)
            .setDefault(Boolean(option.selected));
        select.addOptions(builder);
    });

    return new ActionRowBuilder().addComponents(select);
}

function buildAdventureParticipantsActions({ adventureId, characterId, ownerDiscordId, hasParticipants, backCustomId }) {
    const backId = backCustomId || `advParticipantsBack_${adventureId}_${characterId}_${ownerDiscordId}`;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`advParticipantsSearch_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Suchen')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`advParticipantsClear_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Alle entfernen')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!hasParticipants),
        new ButtonBuilder()
            .setCustomId(backId)
            .setLabel('Back')
            .setStyle(ButtonStyle.Secondary),
    );
}

async function buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId, backCustomId }) {
    const adventure = await findAdventureForDiscord(interaction.user, adventureId);
    if (!adventure) return { error: 'not_found' };

    const participants = await listAdventureParticipantsForDiscord(interaction.user, adventureId);
    const allies = await listAlliesForDiscord(interaction.user, characterId);
    const guildCharacters = await listGuildCharactersForDiscord(interaction.user, characterId);
    const search = getParticipantSearch(adventureId, ownerDiscordId);

    const options = buildParticipantOptions({
        allies,
        guildCharacters,
        selectedAllyIds: participants.map(entry => Number(entry.id)),
        selectedGuildCharacterIds: [],
        search,
    });

    const limitedOptions = options.slice(0, 25);
    const embed = new EmbedBuilder()
        .setTitle('Edit participants')
        .setColor(0x4f46e5)
        .setDescription(`${adventure.start_date} - ${String(adventure.title || '(No title)')}`)
        .addFields({ name: 'Aktuell', value: formatParticipantList(participants), inline: false });

    if (search) {
        embed.setFooter({ text: `Filter: ${search} (${limitedOptions.length}/${options.length})` });
    } else if (options.length > limitedOptions.length) {
        embed.setFooter({ text: `Zeige ${limitedOptions.length} von ${options.length}. Nutze Suche.` });
    }

    const components = [];
    if (limitedOptions.length > 0) {
        components.push(
            buildAdventureParticipantsSelect({
                adventureId,
                characterId,
                ownerDiscordId,
                options: limitedOptions,
            }),
        );
    }
    components.push(
        buildAdventureParticipantsActions({
            adventureId,
            characterId,
            ownerDiscordId,
            hasParticipants: participants.length > 0,
            backCustomId,
        }),
    );

    return { embed, components, adventure, participants };
}

async function refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId }) {
    const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
    if (!adventure || Number(adventure.character_id) !== characterId) {
        await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
        return false;
    }

    const view = buildAdventureManageView({ adventure, participants, ownerDiscordId, characterId });
    await interaction.update({ content: '', embeds: [view.embed], components: view.components });
    return true;
}

async function refreshDowntimeManageView({ interaction, downtimeId, characterId, ownerDiscordId }) {
    const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
    if (!downtime || Number(downtime.character_id) !== characterId) {
        await interaction.update({ content: 'Downtime not found.', embeds: [], components: [] });
        return false;
    }

    const view = buildDowntimeManageView({ downtime, ownerDiscordId, characterId });
    await interaction.update({ content: '', embeds: [view.embed], components: view.components });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
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
        state.data.startDate = date.toISOString().slice(0, 10);
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

            const adventure = await findAdventureForDiscord(interaction.user, adventureId);
            if (!adventure) {
                await interaction.update({ content: isEdit ? 'Adventure saved.' : 'Adventure saved.', embeds: [], components: [] });
                return true;
            }

            const participants = await listAdventureParticipantsForDiscord(interaction.user, adventure.id);
            const row = buildAdventureActionRow({ adventureId: adventure.id, characterId, ownerDiscordId });
            await interaction.update({
                embeds: [buildAdventureEmbed(adventure, isEdit ? 'Adventure updated' : 'Adventure saved', participants)],
                components: [row],
                content: '',
            });
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
            if (adventures.length === 0) {
                await interaction.reply({ content: 'No adventures found.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Adventure').setDescription('Choose an adventure.')],
                components: buildAdventureListRows({ characterId, ownerDiscordId, adventures }),
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Failed to load adventures.', flags: MessageFlags.Ephemeral });
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
        state.data.startDate = new Date().toISOString().slice(0, 10);
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
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
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
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
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
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
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
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
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

            const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
            if (!downtime) {
                await interaction.update({ content: isEdit ? 'Downtime saved.' : 'Downtime saved.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.update({
                embeds: [buildDowntimeEmbed(downtime, isEdit ? 'Downtime updated' : 'Downtime saved')],
                components: [row],
                content: '',
            });
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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildDowntimeEmbed(downtime, 'Downtime saved')],
                components: [row],
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
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
            if (downtimes.length === 0) {
                await interaction.reply({ content: 'No downtimes found.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('Choose a downtime.')],
                components: [buildDowntimeListRow({ characterId, ownerDiscordId, downtimes })],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Failed to load downtimes.', flags: MessageFlags.Ephemeral });
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

        const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
            return true;
        }

        const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });

        await interaction.update({
            embeds: [buildAdventureEmbed(adventure, 'Adventure', participants)],
            components: [row],
            content: '',
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advParticipantsOpen_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        setParticipantReturnTarget(adventureId, ownerDiscordId, 'detail');
        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
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
            .setLabel('Suche (Name oder Label)')
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

        const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
            return true;
        }

        const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });
        await interaction.update({ content: '', embeds: [buildAdventureEmbed(adventure, 'Adventure', participants)], components: [row] });
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

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.update({ content: 'Downtime not found.', embeds: [], components: [] });
            return true;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Edit')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.update({ embeds: [buildDowntimeEmbed(downtime, 'Downtime')], components: [row], content: '' });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advEdit_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Adventure not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = buildAdventureManageView({ adventure, participants, ownerDiscordId, characterId });
        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
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

        clearParticipantReturnTarget(adventureId, ownerDiscordId);
        const returnTarget = getParticipantReturnTarget(adventureId, ownerDiscordId);
        clearParticipantReturnTarget(adventureId, ownerDiscordId);

        if (returnTarget === 'manage') {
            await refreshAdventureManageView({ interaction, adventureId, characterId, ownerDiscordId });
            return true;
        }

        const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
            return true;
        }

        const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });
        await interaction.update({ content: '', embeds: [buildAdventureEmbed(adventure, 'Adventure', participants)], components: [row] });
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

        setParticipantReturnTarget(adventureId, ownerDiscordId, 'manage');
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
            const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
            if (!adventure || Number(adventure.character_id) !== characterId) {
                await interaction.update({ content: 'Adventure not found.', embeds: [], components: [] });
                return true;
            }

            const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });

            await interaction.update({
                content: '',
                embeds: [buildAdventureEmbed(adventure, 'Adventure', participants)],
                components: [row],
            });
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

    if (interaction.isButton() && interaction.customId.startsWith('dtEdit_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime not found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = buildDowntimeManageView({ downtime, ownerDiscordId, characterId });
        await interaction.update({ content: '', embeds: [view.embed], components: view.components });
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

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.update({ content: 'Downtime not found.', embeds: [], components: [] });
            return true;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Edit')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.update({ embeds: [buildDowntimeEmbed(downtime, 'Downtime')], components: [row], content: '' });
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
            const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
            if (!downtime || Number(downtime.character_id) !== characterId) {
                await interaction.update({ content: 'Downtime not found.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Edit')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.update({ content: '', embeds: [buildDowntimeEmbed(downtime, 'Downtime')], components: [row] });
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




