const {
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

const {
    buildCharacterEmbed,
    resolvePublicAvatarUrl,
    tryBuildLocalAvatarAttachment,
} = require('../commands/game/characters');
const { calculateLevel, calculateTierFromLevel } = require('../utils/characterTier');
const { formatLocalIsoDate } = require('../dateUtils');
const {
    listCharacterClassesForDiscord,
    listCharacterClassIdsForDiscord,
    listAlliesForDiscord,
    listGuildCharactersForDiscord,
    listAdventureParticipantsForDiscord,
    findAdventureForDiscord,
} = require('../appDb');

const adventureParticipantSearch = new Map();
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
    'agenten',
    'waffenmeister',
    'arkanisten',
]);
const adventureCreationSteps = ['duration', 'date', 'title', 'quest', 'notes', 'participants', 'confirm'];
const downtimeCreationSteps = ['duration', 'date', 'type', 'notes', 'confirm'];

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
    const level = calculateLevel(character);
    const tier = calculateTierFromLevel(level);
    const startTierRaw = String(character.start_tier || '').trim();
    const startTier = isFiller ? 'Filler' : (startTierRaw ? startTierRaw.toUpperCase() : '-');
    const currentTier = isFiller ? 'Filler' : tier;
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
    if (currentTier !== '-') {
        descriptionParts.push(currentTier);
    }

    const embed = new EmbedBuilder()
        .setTitle('Manage character')
        .setColor(0x4f46e5)
        .setDescription(descriptionParts.join(' - '))
        .addFields(
            { name: 'Classes', value: classNames, inline: false },
            { name: 'Faction', value: faction, inline: true },
            { name: 'Version', value: version, inline: true },
            { name: 'Current tier', value: currentTier, inline: true },
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

function getAdventureStepNumber(stepKey) {
    const index = adventureCreationSteps.indexOf(stepKey);
    return index >= 0 ? index + 1 : 1;
}

function getDowntimeStepNumber(stepKey) {
    const index = downtimeCreationSteps.indexOf(stepKey);
    return index >= 0 ? index + 1 : 1;
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

function buildAdventureStepEmbed(stepKey, state, description, participantsLabel, footerNote) {
    const stepNumber = getAdventureStepNumber(stepKey);
    const title = state?.mode === 'edit' ? 'Edit adventure' : 'Create adventure';
    const footerText = footerNote
        ? `Step ${stepNumber}/7 • ${footerNote}`
        : `Step ${stepNumber}/7`;
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .setDescription(description)
        .setFooter({ text: footerText });

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
                .setLabel('2 Bubbles (6h)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_32400_${characterId}_${ownerDiscordId}`)
                .setLabel('3 Bubbles (9h)')
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
                .setLabel('Title & GM')
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
                .setLabel('Notes')
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

    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_participants_search_${characterId}_${ownerDiscordId}`)
                .setLabel('Search')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advCreate_participants_clear_${characterId}_${ownerDiscordId}`)
                .setLabel('Remove all')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(selectedIds.size === 0),
        ),
    );

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
        .setValue(safeModalValue(state?.data?.startDate || formatLocalIsoDate(), 10));

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
        { label: 'Agenten', value: 'agenten' },
        { label: 'Waffenmeister', value: 'waffenmeister' },
        { label: 'Arkanisten', value: 'arkanisten' },
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
                .setLabel('Custom duration')
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
                .setLabel('Custom date')
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
                .setLabel('Notes')
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
                .setLabel('Title & GM')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advManage_quest_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Character quest')
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
                .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
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

function buildDowntimeListRows({ characterId, ownerDiscordId, downtimes }) {
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
    return [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtListBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Back to character')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
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
                .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
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
            .setLabel('Search')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`advParticipantsClear_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Remove all')
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
        .addFields({ name: 'Current', value: formatParticipantList(participants), inline: false });

    if (search) {
        embed.setFooter({ text: `Filter: ${search} (${limitedOptions.length}/${options.length})` });
    } else if (options.length > limitedOptions.length) {
        embed.setFooter({ text: `Showing ${limitedOptions.length} of ${options.length}. Use search.` });
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


module.exports = {
    isHttpUrl,
    safeModalValue,
    formatDuration,
    formatParticipantName,
    formatParticipantList,
    truncateText,
    getAdventureFieldValues,
    formatAdventureSummaryFields,
    formatAdventureStepFields,
    getAdventureStepNumber,
    getDowntimeFieldValues,
    formatDowntimeSummaryFields,
    formatDowntimeStepFields,
    getDowntimeStepNumber,
    buildStepperNavRows,
    buildCharacterManageRows,
    buildCharacterManageView,
    buildCharacterCardPayload,
    buildAdventureStepEmbed,
    buildAdventureDurationRows,
    buildAdventureDateRows,
    buildAdventureTitleRows,
    buildAdventureQuestRows,
    buildAdventureNotesRows,
    buildAdventureParticipantsRows,
    buildAdventureConfirmRows,
    buildAdventureMenuRow,
    buildDowntimeMenuRow,
    formatSelectedParticipantNames,
    buildAdventureDurationModal,
    buildAdventureDateModal,
    buildAdventureTitleModal,
    buildAdventureNotesModal,
    buildCreationCancelRow,
    buildCreationEmbed,
    buildClassesRow,
    buildStartTierRow,
    getStartTierSelection,
    buildFactionRow,
    buildVersionRow,
    buildCreationConfirmRows,
    buildCreationBasicsRows,
    buildCreationStepActionRows,
    buildAvatarUploadRow,
    buildCreationBasicsEmbed,
    buildAvatarStepEmbed,
    buildCreationSummaryEmbed,
    buildCreationBasicModal,
    buildCharacterClassesView,
    buildCharacterFactionView,
    buildDeleteConfirmRow,
    buildAdventureDeleteConfirmRow,
    buildDowntimeDeleteConfirmRow,
    buildCharacterCardRows,
    buildAdventureListRows,
    buildDowntimeStepEmbed,
    buildDowntimeDurationRows,
    buildDowntimeDateRows,
    buildDowntimeTypeRows,
    buildDowntimeNotesRows,
    buildDowntimeConfirmRows,
    buildDowntimeDurationModal,
    buildDowntimeDateModal,
    buildDowntimeNotesModal,
    buildDowntimeManageDurationModal,
    buildDowntimeManageDateModal,
    buildDowntimeManageNotesModal,
    buildAdventureManageDurationModal,
    buildAdventureManageDateModal,
    buildAdventureManageTitleModal,
    buildAdventureManageNotesModal,
    buildAdventureManageRows,
    buildAdventureManageEmbed,
    buildAdventureManageView,
    buildAdventureQuestManageView,
    buildDowntimeListRows,
    buildDowntimeManageRows,
    buildDowntimeManageEmbed,
    buildDowntimeManageView,
    buildDowntimeTypeManageView,
    buildAdventureEmbed,
    buildDowntimeEmbed,
    buildParticipantOptions,
    buildAdventureParticipantsSelect,
    buildAdventureParticipantsActions,
    buildAdventureParticipantsView,
    allowedFactions,
    formatFactionLabel,
    safeInt,
    participantSearchKey,
    setParticipantSearch,
    getParticipantSearch,
};
