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
const { t } = require('../i18n');
const { calculateLevel, calculateTierFromLevel } = require('../utils/characterTier');
const { formatIsoDate, formatLocalIsoDate } = require('../dateUtils');
const { formatDurationSeconds } = require('../utils/time');
const {
    listCharacterClassesForDiscord,
    listCharacterClassIdsForDiscord,
    listAlliesForDiscord,
    listGuildCharactersForDiscord,
    listAdventureParticipantsForDiscord,
    findAdventureForDiscord,
} = require('../appDb');
const { formatAdventureListDescription } = require('../utils/adventureList');

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
const allowedGuildStatuses = new Set(['pending', 'draft', 'approved', 'declined', 'needs_changes', 'retired']);
const isCharacterStatusSwitchEnabled = String(process.env.FEATURE_CHARACTER_STATUS_SWITCH ?? 'true').trim().toLowerCase() !== 'false';
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

function normalizeHost(rawHost) {
    const host = String(rawHost || '').trim().toLowerCase();
    if (!host) return '';
    return host.startsWith('www.') ? host.slice(4) : host;
}

function isDnDBeyondCharacterUrl(urlString) {
    if (!isHttpUrl(urlString)) return false;

    let parsed;
    try {
        parsed = new URL(urlString);
    } catch {
        return false;
    }

    const host = normalizeHost(parsed.hostname);
    if (!host) {
        return false;
    }

    if (!(host === 'dndbeyond.com' || host.endsWith('.dndbeyond.com'))) {
        return false;
    }

    const path = String(parsed.pathname || '').toLowerCase();
    return path === '/characters' || path.startsWith('/characters/');
}

function isExternalCharacterLink(urlString) {
    return isDnDBeyondCharacterUrl(urlString);
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

function normalizeGuildStatus(value, fallback = 'pending') {
    const status = String(value || '').trim().toLowerCase();
    return allowedGuildStatuses.has(status) ? status : fallback;
}

function formatGuildStatusLabel(value) {
    const status = normalizeGuildStatus(value);
    if (status === 'approved') return 'Approved';
    if (status === 'declined') return 'Declined';
    if (status === 'needs_changes') return 'Needs changes';
    if (status === 'retired') return 'Retired';
    if (status === 'draft') return 'Draft';
    return 'Pending';
}

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function buildCharacterManageRows({ characterId, ownerDiscordId, simplifiedTracking, avatarMasked, locale = null }) {
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_basic_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageBasic', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_avatar_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageAvatar', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_classes_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageClasses', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_faction_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageFaction', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_dm_bubbles_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageDmBubbles', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_dm_coins_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageDmCoins', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_bubble_spend_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.manageBubbleShop', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`characterManage_tracking_toggle_${characterId}_${ownerDiscordId}`)
            .setLabel(t(
                simplifiedTracking ? 'characters.manageTrackingSimplified' : 'characters.manageTrackingAdventure',
                {},
                locale,
            ))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`characterManage_avatar_mask_toggle_${characterId}_${ownerDiscordId}`)
            .setLabel(t(
                avatarMasked ? 'characters.manageTokenMaskOn' : 'characters.manageTokenMaskOff',
                {},
                locale,
            ))
            .setStyle(ButtonStyle.Secondary),
    ));

    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`characterManage_back_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.back', {}, locale))
            .setStyle(ButtonStyle.Secondary),
    ));

    return rows;
}

function buildCharacterManageView(character, { ownerDiscordId, locale = null }) {
    const name = String(character.name || `Character ${character.id}`);
    const classNames = String(character.class_names || '').trim() || '-';
    const isFiller = Boolean(character.is_filler);
    const level = calculateLevel(character);
    const tier = calculateTierFromLevel(level);
    const simplifiedTracking = Boolean(character.simplified_tracking);
    const startTierRaw = String(character.start_tier || '').trim();
    const startTier = isFiller ? 'Filler' : (startTierRaw ? startTierRaw.toUpperCase() : '-');
    const currentTier = isFiller ? 'Filler' : tier;
    const version = String(character.version || '2024');
    const faction = formatFactionLabel(character.faction);
    const notesRaw = String(character.notes || '').trim();
    const notes = notesRaw ? notesRaw.slice(0, 1000) : '-';
    const avatarRaw = String(character.avatar || '').trim();
    const avatar = avatarRaw ? t('characters.avatarPresent', {}, locale) : t('characters.avatarMissing', {}, locale);
    const externalLink = String(character.external_link || character.externalLink || '').trim();
    const linkValue = externalLink
        ? (isHttpUrl(externalLink) ? `[Open link](${externalLink})` : externalLink.slice(0, 1000))
        : '-';
    const dmBubbles = String(safeInt(character.dm_bubbles));
    const dmCoins = String(safeInt(character.dm_coins));
    const bubbleSpend = String(safeInt(character.bubble_shop_spend));
    const statusLabel = formatGuildStatusLabel(character.guild_status);
    const avatarMasked = character.avatar_masked === null || character.avatar_masked === undefined
        ? true
        : Boolean(character.avatar_masked);

    const descriptionParts = [name];
    if (currentTier !== '-') {
        descriptionParts.push(currentTier);
    }

    const embed = new EmbedBuilder()
        .setTitle(t('characters.manageTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(descriptionParts.join(' - '))
        .addFields(
            { name: t('characters.manageClasses', {}, locale), value: classNames, inline: false },
            { name: t('characters.manageFaction', {}, locale), value: faction, inline: true },
            { name: 'Version', value: version, inline: true },
            { name: 'Level', value: String(level), inline: true },
            { name: t('characters.currentTier', {}, locale), value: currentTier, inline: true },
            { name: t('characters.trackingField', {}, locale), value: t(simplifiedTracking ? 'characters.trackingSimplifiedBased' : 'characters.trackingAdventureBased', {}, locale), inline: true },
            { name: t('characters.statusField', {}, locale), value: statusLabel, inline: true },
            { name: t('characters.startingTier', {}, locale), value: startTier, inline: true },
            { name: t('characters.avatarField', {}, locale), value: avatar, inline: true },
            { name: t('characters.tokenMaskField', {}, locale), value: t(avatarMasked ? 'characters.tokenMaskValueOn' : 'characters.tokenMaskValueOff', {}, locale), inline: true },
            { name: t('characters.dndBeyondLinkField', {}, locale), value: linkValue, inline: false },
            { name: t('characters.notesField', {}, locale), value: notes, inline: false },
            { name: t('characters.manageDmBubbles', {}, locale), value: dmBubbles, inline: true },
            { name: t('characters.manageDmCoins', {}, locale), value: dmCoins, inline: true },
            { name: t('characters.manageBubbleShop', {}, locale), value: bubbleSpend, inline: true },
        );

    return {
        embeds: [embed],
        components: buildCharacterManageRows({
            characterId: character.id,
            ownerDiscordId,
            simplifiedTracking,
            avatarMasked,
            locale,
        }),
    };
}

function buildCharacterCardPayload({ character, ownerDiscordId }) {
    const avatarMasked = character.avatar_masked === null || character.avatar_masked === undefined
        ? true
        : Boolean(character.avatar_masked);
    const attachment = avatarMasked ? null : tryBuildLocalAvatarAttachment(character);
    const url = resolvePublicAvatarUrl(character.avatar, { masked: avatarMasked });
    const simplifiedTracking = Boolean(character.simplified_tracking);

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
            simplifiedTracking,
            guildStatus: character.guild_status,
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
    locale = null,
}) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(backId)
                .setLabel(t('common.back', {}, locale))
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
        ? formatDurationSeconds(state.data.durationSeconds)
        : '-';
    const date = formatIsoDate(state?.data?.startDate);
    const title = state?.data?.title ? truncateText(state.data.title, 120) : '-';
    const gameMaster = state?.data?.gameMaster ? truncateText(state.data.gameMaster, 120) : '-';
    const quest = state?.data?.hasAdditionalBubble === true
        ? 'Yes (+1 bubble)'
        : state?.data?.hasAdditionalBubble === false
            ? 'No'
            : '-';
    const notes = state?.data?.notes ? truncateText(state.data.notes, 200) : '-';
    const selectedCount = (state?.data?.allyIds?.length || 0) + (state?.data?.guildCharacterIds?.length || 0);
    const participants = participantsLabel || (selectedCount ? `${selectedCount} selected` : '-');

    return { duration, date, title, gameMaster, quest, notes, participants };
}

function formatAdventureSummaryFields(state, participantsLabel) {
    const locale = state?.locale || null;
    const values = getAdventureFieldValues(state, participantsLabel);
    return [
        { name: t('characters.durationField', {}, locale), value: values.duration, inline: true },
        { name: t('characters.dateField', {}, locale), value: values.date, inline: true },
        { name: t('characters.characterQuestField', {}, locale), value: values.quest, inline: true },
        { name: t('characters.titleField', {}, locale), value: values.title, inline: false },
        { name: t('characters.gameMasterField', {}, locale), value: values.gameMaster, inline: false },
        { name: t('characters.notesField', {}, locale), value: values.notes, inline: false },
        { name: t('characters.participantsField', {}, locale), value: values.participants, inline: false },
    ];
}

function formatAdventureStepFields(stepKey, state, participantsLabel) {
    const locale = state?.locale || null;
    const values = getAdventureFieldValues(state, participantsLabel);
    switch (stepKey) {
        case 'duration':
            return [{ name: t('characters.durationField', {}, locale), value: values.duration, inline: true }];
        case 'date':
            return [{ name: t('characters.dateField', {}, locale), value: values.date, inline: true }];
        case 'title':
            return [
                { name: t('characters.titleField', {}, locale), value: values.title, inline: false },
                { name: t('characters.gameMasterField', {}, locale), value: values.gameMaster, inline: false },
            ];
        case 'quest':
            return [{ name: t('characters.characterQuestField', {}, locale), value: values.quest, inline: true }];
        case 'notes':
            return [{ name: t('characters.notesField', {}, locale), value: values.notes, inline: false }];
        case 'participants':
            return [{ name: t('characters.participantsField', {}, locale), value: values.participants, inline: false }];
        default:
            return [];
    }
}

function buildAdventureStepEmbed(stepKey, state, description, participantsLabel, footerNote) {
    const locale = state?.locale || null;
    const stepNumber = getAdventureStepNumber(stepKey);
    const title = state?.mode === 'edit'
        ? t('characters.editAdventureTitle', {}, locale)
        : t('characters.createAdventureTitle', {}, locale);
    const footerText = footerNote
        ? t('characters.stepFooterWithNote', { current: stepNumber, total: 7, note: footerNote }, locale)
        : t('characters.stepFooter', { current: stepNumber, total: 7 }, locale);
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
    const locale = state?.locale || null;
    const hasDuration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_10800_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.bubbleOne', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_21600_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.bubbleTwo', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_32400_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.bubbleThree', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_duration_custom_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.customDuration', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: !hasDuration,
        cancelLabel: t('common.cancel', {}, locale),
        locale,
    }));
}

function buildAdventureDateRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const hasDate = Boolean(state?.data?.startDate);
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_date_today_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.today', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_date_yesterday_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.yesterday', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`advCreate_date_custom_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.customDate', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: !hasDate,
        cancelLabel: t('common.cancel', {}, locale),
        locale,
    }));
}

function buildAdventureTitleRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_title_edit_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.titleAndGmShort', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        cancelLabel: t('common.cancel', {}, locale),
        locale,
    }));
}

function buildAdventureQuestRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const selected = state?.data?.hasAdditionalBubble;

    const select = new StringSelectMenuBuilder()
        .setCustomId(`advCreate_quest_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectCharacterQuestPlaceholder', {}, locale))
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(t('characters.characterQuestYes', {}, locale))
                .setValue('yes')
                .setDefault(selected === true),
            new StringSelectMenuOptionBuilder()
                .setLabel(t('characters.characterQuestNo', {}, locale))
                .setValue('no')
                .setDefault(selected === false),
        );

    return [new ActionRowBuilder().addComponents(select)].concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        disableNext: selected === null || selected === undefined,
        cancelLabel: t('common.cancel', {}, locale),
        locale,
    }));
}

function buildAdventureNotesRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_notes_edit_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.notesField', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        cancelLabel: t('common.cancel', {}, locale),
        locale,
    }));
}

function buildAdventureParticipantsRows(state, options) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const components = [];

    if (options.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`advCreate_participants_${characterId}_${ownerDiscordId}`)
            .setPlaceholder(t('characters.selectParticipantsPlaceholder', {}, locale))
            .setMinValues(0)
            .setMaxValues(Math.min(25, options.length));

        options.slice(0, 25).forEach(option => {
            const builder = new StringSelectMenuOptionBuilder()
                .setLabel(String(option.label).slice(0, 100))
                .setDescription(String(option.description || '').slice(0, 100))
                .setValue(`${option.type}:${option.id}`)
                .setDefault(Boolean(option.selected));
            select.addOptions(builder);
        });

        components.push(new ActionRowBuilder().addComponents(select));
    } else {
        components.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_participants_empty_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.participantsNoneAvailable', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        ));
    }

    components.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_participants_search_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.search', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advCreate_participants_clear_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.removeAll', {}, locale))
                .setStyle(ButtonStyle.Danger)
                .setDisabled(
                    (state?.data?.allyIds?.length || 0) + (state?.data?.guildCharacterIds?.length || 0) === 0,
                ),
        ),
    );

    return components.concat(buildStepperNavRows({
        backId: `advCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `advCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `advCreate_cancel_${characterId}_${ownerDiscordId}`,
        cancelLabel: t('common.cancel', {}, locale),
        locale,
    }));
}

function buildAdventureConfirmRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const confirmLabel = state?.mode === 'edit'
        ? t('characters.saveAdventure', {}, locale)
        : t('characters.newAdventure', {}, locale);
    const confirmStyle = state?.mode === 'edit' ? ButtonStyle.Primary : ButtonStyle.Success;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_back_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`advCreate_confirm_${characterId}_${ownerDiscordId}`)
                .setLabel(confirmLabel)
                .setStyle(confirmStyle),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advCreate_cancel_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.cancel', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAdventureMenuRow(character, ownerDiscordId, locale = null) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`advAdd_${character.id}_${ownerDiscordId}`)
            .setLabel(t('characters.newAdventure', {}, locale))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`advList_${character.id}_${ownerDiscordId}`)
            .setLabel(t('common.list', {}, locale))
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
            .setLabel(t('common.back', {}, locale))
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeMenuRow(character, ownerDiscordId, locale = null) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`dtAdd_${character.id}_${ownerDiscordId}`)
            .setLabel(t('characters.addDowntime', {}, locale))
            .setStyle(ButtonStyle.Success)
            .setDisabled(Boolean(character.is_filler)),
        new ButtonBuilder()
            .setCustomId(`dtList_${character.id}_${ownerDiscordId}`)
            .setLabel(t('common.list', {}, locale))
            .setStyle(ButtonStyle.Primary)
            .setDisabled(Boolean(character.is_filler)),
        new ButtonBuilder()
            .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
            .setLabel(t('common.back', {}, locale))
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
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_durationModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.enterDurationTitle', {}, locale));

    const durationValue = state?.data?.durationSeconds
        ? formatDurationSeconds(state.data.durationSeconds)
        : '';

    const durationInput = new TextInputBuilder()
        .setCustomId('advDuration')
        .setLabel(t('characters.durationInputLabel', {}, locale))
        .setPlaceholder('03:00')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(durationValue));

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildAdventureDateModal(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_dateModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.enterDateTitle', {}, locale));

    const dateInput = new TextInputBuilder()
        .setCustomId('advDate')
        .setLabel(t('characters.dateInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.startDate || formatLocalIsoDate(), 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildAdventureTitleModal(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_titleModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.titleAndGmTitle', {}, locale));

    const titleInput = new TextInputBuilder()
        .setCustomId('advTitle')
        .setLabel(t('characters.titleOptionalLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.title));

    const gmInput = new TextInputBuilder()
        .setCustomId('advGm')
        .setLabel(t('characters.gameMasterOptionalLabel', {}, locale))
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
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advCreate_notesModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.notesModalTitle', {}, locale));

    const notesInput = new TextInputBuilder()
        .setCustomId('advNotes')
        .setLabel(t('characters.notesOptionalLabel', {}, locale))
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
            .setLabel(t('common.cancel'))
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
        .setPlaceholder(t('characters.selectClassesPlaceholder'))
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
        .setPlaceholder(t('characters.selectStartingTierPlaceholder'))
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
        .setPlaceholder(t('characters.selectFactionPlaceholder'))
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
        .setPlaceholder(t('characters.selectVersionPlaceholder'))
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

function buildCreationConfirmRows(ownerDiscordId, locale = null) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_back_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersCreate_confirm_${ownerDiscordId}`)
                .setLabel(t('characters.createCreateCharacter', {}, locale))
                .setStyle(ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel(t('common.cancel', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCreationBasicsRows(ownerDiscordId, locale = null) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_basicopen_${ownerDiscordId}`)
                .setLabel(t('common.next', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel(t('common.cancel', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCreationStepActionRows(ownerDiscordId, stepKey, locale = null) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_back_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersCreate_next_${stepKey}_${ownerDiscordId}`)
                .setLabel(t('common.next', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel(t('common.cancel', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAvatarUploadRow(ownerDiscordId, locale = null) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersCreate_avatar_dm_${ownerDiscordId}`)
            .setLabel(t('characters.createAvatarDmButton', {}, locale))
            .setStyle(ButtonStyle.Primary),
    );
}

function buildCreationBasicsEmbed(state, message) {
    const locale = state?.locale || null;
    const embed = buildCreationEmbed(1, t('characters.createTitle', {}, locale), message || t('characters.createBasicsDescription', {}, locale));
    embed.addFields(
        { name: t('characters.createBasicsName', {}, locale), value: state?.data?.name || '-', inline: false },
        { name: t('characters.createBasicsLink', {}, locale), value: state?.data?.externalLink || '-', inline: false },
        { name: t('characters.createBasicsAvatar', {}, locale), value: state?.data?.avatar || t('characters.avatarMissing', {}, locale), inline: false },
        { name: t('characters.createBasicsNotes', {}, locale), value: state?.data?.notes || '-', inline: false },
    );
    return embed;
}

function buildAvatarStepEmbed(state, message) {
    const locale = state?.locale || null;
    const description = message
        || t('characters.createAvatarDescription', {}, locale);
    const embed = buildCreationEmbed(2, t('characters.createAvatarTitle', {}, locale), description);
    embed.addFields({
        name: t('characters.createBasicsAvatar', {}, locale),
        value: state?.data?.avatar ? t('characters.createAvatarUploaded', {}, locale) : t('characters.avatarMissing', {}, locale),
        inline: false,
    });
    return embed;
}

async function buildCreationSummaryEmbed(state) {
    const locale = state?.locale || null;
    const classes = await listCharacterClassesForDiscord();
    const classById = new Map(classes.map(entry => [Number(entry.id), entry.name]));
    const classNames = (state.data.classIds || [])
        .map(id => classById.get(Number(id)))
        .filter(Boolean);

    const tierLabel = state.data.isFiller ? 'Filler' : String(state.data.startTier || '').toUpperCase();
    const statusLabel = formatGuildStatusLabel(state.data.guildStatus);
    const embed = new EmbedBuilder()
        .setTitle(t('characters.createSummaryTitle', {}, locale))
        .setColor(0x4f46e5)
        .addFields(
            { name: t('characters.createBasicsName', {}, locale), value: state.data.name || '-', inline: false },
            { name: t('characters.createBasicsLink', {}, locale), value: state.data.externalLink || '-', inline: false },
            { name: t('characters.createBasicsAvatar', {}, locale), value: state.data.avatar || t('characters.avatarMissing', {}, locale), inline: false },
            { name: t('characters.manageClasses', {}, locale), value: classNames.length > 0 ? classNames.join(', ') : '-', inline: false },
            { name: t('characters.startingTier', {}, locale), value: tierLabel || '-', inline: true },
            { name: t('characters.manageFaction', {}, locale), value: state.data.faction || 'none', inline: true },
            { name: 'Version', value: state.data.version || '2024', inline: true },
            { name: t('characters.statusField', {}, locale), value: statusLabel, inline: true },
            { name: t('characters.createBasicsNotes', {}, locale), value: state.data.notes ? state.data.notes : '-', inline: false },
        );

    return embed;
}

function buildCreationBasicModal(ownerDiscordId, state) {
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`charactersCreate_basic_${ownerDiscordId}`)
        .setTitle(t('characters.createModalTitle', {}, locale));

    const nameInput = new TextInputBuilder()
        .setCustomId('createName')
        .setLabel(t('characters.createModalName', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.name));

    const linkInput = new TextInputBuilder()
        .setCustomId('createLink')
        .setLabel(t('characters.createModalLink', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(state?.data?.externalLink));

    const notesInput = new TextInputBuilder()
        .setCustomId('createNotes')
        .setLabel(t('characters.createModalNotes', {}, locale))
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
    const locale = character?.locale || null;
    const classes = await listCharacterClassesForDiscord();
    const selectedIds = await listCharacterClassIdsForDiscord(interaction.user, character.id);
    const selectedSet = new Set(selectedIds.map(String));

    const select = new StringSelectMenuBuilder()
        .setCustomId(`characterClassesSelect_${character.id}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectClassesPlaceholder', {}, locale))
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
        .setTitle(t('characters.classesTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(t('characters.selectedForCharacter', { name: character.name }, locale));

    const components = [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${character.id}_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embed, components };
}

function buildCharacterFactionView({ character, ownerDiscordId }) {
    const locale = character?.locale || null;
    const select = new StringSelectMenuBuilder()
        .setCustomId(`characterFactionSelect_${character.id}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectFactionPlaceholder', {}, locale))
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
        .setTitle(t('characters.factionTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(t('characters.selectedForCharacter', { name: character.name }, locale));

    const components = [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${character.id}_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embed, components };
}

function buildDeleteConfirmRow({ characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteCharacterConfirm_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.delete'))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteCharacterCancel_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.cancel'))
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildAdventureDeleteConfirmRow({ adventureId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteAdventureConfirm_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.delete'))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteAdventureCancel_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.cancel'))
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeDeleteConfirmRow({ downtimeId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeConfirm_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.delete'))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeCancel_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.cancel'))
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCharacterCardRows({ characterId, ownerDiscordId, isFiller, simplifiedTracking, guildStatus }) {
    const primaryRow = new ActionRowBuilder();
    const normalizedStatus = String(guildStatus || '').trim().toLowerCase();
    const canRegister = normalizedStatus === 'draft' || normalizedStatus === 'needs_changes';
    const canLogActivity = !canRegister || !isCharacterStatusSwitchEnabled;
    if (canRegister) {
        primaryRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_register_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.registerWithMagiergilde'))
                .setStyle(ButtonStyle.Success)
                .setDisabled(!isCharacterStatusSwitchEnabled),
        );
    }
    if (!simplifiedTracking && canLogActivity) {
        primaryRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_adv_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.adventureShort'))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`characterCard_dt_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.downtimeShort'))
                .setStyle(ButtonStyle.Primary)
                .setDisabled(Boolean(isFiller)),
        );
    }
    if (simplifiedTracking && canLogActivity) {
        primaryRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_manual_level_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.setLevelShort'))
                .setStyle(ButtonStyle.Primary),
        );
    }
    primaryRow.addComponents(
        new ButtonBuilder()
            .setCustomId(`characterCard_manage_${characterId}_${ownerDiscordId}`)
            .setLabel(t('characters.manageShort'))
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`characterCard_del_${characterId}_${ownerDiscordId}`)
            .setLabel('Delete')
            .setStyle(ButtonStyle.Danger),
    );

    return [
        primaryRow,
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_list_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.backToList'))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCharacterRegisterConfirmRow({ characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`characterRegisterConfirm_${characterId}_${ownerDiscordId}`)
            .setLabel(t('characters.registerWithMagiergilde'))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`characterRegisterCancel_${characterId}_${ownerDiscordId}`)
            .setLabel(t('common.cancel'))
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCharacterRegisterConfirmView({ character, ownerDiscordId }) {
    const name = String(character?.name || `Character ${character?.id || ''}`).trim() || `Character ${character?.id || ''}`;
    const currentStatus = String(character?.guild_status || '').trim().toLowerCase();
    const locale = character?.locale || null;
    const descriptionKey = currentStatus === 'needs_changes'
        ? 'characters.registerConfirmDescriptionNeedsChanges'
        : 'characters.registerConfirmDescriptionDraft';
    const embed = new EmbedBuilder()
        .setTitle(t('characters.registerConfirmTitle', {}, locale))
        .setColor(0xf59e0b)
        .setDescription(t(descriptionKey, { name }, locale));

    return {
        embeds: [embed],
        components: [buildCharacterRegisterConfirmRow({ characterId: character.id, ownerDiscordId })],
    };
}

function buildCharacterRegisterNoteModal({ characterId, ownerDiscordId, initialNote = '' }) {
    const modal = new ModalBuilder()
        .setCustomId(`characterRegisterNoteModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.registrationNotesTitle'));

    const noteInput = new TextInputBuilder()
        .setCustomId('registrationNote')
        .setLabel(t('characters.registrationNotesLabel'))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(2000)
        .setPlaceholder(t('characters.registrationNotesPlaceholder'))
        .setValue(safeModalValue(initialNote, 2000));

    modal.addComponents(new ActionRowBuilder().addComponents(noteInput));

    return modal;
}

function buildAdventureListRows({ characterId, ownerDiscordId, adventures, locale = null }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.chooseAdventure', {}, locale))
        .addOptions(
            adventures.slice(0, 25).map(a => {
                const title = String(a.title || '').trim() || t('characters.noTitleFallback', {}, locale);
                const extra = a.has_additional_bubble ? ' +1' : '';
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${title}${extra}`.slice(0, 100))
                    .setDescription(formatAdventureListDescription(a))
                    .setValue(String(a.id));
            }),
        );
    return [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advListBack_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.backToCharacter', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function getDowntimeFieldValues(state) {
    const duration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined
        ? formatDurationSeconds(state.data.durationSeconds)
        : '-';
    const date = formatIsoDate(state?.data?.startDate);
    const type = state?.data?.type || '-';
    const notes = state?.data?.notes ? truncateText(state.data.notes, 200) : '-';

    return { duration, date, type, notes };
}

function formatDowntimeSummaryFields(state) {
    const locale = state?.locale || null;
    const values = getDowntimeFieldValues(state);
    return [
        { name: t('characters.durationField', {}, locale), value: values.duration, inline: true },
        { name: t('characters.dateField', {}, locale), value: values.date, inline: true },
        { name: t('characters.typeField', {}, locale), value: values.type, inline: true },
        { name: t('characters.notesField', {}, locale), value: values.notes, inline: false },
    ];
}

function formatDowntimeStepFields(stepKey, state) {
    const locale = state?.locale || null;
    const values = getDowntimeFieldValues(state);
    switch (stepKey) {
        case 'duration':
            return [{ name: t('characters.durationField', {}, locale), value: values.duration, inline: true }];
        case 'date':
            return [{ name: t('characters.dateField', {}, locale), value: values.date, inline: true }];
        case 'type':
            return [{ name: t('characters.typeField', {}, locale), value: values.type, inline: true }];
        case 'notes':
            return [{ name: t('characters.notesField', {}, locale), value: values.notes, inline: false }];
        default:
            return [];
    }
}

function buildDowntimeStepEmbed(stepKey, state, description) {
    const locale = state?.locale || null;
    const stepNumber = getDowntimeStepNumber(stepKey);
    const title = state?.mode === 'edit'
        ? t('characters.editDowntimeTitle', {}, locale)
        : t('characters.createDowntimeTitle', {}, locale);
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
    const locale = state?.locale || null;
    const hasDuration = state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_duration_custom_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.enterDurationTitle', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `dtCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `dtCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `dtCreate_cancel_${characterId}_${ownerDiscordId}`,
        locale,
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
    const locale = state?.locale || null;
    const selected = String(state?.data?.type || 'other').toLowerCase();

    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtCreate_type_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectTypePlaceholder', {}, locale))
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
        locale,
    }));
}

function buildDowntimeNotesRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_notes_edit_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.notesField', {}, locale))
                .setStyle(ButtonStyle.Primary),
        ),
    ];

    return rows.concat(buildStepperNavRows({
        backId: `dtCreate_back_${characterId}_${ownerDiscordId}`,
        nextId: `dtCreate_next_${characterId}_${ownerDiscordId}`,
        cancelId: `dtCreate_cancel_${characterId}_${ownerDiscordId}`,
        locale,
    }));
}

function buildDowntimeConfirmRows(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const confirmLabel = state?.mode === 'edit'
        ? t('characters.saveDowntime', {}, locale)
        : t('characters.createDowntimeTitle', {}, locale);
    const confirmStyle = state?.mode === 'edit' ? ButtonStyle.Primary : ButtonStyle.Success;
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_back_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtCreate_confirm_${characterId}_${ownerDiscordId}`)
                .setLabel(confirmLabel)
                .setStyle(confirmStyle),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtCreate_cancel_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.cancel', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildDowntimeDurationModal(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`dtCreate_durationModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.downtimeField', {}, locale));

    const durationInput = new TextInputBuilder()
        .setCustomId('dtDuration')
        .setLabel(t('characters.durationInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(state?.data?.durationSeconds !== null && state?.data?.durationSeconds !== undefined
            ? formatDurationSeconds(state.data.durationSeconds)
            : '');

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildDowntimeDateModal(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`dtCreate_dateModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.downtimeField', {}, locale));

    const dateInput = new TextInputBuilder()
        .setCustomId('dtDate')
        .setLabel(t('characters.dateInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(formatIsoDate(state?.data?.startDate, ''), 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildDowntimeNotesModal(state) {
    const { characterId, ownerDiscordId } = state;
    const locale = state?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`dtCreate_notesModal_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.notesModalTitle', {}, locale));

    const notesInput = new TextInputBuilder()
        .setCustomId('dtNotes')
        .setLabel(t('characters.notesOptionalLabel', {}, locale))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(state?.data?.notes));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
}

function buildDowntimeManageDurationModal({ downtimeId, characterId, ownerDiscordId, downtime }) {
    const locale = downtime?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`dtManage_durationModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.downtimeField', {}, locale));

    const durationInput = new TextInputBuilder()
        .setCustomId('dtDuration')
        .setLabel(t('characters.durationInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(formatDurationSeconds(Number(downtime.duration || 0)));

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildDowntimeManageDateModal({ downtimeId, characterId, ownerDiscordId, downtime }) {
    const locale = downtime?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`dtManage_dateModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.downtimeField', {}, locale));

    const dateInput = new TextInputBuilder()
        .setCustomId('dtDate')
        .setLabel(t('characters.dateInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(formatIsoDate(downtime.start_date, ''), 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildDowntimeManageNotesModal({ downtimeId, characterId, ownerDiscordId, downtime }) {
    const locale = downtime?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`dtManage_notesModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.notesModalTitle', {}, locale));

    const notesInput = new TextInputBuilder()
        .setCustomId('dtNotes')
        .setLabel(t('characters.notesField', {}, locale))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(downtime.notes, 1000));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
}

function buildAdventureManageDurationModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const locale = adventure?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advManage_durationModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.adventureField', {}, locale));

    const durationInput = new TextInputBuilder()
        .setCustomId('advDuration')
        .setLabel(t('characters.durationInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(formatDurationSeconds(Number(adventure.duration || 0)));

    modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
    return modal;
}

function buildAdventureManageDateModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const locale = adventure?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advManage_dateModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.adventureField', {}, locale));

    const dateInput = new TextInputBuilder()
        .setCustomId('advDate')
        .setLabel(t('characters.dateInputLabel', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setValue(safeModalValue(formatIsoDate(adventure.start_date, ''), 10));

    modal.addComponents(new ActionRowBuilder().addComponents(dateInput));
    return modal;
}

function buildAdventureManageTitleModal({ adventureId, characterId, ownerDiscordId, adventure }) {
    const locale = adventure?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advManage_titleModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.titleAndGmTitle', {}, locale));

    const titleInput = new TextInputBuilder()
        .setCustomId('advTitle')
        .setLabel(t('characters.titleField', {}, locale))
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setValue(safeModalValue(adventure.title, 100));

    const gmInput = new TextInputBuilder()
        .setCustomId('advGm')
        .setLabel(t('characters.gameMasterField', {}, locale))
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
    const locale = adventure?.locale || null;
    const modal = new ModalBuilder()
        .setCustomId(`advManage_notesModal_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setTitle(t('characters.notesModalTitle', {}, locale));

    const notesInput = new TextInputBuilder()
        .setCustomId('advNotes')
        .setLabel(t('characters.notesField', {}, locale))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(safeModalValue(adventure.notes, 1000));

    modal.addComponents(new ActionRowBuilder().addComponents(notesInput));
    return modal;
}

function buildAdventureManageRows({ adventureId, characterId, ownerDiscordId, isPseudo, locale = null }) {
    const disabled = Boolean(isPseudo);

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advManage_duration_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.durationField', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`advManage_date_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.dateField', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`advManage_title_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.titleAndGmTitle', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`advManage_quest_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.characterQuestField', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`advManage_notes_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.notesField', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`advManage_participants_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.participantsField', {}, locale))
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.delete', {}, locale))
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAdventureManageEmbed(adventure, participants) {
    const locale = adventure?.locale || null;
    const questValue = adventure.has_additional_bubble
        ? t('characters.characterQuestYes', {}, locale)
        : t('characters.characterQuestNo', {}, locale);
    const notesValue = String(adventure.notes || '').trim() || '-';
    const titleValue = String(adventure.title || '').trim() || '-';
    const gameMasterValue = String(adventure.game_master || '').trim() || '-';
    const participantValue = participants.length > 0 ? formatParticipantList(participants) : '-';

    const embed = new EmbedBuilder()
        .setTitle(t('characters.editAdventureTitle', {}, locale))
        .setColor(0x4f46e5)
        .addFields(
            { name: t('characters.dateField', {}, locale), value: formatIsoDate(adventure.start_date), inline: true },
            { name: t('characters.durationField', {}, locale), value: formatDurationSeconds(adventure.duration), inline: true },
            { name: t('characters.characterQuestField', {}, locale), value: questValue, inline: true },
            { name: t('characters.titleField', {}, locale), value: titleValue, inline: false },
            { name: t('characters.gameMasterField', {}, locale), value: gameMasterValue, inline: false },
            { name: t('characters.notesField', {}, locale), value: notesValue.slice(0, 1024), inline: false },
            { name: t('characters.participantsField', {}, locale), value: participantValue, inline: false },
        );

    if (adventure.is_pseudo) {
        embed.setDescription(t('characters.pseudoAdventureNotEditable', {}, locale));
    }

    return embed;
}

function buildAdventureManageView({ adventure, participants, ownerDiscordId, characterId }) {
    const locale = adventure?.locale || null;
    return {
        embed: buildAdventureManageEmbed(adventure, participants),
        components: buildAdventureManageRows({
            adventureId: adventure.id,
            characterId,
            ownerDiscordId,
            isPseudo: adventure.is_pseudo,
            locale,
        }),
    };
}

function buildAdventureQuestManageView({ adventure, ownerDiscordId, characterId }) {
    const locale = adventure?.locale || null;
    const selected = adventure.has_additional_bubble ? 'yes' : 'no';
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advManage_questSelect_${adventure.id}_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectCharacterQuestPlaceholder', {}, locale))
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(t('characters.characterQuestYes', {}, locale))
                .setValue('yes')
                .setDefault(selected === 'yes'),
            new StringSelectMenuOptionBuilder()
                .setLabel(t('characters.characterQuestNo', {}, locale))
                .setValue('no')
                .setDefault(selected === 'no'),
        );

    const embed = new EmbedBuilder()
        .setTitle(t('characters.updateCharacterQuestTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(t('characters.updateCharacterQuestDescription', {}, locale));

    return {
        embed,
        components: [
            new ActionRowBuilder().addComponents(select),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advManage_back_${adventure.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel(t('common.back', {}, locale))
                    .setStyle(ButtonStyle.Secondary),
            ),
        ],
    };
}

function buildDowntimeListRows({ characterId, ownerDiscordId, downtimes, locale = null }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectDowntimePlaceholder', {}, locale))
        .addOptions(
            downtimes.slice(0, 25).map(d =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${formatIsoDate(d.start_date)} - ${String(d.type || 'other')}`.slice(0, 100))
                    .setDescription(formatDurationSeconds(d.duration))
                    .setValue(String(d.id)),
            ),
        );
    return [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtListBack_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.backToCharacter', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildDowntimeManageRows({ downtimeId, characterId, ownerDiscordId, locale = null }) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtManage_duration_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.durationField', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtManage_date_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.dateField', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtManage_type_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.typeField', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtManage_notes_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('characters.notesField', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.delete', {}, locale))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildDowntimeManageEmbed(downtime) {
    const locale = downtime?.locale || null;
    const notesValue = String(downtime.notes || '').trim() || '-';
    const typeValue = String(downtime.type || 'other');

    return new EmbedBuilder()
        .setTitle(t('characters.editDowntimeTitle', {}, locale))
        .setColor(0x4f46e5)
        .addFields(
            { name: t('characters.dateField', {}, locale), value: formatIsoDate(downtime.start_date), inline: true },
            { name: t('characters.durationField', {}, locale), value: formatDurationSeconds(downtime.duration), inline: true },
            { name: t('characters.typeField', {}, locale), value: typeValue, inline: true },
            { name: t('characters.notesField', {}, locale), value: notesValue.slice(0, 1024), inline: false },
        );
}

function buildDowntimeManageView({ downtime, ownerDiscordId, characterId }) {
    const locale = downtime?.locale || null;
    return {
        embed: buildDowntimeManageEmbed(downtime),
        components: buildDowntimeManageRows({ downtimeId: downtime.id, characterId, ownerDiscordId, locale }),
    };
}

function buildDowntimeTypeManageView({ downtime, ownerDiscordId, characterId }) {
    const locale = downtime?.locale || null;
    const selected = String(downtime.type || 'other').toLowerCase();
    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtManage_typeSelect_${downtime.id}_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectTypePlaceholder', {}, locale))
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
        .setTitle(t('characters.updateDowntimeTypeTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(t('characters.updateDowntimeTypeDescription', {}, locale));

    return {
        embed,
        components: [
            new ActionRowBuilder().addComponents(select),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtManage_back_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel(t('common.back', {}, locale))
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
            { name: t('characters.dateField'), value: formatIsoDate(adventure.start_date), inline: true },
            { name: t('characters.durationField'), value: `${formatDurationSeconds(adventure.duration)}${extra}`, inline: true },
            { name: t('characters.idField'), value: String(adventure.id), inline: true },
        );

    if (participants.length > 0) {
        embed.addFields({ name: t('characters.participantsField'), value: formatParticipantList(participants), inline: false });
    }

    if (adventure.title) embed.addFields({ name: t('characters.titleField'), value: String(adventure.title).slice(0, 1024), inline: false });
    if (adventure.game_master) embed.addFields({ name: t('characters.gameMasterField'), value: String(adventure.game_master).slice(0, 1024), inline: false });
    if (adventure.notes) embed.addFields({ name: t('characters.notesField'), value: String(adventure.notes).slice(0, 1024), inline: false });
    return embed;
}

function buildDowntimeEmbed(downtime, title) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: t('characters.dateField'), value: formatIsoDate(downtime.start_date), inline: true },
            { name: t('characters.durationField'), value: formatDurationSeconds(downtime.duration), inline: true },
            { name: t('characters.typeField'), value: String(downtime.type || 'other'), inline: true },
            { name: t('characters.idField'), value: String(downtime.id), inline: true },
        );

    if (downtime.notes) embed.addFields({ name: t('characters.notesField'), value: String(downtime.notes).slice(0, 1024), inline: false });
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
            ? linkedName ? `Linked - ${linkedName}` : t('characters.linkedGuildMember')
            : t('characters.customAlly');
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
        description: t('characters.guildMember'),
        selected: selectedGuildCharacterIds.includes(Number(character.id)),
    }));

    const combined = [...allyOptions, ...guildOptions].filter(option => {
        if (!query) return true;
        return `${option.label} ${option.description}`.toLowerCase().includes(query);
    });

    combined.sort((a, b) => a.label.localeCompare(b.label));
    return combined;
}

function buildAdventureParticipantsSelect({ adventureId, characterId, ownerDiscordId, options, locale = null }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advParticipantsSelect_${adventureId}_${characterId}_${ownerDiscordId}`)
        .setPlaceholder(t('characters.selectParticipantsPlaceholder', {}, locale))
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

function buildAdventureParticipantsActions({ adventureId, characterId, ownerDiscordId, hasParticipants, backCustomId, locale = null }) {
    const backId = backCustomId || `advParticipantsBack_${adventureId}_${characterId}_${ownerDiscordId}`;
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`advParticipantsSearch_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel(t('characters.search', {}, locale))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`advParticipantsClear_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel(t('characters.removeAll', {}, locale))
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!hasParticipants),
        new ButtonBuilder()
            .setCustomId(backId)
            .setLabel(t('common.back', {}, locale))
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
        .setTitle(t('characters.editParticipantsTitle'))
        .setColor(0x4f46e5)
        .setDescription(`${formatIsoDate(adventure.start_date)} - ${String(adventure.title || t('characters.noTitleFallback'))}`)
        .addFields({ name: t('characters.currentField'), value: formatParticipantList(participants), inline: false });

    if (search) {
        embed.setFooter({ text: t('characters.participantsFilterFooter', { search, shown: limitedOptions.length, total: options.length }) });
    } else if (options.length > limitedOptions.length) {
        embed.setFooter({ text: t('characters.participantsShowingFooter', { shown: limitedOptions.length, total: options.length }) });
    }

    const components = [];
    if (limitedOptions.length > 0) {
        components.push(
            buildAdventureParticipantsSelect({
                adventureId,
                characterId,
                ownerDiscordId,
                options: limitedOptions,
                locale: null,
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
            locale: null,
        }),
    );

    return { embed, components, adventure, participants };
}


module.exports = {
    isHttpUrl,
    isExternalCharacterLink,
    safeModalValue,
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
    buildCharacterRegisterConfirmRow,
    buildCharacterRegisterConfirmView,
    buildCharacterRegisterNoteModal,
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
    formatGuildStatusLabel,
    safeInt,
    participantSearchKey,
    setParticipantSearch,
    getParticipantSearch,
};
