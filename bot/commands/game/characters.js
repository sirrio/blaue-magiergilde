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
const {
    DiscordNotLinkedError,
    listCharactersForDiscord,
    getUserTrackingModeForDiscord,
} = require('../../appDb');
const { replyNotLinked } = require('../../linkingUi');
const {
    additionalBubblesForStartTier,
    calculateLevel,
    calculateTierFromLevel,
} = require('../../utils/characterTier');
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

function resolveCharacterManagerUrl(characterId) {
    const baseUrl = publicBaseUrl();
    if (!baseUrl) return null;
    return `${baseUrl}/characters/${characterId}`;
}

function resolvePublicAvatarUrl(avatarValue) {
    const value = String(avatarValue || '').trim();
    if (!value) return null;
    if (isHttpUrl(value)) return value;

    const baseUrl = publicBaseUrl();
    if (!baseUrl) return null;

    if (value.startsWith('/')) return `${baseUrl}${value}`;
    if (value.startsWith('storage/')) return `${baseUrl}/${value}`;

    return `${baseUrl}/storage/${value}`;
}

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function secondsToHourMinuteString(seconds) {
    return formatDurationSeconds(safeInt(seconds, 0));
}

function calculateTotalBubblesToNextLevel(character, level) {
    const additional = additionalBubblesForStartTier(character.start_tier);
    const currentTotal = ((level - 1) * level) / 2 - additional;
    const nextTotal = (level * (level + 1)) / 2 - additional;
    return Math.max(0, nextTotal - currentTotal);
}

function calculateBubblesInCurrentLevel(character, level) {
    const bubbles = safeInt(character.adventure_bubbles) + safeInt(character.dm_bubbles);
    const additional = additionalBubblesForStartTier(character.start_tier);
    const spend = safeInt(character.bubble_shop_spend);
    const currentTotal = ((level - 1) * level) / 2 - additional;
    return Math.max(0, bubbles - currentTotal - spend);
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
    const status = String(value || '').toLowerCase();
    if (status === 'approved' || status === 'declined' || status === 'pending') {
        return status;
    }
    return 'pending';
}

function guildStatusLabel(value) {
    const status = normalizeGuildStatus(value);
    if (status === 'approved') return 'Approved';
    if (status === 'declined') return 'Declined';
    return 'Pending';
}

function guildStatusEmoji(value) {
    const status = normalizeGuildStatus(value);
    if (status === 'approved') return '✅';
    if (status === 'declined') return '❌';
    return '⏳';
}

function tryBuildLocalAvatarAttachment(character) {
    const raw = String(character.avatar || '').trim();
    if (!raw) return null;
    if (isHttpUrl(raw)) return null;

    const repoRoot = path.resolve(__dirname, '..', '..', '..');
    const publicStorageRoot = path.join(repoRoot, 'storage', 'app', 'public');

    const normalized = raw.startsWith('/') ? raw.slice(1) : raw;
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

function buildCharacterEmbed(character, { thumbnailUrlOrAttachment }) {
    const level = calculateLevel(character);
    const tier = calculateTierFromLevel(level);
    const classNames = String(character.class_names || '').trim();
    const statusLabel = guildStatusLabel(character.guild_status);
    const statusEmoji = guildStatusEmoji(character.guild_status);
    const hasRoom = safeInt(character.has_room) > 0;

    const totalBubbles = safeInt(character.adventure_bubbles) + safeInt(character.dm_bubbles);
    const toNextTotal = calculateTotalBubblesToNextLevel(character, level);
    const inCurrent = calculateBubblesInCurrentLevel(character, level);
    const toNext = Math.max(0, toNextTotal - inCurrent);

    const downtimeTotal = safeInt(character.total_downtime);
    const downtimeFaction = safeInt(character.faction_downtime);
    const downtimeOther = safeInt(character.other_downtime);
    const downtimeAllowed = totalBubbles * 8 * 60 * 60;
    const downtimeRemaining = downtimeAllowed - downtimeTotal;

    const factionLevel = calculateFactionLevel(character, level, tier);
    const factionName = humanFactionName(character.faction);

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
            { name: 'Progress', value: `${buildProgressBar(inCurrent, toNextTotal)}\nRemaining: **${toNext}** Bubble(s)`, inline: false },
            { name: 'Adventures', value: `Played: **${safeInt(character.adventures_count)}**\nStarted in: **${String(character.start_tier || '').toUpperCase()}**`, inline: true },
            { name: 'Factions', value: `${factionName}\nLevel: **${factionLevel}**`, inline: true },
            { name: 'Downtime', value: `Total: **${secondsToHourMinuteString(downtimeTotal)}**\nFaction: ${secondsToHourMinuteString(downtimeFaction)} - Other: ${secondsToHourMinuteString(downtimeOther)}\nRemaining: **${secondsToHourMinuteString(downtimeRemaining)}**`, inline: false },
            { name: 'Game Master', value: `Bubbles: **${safeInt(character.dm_bubbles)}**\nCoins: **${safeInt(character.dm_coins)}**`, inline: true },
            { name: 'Bubble Shop', value: `Spend: **${safeInt(character.bubble_shop_spend)}**`, inline: true },
        );

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

function buildCharacterListView({ ownerDiscordId, characters, simplifiedTracking }) {
    const summary = new EmbedBuilder()
        .setTitle('Your Characters')
        .setColor(0x4f46e5)
        .setDescription(
            characters.length > 0
                ? `**${characters.length}** active. Choose a character or create a new one.`
                : 'No characters yet. Create your first with **New**.',
        );
    summary.addFields({
        name: 'Tracking',
        value: simplifiedTracking ? 'Simplified (quick mode)' : 'Standard (adventures + downtime)',
        inline: false,
    });

    const components = [];
    const selection = characters.slice(0, 25);
    if (selection.length > 0) {
        const select = new StringSelectMenuBuilder()
            .setCustomId(`charactersSelect_${ownerDiscordId}`)
            .setPlaceholder('Select character...')
            .addOptions(
                selection.map(character => {
                    const option = new StringSelectMenuOptionBuilder()
                        .setLabel(String(character.name || `Character ${character.id}`).slice(0, 100))
                        .setValue(String(character.id));
                    const level = calculateLevel(character);
                    const tier = calculateTierFromLevel(level);
                    option.setDescription(tier);
                    return option;
                }),
            );

        components.push(new ActionRowBuilder().addComponents(select));

        if (characters.length > selection.length) {
            summary.setFooter({ text: `Showing ${selection.length} of ${characters.length}.` });
        }
    }

    components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersAction_new_${ownerDiscordId}`)
            .setLabel('New')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`charactersAction_tracking_${ownerDiscordId}`)
            .setLabel('Settings')
            .setStyle(ButtonStyle.Secondary),
    ));

    return { embeds: [summary], components };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('characters'))
        .setDescription('Your characters (dashboard) with Edit/Delete/New.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'Please use this command in a server (not in DMs).', components: [] });
            }
            return;
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        let characters;
        let simplifiedTracking = false;
        try {
            characters = await listCharactersForDiscord(interaction.user);
            simplifiedTracking = await getUserTrackingModeForDiscord(interaction.user);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return;
            }
            throw error;
        }

        const listView = buildCharacterListView({
            ownerDiscordId: interaction.user.id,
            characters,
            simplifiedTracking,
        });

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(listView);
        }
    },
    buildCharacterEmbed,
    resolvePublicAvatarUrl,
    tryBuildLocalAvatarAttachment,
    buildCharacterListView,
};
