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
const { pendingCharacterCreations, pendingCharacterAvatarUpdates } = require('../state');

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
    if (!participants || participants.length === 0) return 'Keine Teilnehmer';
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

    const matchHhMm = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (matchHhMm) {
        const hours = Number(matchHhMm[1]);
        const minutes = Number(matchHhMm[2]);
        if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59 || hours < 0) return null;
        return hours * 3600 + minutes * 60;
    }

    const minutes = Number(raw);
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
    if (!text || text === 'none') return 'Keine';
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
                .setLabel('Name/Link/Notizen')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_avatar_${characterId}_${ownerDiscordId}`)
                .setLabel('Avatar')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_classes_${characterId}_${ownerDiscordId}`)
                .setLabel('Klassen')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`characterManage_faction_${characterId}_${ownerDiscordId}`)
                .setLabel('Fraktion')
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
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCharacterManageView(character, { ownerDiscordId }) {
    const name = String(character.name || `Charakter ${character.id}`);
    const classNames = String(character.class_names || '').trim() || '-';
    const isFiller = Boolean(character.is_filler);
    const startTierRaw = String(character.start_tier || '').trim();
    const startTier = isFiller ? 'Filler' : (startTierRaw ? startTierRaw.toUpperCase() : '-');
    const version = String(character.version || '2024');
    const faction = formatFactionLabel(character.faction);
    const notesRaw = String(character.notes || '').trim();
    const notes = notesRaw ? notesRaw.slice(0, 1000) : '-';
    const avatarRaw = String(character.avatar || '').trim();
    const avatar = avatarRaw ? 'Vorhanden' : 'Kein Avatar';
    const externalLink = String(character.external_link || character.externalLink || '').trim();
    const linkValue = externalLink
        ? (isHttpUrl(externalLink) ? `[Link öffnen](${externalLink})` : externalLink.slice(0, 1000))
        : '-';
    const dmBubbles = String(safeInt(character.dm_bubbles));
    const dmCoins = String(safeInt(character.dm_coins));
    const bubbleSpend = String(safeInt(character.bubble_shop_spend));

    const descriptionParts = [name];
    if (startTier !== '-') {
        descriptionParts.push(startTier);
    }

    const embed = new EmbedBuilder()
        .setTitle('Charakter verwalten')
        .setColor(0x4f46e5)
        .setDescription(descriptionParts.join(' \u00b7 '))
        .addFields(
            { name: 'Klassen', value: classNames, inline: false },
            { name: 'Fraktion', value: faction, inline: true },
            { name: 'Version', value: version, inline: true },
            { name: 'Start-Tier', value: startTier, inline: true },
            { name: 'Avatar', value: avatar, inline: true },
            { name: 'External Link', value: linkValue, inline: false },
            { name: 'Notizen', value: notes, inline: false },
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

function ensurePromptMessage(state, interaction) {
    if (!state) return;
    if (!state.promptMessage && interaction?.message) {
        state.promptMessage = interaction.message;
    }
    if (interaction?.isRepliable?.()) {
        state.promptInteraction = interaction;
    }
}

function buildCreationCancelRow(ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCreationEmbed(step, title, description) {
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .setDescription(description)
        .setFooter({ text: `Schritt ${step}/7` });
}

function buildClassesRow({ ownerDiscordId, classes, selectedIds }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`charactersCreate_classes_${ownerDiscordId}`)
        .setPlaceholder('Klassen ausw\u00e4hlen\u2026')
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
        .setPlaceholder('Start-Tier ausw\u00e4hlen\u2026')
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
        { label: 'Keine', value: 'none' },
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
        .setPlaceholder('Fraktion ausw\u00e4hlen\u2026')
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
        .setPlaceholder('Version ausw\u00e4hlen\u2026')
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
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersCreate_confirm_${ownerDiscordId}`)
                .setLabel('Charakter erstellen')
                .setStyle(ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel('Abbrechen')
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
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildCreationStepActionRows(ownerDiscordId, stepKey) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_back_${ownerDiscordId}`)
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersCreate_next_${stepKey}_${ownerDiscordId}`)
                .setLabel('Weiter')
                .setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersCreate_cancel_${ownerDiscordId}`)
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAvatarUploadRow(ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersCreate_avatar_dm_${ownerDiscordId}`)
            .setLabel('Avatar in DM hochladen')
            .setStyle(ButtonStyle.Primary),
    );
}

function buildCreationBasicsEmbed(state, message) {
    const embed = buildCreationEmbed(1, 'Charakter erstellen', message || 'Bearbeite die Basisangaben.');
    embed.addFields(
        { name: 'Name', value: state?.data?.name || '-', inline: false },
        { name: 'External Link', value: state?.data?.externalLink || '-', inline: false },
        { name: 'Avatar', value: state?.data?.avatar || 'Kein Avatar', inline: false },
        { name: 'Notizen', value: state?.data?.notes || '-', inline: false },
    );
    return embed;
}

function buildAvatarStepEmbed(state, message) {
    const description = message
        || 'Lade ein Avatar-Bild hoch (optional). Nutze **Avatar in DM hochladen** und klicke dann **Weiter**.';
    const embed = buildCreationEmbed(2, 'Avatar hochladen', description);
    embed.addFields({
        name: 'Avatar',
        value: state?.data?.avatar ? 'Hochgeladen' : 'Kein Avatar',
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
            { name: 'Avatar', value: state.data.avatar || 'Kein Avatar', inline: false },
            { name: 'Klassen', value: classNames.length > 0 ? classNames.join(', ') : '-', inline: false },
            { name: 'Start-Tier', value: tierLabel || '-', inline: true },
            { name: 'Fraktion', value: state.data.faction || 'none', inline: true },
            { name: 'Version', value: state.data.version || '2024', inline: true },
            { name: 'Notizen', value: state.data.notes ? state.data.notes : '—', inline: false },
        );

    return embed;
}

function buildCreationBasicModal(ownerDiscordId, state) {
    const modal = new ModalBuilder()
        .setCustomId(`charactersCreate_basic_${ownerDiscordId}`)
        .setTitle('Charakter erstellen');

    const nameInput = new TextInputBuilder()
        .setCustomId('createName')
        .setLabel('Charaktername')
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
        .setLabel('Notizen (optional)')
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
            const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text;
            console.warn(`[bot] Avatar upload failed (${response.status}). content-type=${contentType} body=${preview}`);
            return false;
        }

        if (!contentType.includes('application/json')) {
            const text = await response.text().catch(() => '');
            const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text;
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
            content: 'Charakterdaten unvollst\u00e4ndig. Bitte erneut starten.',
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
            content: 'Charakter konnte nicht erstellt werden.',
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
            content: 'Charakter erstellt.',
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
        embeds: [buildAvatarStepEmbed(state, 'Avatar gespeichert. Du kannst fortfahren.')],
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
    const attachment = attachments.find(item => String(item.contentType || '').startsWith('image/')) || attachments[0];
    if (!attachment?.url) return false;

    await message.delete().catch(() => {});

    const storedAvatar = await storeCharacterAvatar(state.characterId, attachment.url);
    clearAvatarUpdateState(message.author.id);

    if (!state.promptMessage?.editable) {
        return true;
    }

    if (!storedAvatar) {
        await state.promptMessage.edit({
            content: 'Avatar konnte nicht gespeichert werden.',
        }).catch(() => {});
        return true;
    }

    const character = await findCharacterForDiscord(message.author, state.characterId);
    if (!character) {
        await state.promptMessage.edit({ content: 'Charakter nicht gefunden.' }).catch(() => {});
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
        .setPlaceholder('Klassen ausw\u00e4hlen\u2026')
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
        .setTitle('Klassen')
        .setColor(0x4f46e5)
        .setDescription(`Ausgew\u00e4hlt f\u00fcr ${character.name}.`);

    const components = [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${character.id}_${ownerDiscordId}`)
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embed, components };
}

function buildCharacterFactionView({ character, ownerDiscordId }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`characterFactionSelect_${character.id}_${ownerDiscordId}`)
        .setPlaceholder('Fraktion ausw\u00e4hlen\u2026')
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
        .setTitle('Fraktion')
        .setColor(0x4f46e5)
        .setDescription(`Ausgew\u00e4hlt f\u00fcr ${character.name}.`);

    const components = [
        new ActionRowBuilder().addComponents(select),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterManage_back_${character.id}_${ownerDiscordId}`)
                .setLabel('Zur\u00fcck')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embed, components };
}

function buildDeleteConfirmRow({ characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteCharacterConfirm_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteCharacterCancel_${characterId}_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildAdventureDeleteConfirmRow({ adventureId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteAdventureConfirm_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteAdventureCancel_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeDeleteConfirmRow({ downtimeId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeConfirm_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`deleteDowntimeCancel_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Abbrechen')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildCharacterCardRows({ characterId, ownerDiscordId, isFiller }) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_adv_${characterId}_${ownerDiscordId}`)
                .setLabel('Abenteuer')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`characterCard_dt_${characterId}_${ownerDiscordId}`)
                .setLabel('Downtime')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(Boolean(isFiller)),
            new ButtonBuilder()
                .setCustomId(`characterCard_manage_${characterId}_${ownerDiscordId}`)
                .setLabel('Verwalten')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`characterCard_del_${characterId}_${ownerDiscordId}`)
                .setLabel('L\u00f6schen')
                .setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`characterCard_list_${characterId}_${ownerDiscordId}`)
                .setLabel('Zur Liste')
                .setStyle(ButtonStyle.Secondary),
        ),
    ];
}

function buildAdventureListRow({ characterId, ownerDiscordId, adventures }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`advSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Abenteuer ausw\u00e4hlen\u2026')
        .addOptions(
            adventures.slice(0, 25).map(a => {
                const title = String(a.title || '').trim() || '(ohne Titel)';
                const extra = a.has_additional_bubble ? ' +1' : '';
                return new StringSelectMenuOptionBuilder()
                    .setLabel(`${a.start_date} \u00b7 ${title}`.slice(0, 100))
                    .setDescription(`${formatDuration(a.duration)}${extra}`)
                    .setValue(String(a.id));
            }),
        );
    return new ActionRowBuilder().addComponents(select);
}

function buildAdventureActionRow({ adventureId, characterId, ownerDiscordId }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`advEdit_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Bearbeiten')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`advParticipantsOpen_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Teilnehmer')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`advDelete_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
            .setLabel('Zur\u00fcck')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildDowntimeListRow({ characterId, ownerDiscordId, downtimes }) {
    const select = new StringSelectMenuBuilder()
        .setCustomId(`dtSelect_${characterId}_${ownerDiscordId}`)
        .setPlaceholder('Downtime ausw\u00e4hlen\u2026')
        .addOptions(
            downtimes.slice(0, 25).map(d =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${d.start_date} \u00b7 ${String(d.type || 'other')}`.slice(0, 100))
                    .setDescription(formatDuration(d.duration))
                    .setValue(String(d.id)),
            ),
        );
    return new ActionRowBuilder().addComponents(select);
}

function buildAdventureEmbed(adventure, title, participants = []) {
    const extra = adventure.has_additional_bubble ? ' +1' : '';
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Datum', value: String(adventure.start_date), inline: true },
            { name: 'Dauer', value: `${formatDuration(adventure.duration)}${extra}`, inline: true },
            { name: 'ID', value: String(adventure.id), inline: true },
        );

    if (participants.length > 0) {
        embed.addFields({ name: 'Teilnehmer', value: formatParticipantList(participants), inline: false });
    }

    if (adventure.title) embed.addFields({ name: 'Titel', value: String(adventure.title).slice(0, 1024), inline: false });
    if (adventure.game_master) embed.addFields({ name: 'GM', value: String(adventure.game_master).slice(0, 1024), inline: false });
    if (adventure.notes) embed.addFields({ name: 'Notizen', value: String(adventure.notes).slice(0, 1024), inline: false });
    return embed;
}

function buildDowntimeEmbed(downtime, title) {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(0x4f46e5)
        .addFields(
            { name: 'Datum', value: String(downtime.start_date), inline: true },
            { name: 'Dauer', value: formatDuration(downtime.duration), inline: true },
            { name: 'Typ', value: String(downtime.type || 'other'), inline: true },
            { name: 'ID', value: String(downtime.id), inline: true },
        );

    if (downtime.notes) embed.addFields({ name: 'Notizen', value: String(downtime.notes).slice(0, 1024), inline: false });
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
        .setPlaceholder('Teilnehmer ausw\u00e4hlen\u2026')
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

function buildAdventureParticipantsActions({ adventureId, characterId, ownerDiscordId, hasParticipants }) {
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
            .setCustomId(`advParticipantsBack_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setLabel('Zur\u00fcck')
            .setStyle(ButtonStyle.Secondary),
    );
}

async function buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId }) {
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
        .setTitle('Teilnehmer bearbeiten')
        .setColor(0x4f46e5)
        .setDescription(`${adventure.start_date} \u00b7 ${String(adventure.title || '(ohne Titel)')}`)
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
        }),
    );

    return { embed, components, adventure, participants };
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
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
                embeds: [buildCreationEmbed(1, 'Charakter erstellen', 'Du hast bereits eine offene Erstellung. Bitte beende sie oder klicke **Abbrechen**.')],
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
            embeds: [buildCreationBasicsEmbed(state, 'Starte mit den Basisangaben.')],
            components: buildCreationBasicsRows(ownerDiscordId),
            content: '',
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('charactersSelect_')) {
        const ownerDiscordId = interaction.customId.replace('charactersSelect_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const selectedId = Number(interaction.values[0]);
        if (!Number.isFinite(selectedId) || selectedId < 1) {
            await interaction.reply({ content: 'Ung\u00fcltige Auswahl.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.classIds = interaction.values.map(value => Number(value)).filter(value => Number.isFinite(value));
        state.step = 'classes';
        const classes = await listCharacterClassesForDiscord();

        await interaction.update({
            embeds: [
                buildCreationEmbed(3, 'Klassen w\u00e4hlen', 'W\u00e4hle eine oder mehrere Klassen.'),
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
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
                buildCreationEmbed(4, 'Start-Tier w\u00e4hlen', 'W\u00e4hle das Start-Tier oder **Filler**.'),
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.faction = interaction.values[0];
        state.step = 'faction';

        await interaction.update({
            embeds: [
                buildCreationEmbed(5, 'Fraktion w\u00e4hlen', 'W\u00e4hle die Fraktion.'),
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.data.version = interaction.values[0];
        state.step = 'version';

        await interaction.update({
            embeds: [
                buildCreationEmbed(6, 'Version w\u00e4hlen', 'W\u00e4hle die Regelversion.'),
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        state.promptInteraction = interaction;

        if (state.step === 'finalize') {
            state.step = 'version';
            await interaction.update({
                embeds: [
                    buildCreationEmbed(6, 'Version w\u00e4hlen', 'W\u00e4hle die Regelversion.'),
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
                        buildCreationEmbed(4, 'Start-Tier w\u00e4hlen', 'W\u00e4hle das Start-Tier oder **Filler**.'),
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
                    buildCreationEmbed(5, 'Fraktion w\u00e4hlen', 'W\u00e4hle die Fraktion.'),
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
                    buildCreationEmbed(4, 'Start-Tier w\u00e4hlen', 'W\u00e4hle das Start-Tier oder **Filler**.'),
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
                    buildCreationEmbed(3, 'Klassen w\u00e4hlen', 'W\u00e4hle eine oder mehrere Klassen.'),
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

        await interaction.reply({ content: 'Kein vorheriger Schritt verf\u00fcgbar.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_next_')) {
        const suffix = interaction.customId.replace('charactersCreate_next_', '');
        const [stepKey, ownerDiscordId] = suffix.split('_');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        ensurePromptMessage(state, interaction);
        if (stepKey === 'avatar') {
            state.step = 'classes';
            const classes = await listCharacterClassesForDiscord();
            await interaction.update({
                embeds: [
                    buildCreationEmbed(3, 'Klassen w\u00e4hlen', 'W\u00e4hle eine oder mehrere Klassen.'),
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
                    buildCreationEmbed(3, 'Klassen w\u00e4hlen', 'Bitte w\u00e4hle mindestens eine Klasse.'),
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
                    buildCreationEmbed(4, 'Start-Tier w\u00e4hlen', 'W\u00e4hle das Start-Tier oder **Filler**.'),
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
                        buildCreationEmbed(4, 'Start-Tier w\u00e4hlen', 'Bitte w\u00e4hle ein Start-Tier oder **Filler**.'),
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
                        buildCreationEmbed(6, 'Version w\u00e4hlen', 'W\u00e4hle die Regelversion.'),
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
                    buildCreationEmbed(5, 'Fraktion w\u00e4hlen', 'W\u00e4hle die Fraktion.'),
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
                        buildCreationEmbed(5, 'Fraktion w\u00e4hlen', 'Bitte w\u00e4hle eine Fraktion.'),
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
                    buildCreationEmbed(6, 'Version w\u00e4hlen', 'W\u00e4hle die Regelversion.'),
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
                        buildCreationEmbed(6, 'Version w\u00e4hlen', 'Bitte w\u00e4hle eine Regelversion.'),
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
                    buildCreationEmbed(7, 'Finalisieren', 'Bitte best\u00e4tige die Angaben.'),
                    summary,
                ],
                components: buildCreationConfirmRows(ownerDiscordId),
                content: '',
            });
            return true;
        }

        await interaction.reply({ content: 'Unbekannter Schritt.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('charactersCreate_basicopen_')) {
        const ownerDiscordId = interaction.customId.replace('charactersCreate_basicopen_', '');
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const state = getCreationState(ownerDiscordId);
        if (!state) {
            await interaction.reply({ content: 'Keine offene Erstellung gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const dm = await interaction.user.createDM();
        const sourceLink = state?.promptMessage?.url ? `\nZur\u00fcck zum Charakter-Dialog: ${state.promptMessage.url}` : '';
        await dm.send(`Bitte sende mir hier dein Avatar-Bild. Ich speichere es nur f\u00fcr diesen Charakter.${sourceLink}`);

        await interaction.deferUpdate();
        await updateCreationMessage(state, {
            embeds: [buildAvatarStepEmbed(state, 'Ich habe dir eine DM geschickt. Lade dort dein Avatar-Bild hoch.')],
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const classIds = interaction.values.map(value => Number(value)).filter(value => Number.isFinite(value));
        try {
            const result = await syncCharacterClassesForDiscord(interaction.user, characterId, classIds);
            if (!result.ok) {
                await interaction.reply({ content: 'Klassen konnten nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const character = await findCharacterForDiscord(interaction.user, characterId);
            if (!character) {
                await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const faction = String(interaction.values[0] || '').trim().toLowerCase();
        if (!allowedFactions.has(faction)) {
            await interaction.reply({ content: 'Ung\u00fcltige Fraktion.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateCharacterForDiscord(interaction.user, characterId, { faction });
        if (!result.ok) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Ung\u00fcltige URL (nur http/https).', flags: MessageFlags.Ephemeral });
            return true;
        }

        const result = await updateCharacterForDiscord(interaction.user, characterId, {
            name,
            externalLink: url,
            notes,
        });

        if (!result.ok) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Charakter aktualisiert.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const dmBubbles = interaction.fields.getTextInputValue('dmBubbles');
        const result = await updateCharacterForDiscord(interaction.user, characterId, { dmBubbles });
        if (!result.ok) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Charakter aktualisiert.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const dmCoins = interaction.fields.getTextInputValue('dmCoins');
        const result = await updateCharacterForDiscord(interaction.user, characterId, { dmCoins });
        if (!result.ok) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Charakter aktualisiert.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const bubbleShopSpend = interaction.fields.getTextInputValue('bubbleSpend');
        const result = await updateCharacterForDiscord(interaction.user, characterId, { bubbleShopSpend });
        if (!result.ok) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Charakter aktualisiert.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Ung\u00fcltige Charakter-ID.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
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
                content: 'Charakter wirklich l\u00f6schen?',
                components: [buildDeleteConfirmRow({ characterId: character.id, ownerDiscordId })],
            });
            return true;
        }

        if (action === 'adv') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advAdd_${character.id}_${ownerDiscordId}`)
                    .setLabel('Neues Abenteuer')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`advList_${character.id}_${ownerDiscordId}`)
                    .setLabel('Liste')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ components: [row], content: '' });
            return true;
        }

        if (action === 'dt') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtAdd_${character.id}_${ownerDiscordId}`)
                    .setLabel('Downtime hinzuf\u00fcgen')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(Boolean(character.is_filler)),
                new ButtonBuilder()
                    .setCustomId(`dtList_${character.id}_${ownerDiscordId}`)
                    .setLabel('Liste')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(Boolean(character.is_filler)),
                new ButtonBuilder()
                    .setCustomId(`characterCard_back_${character.id}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );
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

        await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Ung\u00fcltige Charakter-ID.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const character = await findCharacterForDiscord(interaction.user, characterId);
        if (!character) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
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
                .setTitle('Charakterdaten');

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
                .setLabel('Notizen (optional)')
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
            const sourceLink = interaction.message?.url ? `\nZur\u00fcck zum Charakter-Dialog: ${interaction.message.url}` : '';
            await dm.send(`Bitte sende mir hier dein Avatar-Bild. Ich speichere es nur f\u00fcr diesen Charakter.${sourceLink}`);

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

        await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('deleteCharacter')) {
        const [action, idRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(idRaw);
        if (!Number.isFinite(characterId) || characterId < 1) {
            await interaction.reply({ content: 'Ung\u00fcltige Charakter-ID.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
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
                await interaction.update({ content: 'Charakter nicht gefunden oder bereits gel\u00f6scht.', components: [] });
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
            await interaction.update({ content: `Fehler beim L\u00f6schen: ${error.message}`, components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advAdd_')) {
        const match = interaction.customId.match(/^advAdd_(\d+)_(\d+)$/);
        if (!match) return false;
        const characterId = Number(match[1]);
        const ownerDiscordId = match[2];

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`advCreateModal_${characterId}_${ownerDiscordId}`)
            .setTitle('Abenteuer hinzuf\u00fcgen');

        const durationInput = new TextInputBuilder()
            .setCustomId('advDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setPlaceholder('03:00')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const dateInput = new TextInputBuilder()
            .setCustomId('advDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(new Date().toISOString().slice(0, 10));

        const titleInput = new TextInputBuilder()
            .setCustomId('advTitle')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const gmInput = new TextInputBuilder()
            .setCustomId('advGm')
            .setLabel('Game Master (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const bonusInput = new TextInputBuilder()
            .setCustomId('advBonus')
            .setLabel('Bonus Bubble (+1)?')
            .setPlaceholder('nein | ja')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('nein');

        modal.addComponents(
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(gmInput),
            new ActionRowBuilder().addComponents(bonusInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advCreateModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();
        const bonusRaw = String(interaction.fields.getTextInputValue('advBonus') || '').trim().toLowerCase();

        const hasAdditionalBubble = ['1', 'true', 'ja', 'j', 'yes', 'y', '+1'].includes(bonusRaw);

        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await createAdventureForDiscord(interaction.user, {
                characterId,
                duration,
                startDate,
                hasAdditionalBubble,
                notes: '',
                title,
                gameMaster,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Abenteuer konnte nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const adventure = await findAdventureForDiscord(interaction.user, result.id);
            if (!adventure) {
                await interaction.reply({ content: 'Abenteuer gespeichert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const participants = await listAdventureParticipantsForDiscord(interaction.user, adventure.id);
            const row = buildAdventureActionRow({ adventureId: adventure.id, characterId, ownerDiscordId });

            await interaction.reply({
                embeds: [buildAdventureEmbed(adventure, 'Abenteuer gespeichert', participants)],
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
            await interaction.reply({ content: 'Fehler beim Speichern des Abenteuers.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
            if (adventures.length === 0) {
                await interaction.reply({ content: 'Keine Abenteuer gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Abenteuer').setDescription('W\u00e4hle ein Abenteuer.')],
                components: [buildAdventureListRow({ characterId, ownerDiscordId, adventures })],
                flags: MessageFlags.Ephemeral,
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return true;
            }
            await interaction.reply({ content: 'Fehler beim Laden der Abenteuer.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`dtCreateModal_${characterId}_${ownerDiscordId}`)
            .setTitle('Downtime hinzuf\u00fcgen');

        const typeInput = new TextInputBuilder()
            .setCustomId('dtType')
            .setLabel('Typ')
            .setPlaceholder('faction | other')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue('other');

        const durationInput = new TextInputBuilder()
            .setCustomId('dtDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setPlaceholder('03:00')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const dateInput = new TextInputBuilder()
            .setCustomId('dtDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(new Date().toISOString().slice(0, 10));

        const notesInput = new TextInputBuilder()
            .setCustomId('dtNotes')
            .setLabel('Notizen (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtCreateModal_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const typeRaw = String(interaction.fields.getTextInputValue('dtType') || '').trim().toLowerCase();
        const normalizedType = (() => {
            if (['faction', 'f', '1'].includes(typeRaw)) return 'faction';
            if (['other', 'o', '2'].includes(typeRaw)) return 'other';
            return null;
        })();
        if (!normalizedType) {
            await interaction.reply({ content: 'Ung\u00fcltiger Typ. Nutze `faction` oder `other`.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();

        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await createDowntimeForDiscord(interaction.user, {
                characterId,
                duration,
                startDate,
                type: normalizedType,
                notes,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Downtime konnte nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const downtime = await findDowntimeForDiscord(interaction.user, result.id);
            if (!downtime) {
                await interaction.reply({ content: 'Downtime gespeichert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtime.id}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildDowntimeEmbed(downtime, 'Downtime gespeichert')],
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
            await interaction.reply({ content: 'Fehler beim Speichern der Downtime.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtList_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
            if (downtimes.length === 0) {
                await interaction.reply({ content: 'Keine Downtimes gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }
            await interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('W\u00e4hle eine Downtime.')],
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
            await interaction.reply({ content: 'Fehler beim Laden der Downtimes.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('advSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const adventureId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(adventureId) || adventureId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
            return true;
        }

        const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });

        await interaction.update({
            embeds: [buildAdventureEmbed(adventure, 'Abenteuer', participants)],
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`advParticipantsSearchModal_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setTitle('Teilnehmer suchen');

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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        setParticipantSearch(adventureId, ownerDiscordId, interaction.fields.getTextInputValue('participantSearch'));
        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.reply({ content: 'Abenteuer nicht gefunden.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
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
            await interaction.reply({ content: 'Teilnehmer konnten nicht gespeichert werden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await syncAdventureParticipantsForDiscord(interaction.user, adventureId, {
            characterId,
            allyIds: [],
            guildCharacterIds: [],
        });

        const view = await buildAdventureParticipantsView({ interaction, adventureId, characterId, ownerDiscordId });
        if (view.error) {
            await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
            return true;
        }

        const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });
        await interaction.update({ content: '', embeds: [buildAdventureEmbed(adventure, 'Abenteuer', participants)], components: [row] });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('dtSelect_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        const downtimeId = Number(interaction.values?.[0]);
        if (!Number.isFinite(characterId) || characterId < 1 || !Number.isFinite(downtimeId) || downtimeId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.update({ content: 'Downtime nicht gefunden.', embeds: [], components: [] });
            return true;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('Bearbeiten')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                .setLabel('L\u00f6schen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                .setLabel('Zur\u00fcck')
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventure = await findAdventureForDiscord(interaction.user, adventureId);
        if (!adventure || Number(adventure.character_id) !== characterId) {
            await interaction.reply({ content: 'Abenteuer nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`advUpdateModal_${adventureId}_${characterId}_${ownerDiscordId}`)
            .setTitle('Abenteuer bearbeiten');

        const durationInput = new TextInputBuilder()
            .setCustomId('advDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(formatDuration(adventure.duration));

        const dateInput = new TextInputBuilder()
            .setCustomId('advDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(safeModalValue(adventure.start_date, 10));

        const titleInput = new TextInputBuilder()
            .setCustomId('advTitle')
            .setLabel('Titel (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(safeModalValue(adventure.title));

        const gmInput = new TextInputBuilder()
            .setCustomId('advGm')
            .setLabel('Game Master (optional)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(safeModalValue(adventure.game_master));

        modal.addComponents(
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(gmInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('advUpdateModal_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('advDuration'));
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('advDate'));
        const title = (interaction.fields.getTextInputValue('advTitle') || '').trim();
        const gameMaster = (interaction.fields.getTextInputValue('advGm') || '').trim();

        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await updateAdventureForDiscord(interaction.user, adventureId, {
                duration,
                startDate,
                notes: '',
                title,
                gameMaster,
            });

            if (!result.ok) {
                await interaction.reply({ content: 'Abenteuer nicht gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
            if (!adventure) {
                await interaction.reply({ content: 'Abenteuer aktualisiert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });

            await interaction.reply({
                embeds: [buildAdventureEmbed(adventure, 'Abenteuer aktualisiert', participants)],
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
            await interaction.reply({ content: 'Fehler beim Speichern des Abenteuers.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advDelete_')) {
        const [, adventureIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const adventureId = Number(adventureIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(adventureId) || adventureId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: 'Abenteuer wirklich l\u00f6schen?',
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteAdventureCancel') {
            const { adventure, participants } = await getAdventureWithParticipants(interaction, adventureId);
            if (!adventure || Number(adventure.character_id) !== characterId) {
                await interaction.update({ content: 'Abenteuer nicht gefunden.', embeds: [], components: [] });
                return true;
            }

            const row = buildAdventureActionRow({ adventureId, characterId, ownerDiscordId });

            await interaction.update({
                content: '',
                embeds: [buildAdventureEmbed(adventure, 'Abenteuer', participants)],
                components: [row],
            });
            return true;
        }

        if (action !== 'deleteAdventureConfirm') return false;

        try {
            const result = await softDeleteAdventureForDiscord(interaction.user, adventureId);
            if (!result.ok) {
                await interaction.update({ content: 'Abenteuer nicht gefunden oder bereits gel\u00f6scht.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`advBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck zur Liste')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: 'Abenteuer wurde gel\u00f6scht.', embeds: [], components: [row] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: `Fehler beim L\u00f6schen: ${error.message}`, embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('advBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const adventures = await listAdventuresForDiscord(interaction.user, characterId, 25);
        if (adventures.length === 0) {
            await interaction.update({ content: 'Keine Abenteuer gefunden.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Abenteuer').setDescription('W\u00e4hle ein Abenteuer.')],
            components: [buildAdventureListRow({ characterId, ownerDiscordId, adventures })],
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
        if (!downtime || Number(downtime.character_id) !== characterId) {
            await interaction.reply({ content: 'Downtime nicht gefunden.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const modal = new ModalBuilder()
            .setCustomId(`dtUpdateModal_${downtimeId}_${characterId}_${ownerDiscordId}`)
            .setTitle('Downtime bearbeiten');

        const typeInput = new TextInputBuilder()
            .setCustomId('dtType')
            .setLabel('Typ')
            .setPlaceholder('faction | other')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(String(downtime.type || 'other'));

        const durationInput = new TextInputBuilder()
            .setCustomId('dtDuration')
            .setLabel('Dauer (HH:MM oder Minuten)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(formatDuration(downtime.duration));

        const dateInput = new TextInputBuilder()
            .setCustomId('dtDate')
            .setLabel('Datum (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(safeModalValue(downtime.start_date, 10));

        const notesInput = new TextInputBuilder()
            .setCustomId('dtNotes')
            .setLabel('Notizen (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(safeModalValue(downtime.notes));

        modal.addComponents(
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(durationInput),
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('dtUpdateModal_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const duration = parseDurationToSeconds(interaction.fields.getTextInputValue('dtDuration'));
        const typeRaw = String(interaction.fields.getTextInputValue('dtType') || '').trim().toLowerCase();
        const normalizedType = (() => {
            if (['faction', 'f', '1'].includes(typeRaw)) return 'faction';
            if (['other', 'o', '2'].includes(typeRaw)) return 'other';
            return null;
        })();
        const startDate = parseIsoDate(interaction.fields.getTextInputValue('dtDate'));
        const notes = (interaction.fields.getTextInputValue('dtNotes') || '').trim();

        if (!normalizedType) {
            await interaction.reply({ content: 'Ung\u00fcltiger Typ. Nutze `faction` oder `other`.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (duration === null) {
            await interaction.reply({ content: 'Ung\u00fcltige Dauer. Nutze HH:MM (z.B. 03:00) oder Minuten.', flags: MessageFlags.Ephemeral });
            return true;
        }
        if (!startDate) {
            await interaction.reply({ content: 'Ung\u00fcltiges Datum. Nutze YYYY-MM-DD.', flags: MessageFlags.Ephemeral });
            return true;
        }

        try {
            const result = await updateDowntimeForDiscord(interaction.user, downtimeId, {
                duration,
                startDate,
                type: normalizedType,
                notes,
            });
            if (!result.ok) {
                await interaction.reply({ content: 'Downtime nicht gefunden.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
            if (!downtime) {
                await interaction.reply({ content: 'Downtime aktualisiert.', flags: MessageFlags.Ephemeral });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.reply({
                embeds: [buildDowntimeEmbed(downtime, 'Downtime aktualisiert')],
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
            await interaction.reply({ content: 'Fehler beim Speichern der Downtime.', flags: MessageFlags.Ephemeral });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtDelete_')) {
        const [, downtimeIdRaw, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const downtimeId = Number(downtimeIdRaw);
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(downtimeId) || downtimeId < 1 || !Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        await interaction.update({
            content: 'Downtime wirklich l\u00f6schen?',
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
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (action === 'deleteDowntimeCancel') {
            const downtime = await findDowntimeForDiscord(interaction.user, downtimeId);
            if (!downtime || Number(downtime.character_id) !== characterId) {
                await interaction.update({ content: 'Downtime nicht gefunden.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtEdit_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('Bearbeiten')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`dtDelete_${downtimeId}_${characterId}_${ownerDiscordId}`)
                    .setLabel('L\u00f6schen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck')
                    .setStyle(ButtonStyle.Secondary),
            );

            await interaction.update({ content: '', embeds: [buildDowntimeEmbed(downtime, 'Downtime')], components: [row] });
            return true;
        }

        if (action !== 'deleteDowntimeConfirm') return false;

        try {
            const result = await softDeleteDowntimeForDiscord(interaction.user, downtimeId);
            if (!result.ok) {
                await interaction.update({ content: 'Downtime nicht gefunden oder bereits gel\u00f6scht.', embeds: [], components: [] });
                return true;
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`dtBack_${characterId}_${ownerDiscordId}`)
                    .setLabel('Zur\u00fcck zur Liste')
                    .setStyle(ButtonStyle.Secondary),
            );
            await interaction.update({ content: 'Downtime wurde gel\u00f6scht.', embeds: [], components: [row] });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            if (error instanceof DiscordNotLinkedError) {
                await interaction.update({ content: notLinkedContent(), embeds: [], components: [] });
                return true;
            }
            await interaction.update({ content: `Fehler beim L\u00f6schen: ${error.message}`, embeds: [], components: [] });
        }
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('dtBack_')) {
        const [, characterIdRaw, ownerDiscordId] = interaction.customId.split('_');
        const characterId = Number(characterIdRaw);
        if (!Number.isFinite(characterId) || characterId < 1) return false;

        if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
            await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
            return true;
        }

        const downtimes = await listDowntimesForDiscord(interaction.user, characterId, 25);
        if (downtimes.length === 0) {
            await interaction.update({ content: 'Keine Downtimes gefunden.', embeds: [], components: [] });
            return true;
        }

        await interaction.update({
            embeds: [new EmbedBuilder().setColor(0x4f46e5).setTitle('Downtime').setDescription('W\u00e4hle eine Downtime.')],
            components: [buildDowntimeListRow({ characterId, ownerDiscordId, downtimes })],
            content: '',
        });
        return true;
    }

    return false;
}

module.exports = { handle, handleCreationAvatarMessage, handleAvatarUpdateMessage };
