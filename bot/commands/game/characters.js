const path = require('node:path');
const fs = require('node:fs');
const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} = require('discord.js');
const { commandName } = require('../../commandConfig');
const { t } = require('../../i18n');
const {
    DiscordNotLinkedError,
    getLinkedUserLocaleForDiscord,
    getLinkedUserTrackingDefaultForDiscord,
    listCharactersForDiscord,
} = require('../../appDb');
const { replyNotLinked } = require('../../linkingUi');
const {
    additionalBubblesForStartTier,
    calculateBubblesInCurrentLevel,
    calculateLevel,
    calculateTierFromLevel,
    countsBubbleAdjustmentsForProgression,
} = require('../../utils/characterTier');
const {
    bubblesRequiredForLevel,
    ensureLevelProgressionLoaded,
} = require('../../utils/levelProgression');
const { formatDurationSeconds } = require('../../utils/time');

function isHttpUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function publicBaseUrl() {
    const value = String(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    return value ? value.replace(/\/$/, '') : null;
}

function normalizeStoragePath(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    let normalized = raw;
    if (normalized.startsWith('/')) normalized = normalized.slice(1);
    if (normalized.startsWith('storage/')) normalized = normalized.slice('storage/'.length);

    return normalized || null;
}

function resolveCharacterManagerUrl(characterId) {
    const baseUrl = publicBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/characters/${characterId}`;
}

function resolvePublicAvatarUrl(avatarValue, options = {}) {
    const value = String(avatarValue || '').trim();
    if (!value) return null;
    if (isHttpUrl(value)) return value;

    const baseUrl = publicBaseUrl();
    if (!baseUrl) return null;

    const storagePath = normalizeStoragePath(value);
    if (!storagePath) return null;

    if (options.masked) {
        return `${baseUrl}/avatars/masked?path=${encodeURIComponent(storagePath)}`;
    }

    return `${baseUrl}/storage/${storagePath}`;
}

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function nullableInt(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function secondsToHourMinuteString(seconds) {
    return formatDurationSeconds(safeInt(seconds, 0));
}

function calculateTotalBubblesToNextLevel(character, level) {
    const additional = additionalBubblesForStartTier(character.start_tier);
    const currentTotal = bubblesRequiredForLevel(level) - additional;
    const nextTotal = bubblesRequiredForLevel(level + 1) - additional;
    return Math.max(0, nextTotal - currentTotal);
}


function buildCharacterSummaryLine(character) {
    const level = calculateLevel(character);
    const tier = calculateTierFromLevel(level).toUpperCase();
    const toNextTotal = calculateTotalBubblesToNextLevel(character, level);
    const inCurrent = calculateBubblesInCurrentLevel(character, level);
    const isMaxLevel = level >= 20 || toNextTotal === 0;
    const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character);
    const totalBubbles = safeInt(character.adventure_bubbles) + (bubbleAdjustmentsCount ? safeInt(character.dm_bubbles) : 0);
    const isMixed = safeInt(character.has_pseudo_adventure) && safeInt(character.has_real_adventure);
    const downtimeBubbles = isMixed
        ? Math.max(0, totalBubbles - additionalBubblesForStartTier(character.start_tier) + safeInt(character.bubble_shop_spend))
        : totalBubbles;
    const downtimeMax = downtimeBubbles * 8 * 60 * 60;
    const downtimeUsed = safeInt(character.total_downtime);

    const name = String(character.name || `Character ${character.id}`);
    const tierPart = character.is_filler ? 'Filler' : tier;
    const bubblePart = character.is_filler
        ? 'Lv 3'
        : isMaxLevel
            ? `Lv 20 +${inCurrent}🫧`
            : `Lv ${level} ${inCurrent}/${toNextTotal}🫧`;
    const downtimePart = `⏱ ${secondsToHourMinuteString(downtimeUsed)}/${secondsToHourMinuteString(downtimeMax)}`;

    return `**${name}** · ${tierPart} · ${bubblePart} · ${downtimePart}`;
}

function buildProgressBar(current, total, width = 10) {
    if (total <= 0) return '-';
    const ratio = Math.max(0, Math.min(1, current / total));
    const filled = Math.round(ratio * width);
    const empty = Math.max(0, width - filled);
    return `${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)} ${(ratio * 100).toFixed(0)}%`;
}

function calculateFactionLevel(character, level, tier) {
    const faction = String(character.faction || 'none');
    if (tier === 'BT' || faction === 'none') return 0;

    const downtime = safeInt(character.faction_downtime);
    const adventures = safeInt(character.adventures_count);

    if (adventures < 10) return 1;
    if (level >= 18 && downtime >= 1800000) return 5;
    if (level >= 14 && downtime >= 360000) return 4;
    if (level >= 9 && downtime >= 360000) return 3;
    return 2;
}

function humanFactionName(faction) {
    const map = {
        none: 'None',
        heiler: 'Healer',
        handwerker: 'Crafter',
        feldforscher: 'Field Researcher',
        bibliothekare: 'Librarians',
        diplomaten: 'Diplomats',
        gardisten: 'Guards',
        unterhalter: 'Entertainers',
        logistiker: 'Logisticians',
        'flora & fauna': 'Flora & Fauna',
        agenten: 'Agents',
        waffenmeister: 'Weapon Masters',
        arkanisten: 'Arcanists',
    };
    const key = String(faction || 'none');
    return map[key] || key;
}

function normalizeGuildStatus(value) {
    const status = String(value || '').trim().toLowerCase();
    if (status === 'approved' || status === 'declined' || status === 'needs_changes' || status === 'pending' || status === 'retired' || status === 'draft') {
        return status;
    }
    return 'pending';
}

function guildStatusLabel(value) {
    const status = normalizeGuildStatus(value);
    if (status === 'approved') return 'Approved';
    if (status === 'declined') return 'Declined';
    if (status === 'needs_changes') return 'Needs changes';
    if (status === 'retired') return 'Retired';
    if (status === 'draft') return 'Draft';
    return 'Pending';
}

function guildStatusEmoji(value) {
    const status = normalizeGuildStatus(value);
    if (status === 'approved') return '✅';
    if (status === 'declined') return '❌';
    if (status === 'needs_changes') return '⚠️';
    if (status === 'retired') return '🪦';
    if (status === 'draft') return '📝';
    return '⏳';
}

function guildStatusNextStep(value, locale) {
    const status = normalizeGuildStatus(value);
    if (status === 'draft') {
        return t('characters.nextStepDraft');
    }
    if (status === 'pending') {
        return t('characters.nextStepPending');
    }
    if (status === 'needs_changes') {
        return t('characters.nextStepNeedsChanges');
    }
    if (status === 'declined') {
        return t('characters.nextStepDeclined');
    }
    if (status === 'retired') {
        return t('characters.nextStepRetired');
    }
    return null;
}

function normalizeUserLocale(value) {
    const locale = String(value || '').trim().toLowerCase();
    if (locale === 'en') {
        return 'en';
    }

    return 'de';
}

function languageLabel(value, locale) {
    const normalized = normalizeUserLocale(value);
    if (normalized === 'en') {
        return t('characters.languageEnglish', {}, locale);
    }

    return t('characters.languageGerman', {}, locale);
}

function tryBuildLocalAvatarAttachment(character) {
    const raw = String(character.avatar || '').trim();
    if (!raw) return null;
    if (isHttpUrl(raw)) return null;

    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const publicStorageRoot = path.join(repoRoot, 'storage', 'app', 'public');

    const normalized = normalizeStoragePath(raw);
    if (!normalized) return null;
    const filePath = path.resolve(publicStorageRoot, normalized);

    if (!filePath.startsWith(publicStorageRoot)) return null;

    try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) return null;
    } catch {
        return null;
    }

    const ext = path.extname(filePath) || '.png';
    const safeName = `avatar_${character.id}${ext}`.slice(0, 100);
    return { filePath, fileName: safeName };
}

function buildCharacterEmbed(character, { thumbnailUrlOrAttachment, locale }) {
    const level = calculateLevel(character);
    const tier = calculateTierFromLevel(level);
    const classNames = String(character.class_names || '').trim();
    const statusLabel = guildStatusLabel(character.guild_status);
    const statusEmoji = guildStatusEmoji(character.guild_status);
    const statusNextStep = guildStatusNextStep(character.guild_status, locale);
    const hasRoom = safeInt(character.has_room) > 0;
    const simplifiedTracking = Boolean(character.simplified_tracking);
    const hasAutoLevelAdventure = Boolean(safeInt(character.has_pseudo_adventure));
    const usesManualDerivedValues = simplifiedTracking || hasAutoLevelAdventure;
    const manualAdventuresCount = nullableInt(character.manual_adventures_count);
    const manualFactionRank = nullableInt(character.manual_faction_rank);
    const bubbleAdjustmentsCount = countsBubbleAdjustmentsForProgression(character);
    const totalBubbles = safeInt(character.adventure_bubbles) + (bubbleAdjustmentsCount ? safeInt(character.dm_bubbles) : 0);
    const earnedBubbles = safeInt(character.adventure_bubbles) + (bubbleAdjustmentsCount ? safeInt(character.dm_bubbles) : 0) + (bubbleAdjustmentsCount ? additionalBubblesForStartTier(character.start_tier) : 0);
    const isBubbleOverspent = bubbleAdjustmentsCount && safeInt(character.bubble_shop_spend) > earnedBubbles;
    const toNextTotal = calculateTotalBubblesToNextLevel(character, level);
    const inCurrent = calculateBubblesInCurrentLevel(character, level);
    const toNext = Math.max(0, toNextTotal - inCurrent);
    const isMaxLevel = level >= 20 || toNextTotal === 0;

    const downtimeTotal = safeInt(character.total_downtime);
    const downtimeFaction = safeInt(character.faction_downtime);
    const downtimeOther = safeInt(character.other_downtime);
    // In mixed tracking mode (pseudo anchor + real adventures), target_bubbles bakes in
    // the start-tier bonus (which was never earned through play) and deducts bubble shop
    // spend (which was earned). Correct the downtime base accordingly.
    const isMixed = safeInt(character.has_pseudo_adventure) && safeInt(character.has_real_adventure);
    const downtimeBubbles = isMixed
        ? Math.max(0, totalBubbles - additionalBubblesForStartTier(character.start_tier) + safeInt(character.bubble_shop_spend))
        : totalBubbles;
    const downtimeAllowed = downtimeBubbles * 8 * 60 * 60;
    const downtimeRemaining = downtimeAllowed - downtimeTotal;

    const factionLevel = calculateFactionLevel(character, level, tier);
    const factionName = humanFactionName(character.faction);
    const adventuresValue = usesManualDerivedValues
        ? `Played: **${manualAdventuresCount ?? 'Manual'}**\nStarted in: **${String(character.start_tier || '').toUpperCase()}**`
        : `Played: **${safeInt(character.adventures_count)}**\nStarted in: **${String(character.start_tier || '').toUpperCase()}**`;
    const factionsValue = usesManualDerivedValues
        ? `${factionName}\nLevel: **${manualFactionRank ?? 'Manual'}**`
        : `${factionName}\nLevel: **${factionLevel}**`;
    const downtimeValue = `Total: **${secondsToHourMinuteString(downtimeAllowed)}**\nFaction: ${secondsToHourMinuteString(downtimeFaction)} - Other: ${secondsToHourMinuteString(downtimeOther)}\nRemaining: **${secondsToHourMinuteString(Math.max(0, downtimeRemaining))}**`;

    const titleParts = [
        String(character.name || `Character ${character.id}`),
        tier,
        `Level ${level}`,
        classNames,
    ].filter(Boolean);

    const embed = new EmbedBuilder()
        .setColor(0x4f46e5)
        .setTitle(titleParts.join(' - '))
        .addFields(
            { name: 'Status', value: `${statusEmoji} ${statusLabel}`, inline: true },
            { name: 'Room', value: hasRoom ? 'Assigned' : 'None', inline: true },
            { name: 'Progress', value: isMaxLevel
                ? `${buildProgressBar(1, 1)}\nMax. Level erreicht${inCurrent > 0 ? ` (+**${inCurrent}** Bubble(s))` : ''}`
                : isBubbleOverspent
                    ? `${buildProgressBar(inCurrent, toNextTotal)}\n⚠️ Bubble-Shop überzogen`
                    : `${buildProgressBar(inCurrent, toNextTotal)}\nRemaining: **${toNext}** Bubble(s)`,
              inline: false },
            { name: 'Tracking', value: simplifiedTracking ? 'Level-Tracking' : isMixed ? 'Gemischt' : 'Abenteuer-Tracking', inline: true },
            { name: 'Adventures', value: adventuresValue, inline: true },
            { name: 'Factions', value: factionsValue, inline: true },
            { name: 'Downtime', value: downtimeValue, inline: false },
            { name: 'Game Master', value: `Bubbles: **${safeInt(character.dm_bubbles)}**\nCoins: **${safeInt(character.dm_coins)}**`, inline: true },
            { name: 'Bubble Shop', value: `Spend: **${safeInt(character.bubble_shop_spend)}**`, inline: true },
        );

    if (statusNextStep) {
        embed.addFields({ name: 'Next step', value: statusNextStep, inline: false });
    }

    const reviewNote = String(character.review_note || '').trim();
    if (reviewNote && (character.guild_status === 'declined' || character.guild_status === 'needs_changes')) {
        embed.addFields({ name: 'Notiz', value: reviewNote, inline: false });
    }

    if (!bubbleAdjustmentsCount) {
        const warningLines = [];
        if (simplifiedTracking) {
            warningLines.push('⚠️ **Level-Tracking aktiv** – DM-Bubbles und Bubble-Shop fließen nicht in die Levelberechnung ein.');
        } else {
            warningLines.push('⚠️ **Gemischtes Tracking** – DM-Bubbles und Bubble-Shop fließen nicht in die Levelberechnung ein.');
        }
        if (isMixed) {
            warningLines.push('ℹ️ Bubble-Shop-Ausgaben werden ABER für die maximale Downtime berücksichtigt.');
        }
        embed.addFields({ name: 'Hinweise', value: warningLines.join('\n'), inline: false });
    }

    const externalLink = String(character.external_link || '').trim();
    const managerUrl = resolveCharacterManagerUrl(character.id);
    if (managerUrl) {
        embed.setURL(managerUrl);
    } else if (isHttpUrl(externalLink)) {
        embed.setURL(externalLink);
    }
    if (isHttpUrl(externalLink)) {
        embed.setDescription(`[Open sheet](${externalLink})`);
    }

    if (thumbnailUrlOrAttachment) {
        embed.setThumbnail(thumbnailUrlOrAttachment);
    }

    return embed;
}

function buildCharacterListView({ ownerDiscordId, characters, locale }) {
    const characterLines = characters.slice(0, 25).map(buildCharacterSummaryLine).join('\n');
    const descriptionHeader = characters.length > 0
        ? t('characters.dashboardDescription', { count: characters.length }, locale)
        : t('characters.dashboardDescriptionEmpty', {}, locale);
    const description = characters.length > 0
        ? `${descriptionHeader}\n\n${characterLines}`
        : descriptionHeader;

    const summary = new EmbedBuilder()
        .setTitle(t('characters.dashboardTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(description);

    const components = [];
    const selection = characters.slice(0, 25);
    if (selection.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`charactersSelect_${ownerDiscordId}`)
            .setPlaceholder(t('characters.selectPlaceholder', {}, locale))
            .addOptions(
                selection.map(character => {
                    const option = new StringSelectMenuOptionBuilder()
                        .setLabel(String(character.name || `Character ${character.id}`).slice(0, 100))
                        .setValue(String(character.id));
                    return option;
                }),
            );

        components.push(new ActionRowBuilder().addComponents(select));

        if (characters.length > selection.length) {
            summary.setFooter({ text: t('characters.showingCount', { shown: selection.length, total: characters.length }, locale) });
        }
    }

    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersAction_new_${ownerDiscordId}`)
            .setLabel(t('common.new', {}, locale))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`charactersAction_refresh_${ownerDiscordId}`)
            .setLabel(t('common.refresh', {}, locale))
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`charactersAction_settings_${ownerDiscordId}`)
            .setLabel(t('common.settings', {}, locale))
            .setStyle(ButtonStyle.Secondary),
    ));

    return { embeds: [summary], components };
}

function buildCharactersSettingsView({ ownerDiscordId, characters, locale, selectedLocale, trackingDefault = null }) {
    const trackingLabel = trackingDefault === null
        ? '-'
        : trackingDefault
            ? t('characters.trackingSimplifiedBased', {}, locale)
            : t('characters.trackingAdventureBased', {}, locale);
    const settings = new EmbedBuilder()
        .setTitle(t('characters.settingsTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(t('characters.settingsDescription', {}, locale))
        .addFields({
            name: t('characters.settingsAccountTitle', {}, locale),
            value: [
                t('characters.settingsCharactersInAccount', { count: characters.length }, locale),
                t('characters.settingsDeleteHint', {}, locale),
            ].join('\n'),
            inline: false,
        }, {
            name: t('characters.settingsLanguageTitle', {}, locale),
            value: [
                t('characters.settingsLanguageCurrent', { language: languageLabel(selectedLocale, locale) }, locale),
                t('characters.settingsLanguageHint', {}, locale),
            ].join('\n'),
            inline: false,
        }, {
            name: t('characters.settingsTrackingTitle', {}, locale),
            value: [
                t('characters.settingsTrackingCurrent', { mode: trackingLabel }, locale),
                t('characters.settingsTrackingHint', {}, locale),
            ].join('\n'),
            inline: false,
        });

    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersAction_tracking-default-settings_${ownerDiscordId}`)
                .setLabel(t('characters.tracking', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`charactersAction_language_${ownerDiscordId}`)
                .setLabel(t('characters.language', {}, locale))
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersAction_delete-account_${ownerDiscordId}`)
                .setLabel(t('characters.deleteAccount', {}, locale))
                .setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersAction_back_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embeds: [settings], components };
}

function buildCharacterLanguageView({ ownerDiscordId, locale, selectedLocale }) {
    const embed = new EmbedBuilder()
        .setTitle(t('characters.languageSelectionTitle', {}, locale))
        .setColor(0x4f46e5)
        .setDescription(t('characters.languageSelectionDescription', {}, locale))
        .addFields({
            name: t('characters.settingsLanguageTitle', {}, locale),
            value: t('characters.settingsLanguageCurrent', { language: languageLabel(selectedLocale, locale) }, locale),
            inline: false,
        });

    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersAction_locale_de_${ownerDiscordId}`)
                .setLabel(t('characters.languageGerman', {}, locale))
                .setStyle(normalizeUserLocale(selectedLocale) === 'de' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersAction_locale_en_${ownerDiscordId}`)
                .setLabel(t('characters.languageEnglish', {}, locale))
                .setStyle(normalizeUserLocale(selectedLocale) === 'en' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`charactersAction_settings_${ownerDiscordId}`)
                .setLabel(t('common.back', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embeds: [embed], components };
}

function buildTrackingDefaultSelectionView({ ownerDiscordId, locale, source = 'setup' }) {
    const embed = new EmbedBuilder()
        .setTitle(t('characters.trackingDefaultRequiredTitle', {}, locale))
        .setColor(0xf59e0b)
        .setDescription([
            t('characters.trackingDefaultRequiredBody', {}, locale),
            '',
            `• **${t('characters.trackingAdventureBased', {}, locale)}** - ${t('characters.trackingDefaultAdventureDescription', {}, locale)}`,
            `• **${t('characters.trackingSimplifiedBased', {}, locale)}** - ${t('characters.trackingDefaultLevelDescription', {}, locale)}`,
            '',
            t('characters.trackingDefaultRequiredHint', {}, locale),
            t('characters.trackingDefaultRequiredTip', {}, locale),
        ].join('\n'));

    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersAction_tracking-default-adventure_${source}_${ownerDiscordId}`)
                .setLabel(t('characters.trackingAdventureBased', {}, locale))
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`charactersAction_tracking-default-level_${source}_${ownerDiscordId}`)
                .setLabel(t('characters.trackingSimplifiedBased', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    if (source === 'settings') {
        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`charactersAction_settings_${ownerDiscordId}`)
                    .setLabel(t('common.back', {}, locale))
                    .setStyle(ButtonStyle.Secondary),
            ),
        );
    }

    return { embeds: [embed], components };
}

function buildDeleteAccountConfirmView({ ownerDiscordId, characters, locale }) {
    const warning = new EmbedBuilder()
        .setTitle(t('characters.deleteAccountTitle', {}, locale))
        .setColor(0xef4444)
        .setDescription(t('characters.deleteAccountDescription', {}, locale))
        .addFields({
            name: t('characters.deleteAccountWhatHappens', {}, locale),
            value: [
                t('characters.deleteAccountBodyCharacters', { count: characters.length }, locale),
                t('characters.deleteAccountBodyDeleted', {}, locale),
                t('characters.deleteAccountBodyWarning', {}, locale),
            ].join('\n'),
            inline: false,
        });

    const components = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`charactersAction_confirm-delete-account_${ownerDiscordId}`)
                .setLabel(t('characters.confirmDeleteAccount', {}, locale))
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`charactersAction_cancel-delete-account_${ownerDiscordId}`)
                .setLabel(t('common.cancel', {}, locale))
                .setStyle(ButtonStyle.Secondary),
        ),
    ];

    return { embeds: [warning], components };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('characters'))
        .setDescription(t('characters.commandDescription'))
        // 0 = Guild, 1 = Bot DM
        .setContexts(0, 1),
    async execute(interaction) {
        await ensureLevelProgressionLoaded();

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        let characters;
        let locale = null;
        let trackingDefault = null;
        try {
            characters = await listCharactersForDiscord(interaction.user);
            locale = interaction.user ? await getLinkedUserLocaleForDiscord(interaction.user) : null;
            trackingDefault = interaction.user ? await getLinkedUserTrackingDefaultForDiscord(interaction.user) : null;
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return;
            }
            throw error;
        }

        if (trackingDefault === null) {
            const trackingView = buildTrackingDefaultSelectionView({
                ownerDiscordId: interaction.user.id,
                locale,
                source: 'setup',
            });

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(trackingView);
            }
            return;
        }

        const listView = buildCharacterListView({
            ownerDiscordId: interaction.user.id,
            characters,
            locale,
        });

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(listView);
        }
    },
    buildCharacterEmbed,
    resolvePublicAvatarUrl,
    tryBuildLocalAvatarAttachment,
    buildCharacterListView,
    buildCharactersSettingsView,
    buildCharacterLanguageView,
    buildTrackingDefaultSelectionView,
    buildDeleteAccountConfirmView,
};
