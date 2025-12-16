const path = require('node:path');
const fs = require('node:fs');
const {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { commandName } = require('../../commandConfig');
const { DiscordNotLinkedError, listCharactersForDiscord } = require('../../appDb');
const { replyNotLinked } = require('../../linkingUi');

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
    const total = Math.max(0, safeInt(seconds, 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) return '0h';
    return parts.join(' ');
}

function additionalBubblesForStartTier(startTier) {
    switch (String(startTier || '').toLowerCase()) {
        case 'lt':
            return 10;
        case 'ht':
            return 55;
        case 'bt':
        default:
            return 0;
    }
}

function calculateLevel(character) {
    const isFiller = Boolean(character.is_filler);
    if (isFiller) return 3;

    const bubbles = safeInt(character.adventure_bubbles) + safeInt(character.dm_bubbles);
    const additional = additionalBubblesForStartTier(character.start_tier);
    const spend = safeInt(character.bubble_shop_spend);

    const effective = Math.max(0, bubbles + additional - spend);
    const level = Math.floor(1 + (Math.sqrt(8 * effective + 1) - 1) / 2);
    return Math.min(20, Math.max(1, level));
}

function calculateTierFromLevel(level) {
    if (level >= 17) return 'ET';
    if (level >= 11) return 'HT';
    if (level >= 5) return 'LT';
    return 'BT';
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
    if (total <= 0) return '\u2014';
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

    if (level >= 18 && downtime >= 1800000) return 5;
    if (adventures >= 10 && downtime >= 360000 && level >= 14) return 4;
    if (adventures >= 10 && downtime >= 360000) return 3;
    if (adventures >= 10) return 2;
    return 1;
}

function humanFactionName(faction) {
    const map = {
        none: 'Keine',
        heiler: 'Heiler',
        handwerker: 'Handwerker',
        feldforscher: 'Feldforscher',
        bibliothekare: 'Bibliothekare',
        diplomaten: 'Diplomaten',
        gardisten: 'Gardisten',
        unterhalter: 'Unterhalter',
        logistiker: 'Logistiker',
        'flora & fauna': 'Flora & Fauna',
    };
    const key = String(faction || 'none');
    return map[key] || key;
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
        String(character.name || `Charakter ${character.id}`),
        tier,
        `Level ${level}`,
        classNames,
    ].filter(Boolean);

    const embed = new EmbedBuilder()
        .setColor(0x4f46e5)
        .setTitle(titleParts.join(' \u00b7 '))
        .addFields(
            { name: 'Fortschritt', value: `${buildProgressBar(inCurrent, toNextTotal)}\nNoch: **${toNext}** Bubble(s)`, inline: false },
            { name: 'Adventures', value: `Played: **${safeInt(character.adventures_count)}**\nStarted in: **${String(character.start_tier || '').toUpperCase()}**`, inline: true },
            { name: 'Factions', value: `${factionName}\nLevel: **${factionLevel}**`, inline: true },
            { name: 'Downtime', value: `Total: **${secondsToHourMinuteString(downtimeTotal)}**\nFaction: ${secondsToHourMinuteString(downtimeFaction)} \u00b7 Other: ${secondsToHourMinuteString(downtimeOther)}\nRemaining: **${secondsToHourMinuteString(downtimeRemaining)}**`, inline: false },
            { name: 'Game Master', value: `Bubbles: **${safeInt(character.dm_bubbles)}**\nCoins: **${safeInt(character.dm_coins)}**`, inline: true },
            { name: 'Bubble Shop', value: `Spend: **${safeInt(character.bubble_shop_spend)}**`, inline: true },
        );

    const link = String(character.external_link || '').trim();
    if (isHttpUrl(link)) {
        embed.setURL(link);
        embed.setDescription(`[Sheet \u00f6ffnen](${link})`);
    }

    if (thumbnailUrlOrAttachment) {
        embed.setThumbnail(thumbnailUrlOrAttachment);
    }

    return embed;
}

function buildSummaryRow(ownerDiscordId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersAction_new_${ownerDiscordId}`)
            .setLabel('Neu')
            .setStyle(ButtonStyle.Primary),
    );
}

function buildCharacterCardRow({ ownerDiscordId, characterId, isFiller }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`characterCard_edit_${characterId}_${ownerDiscordId}`)
            .setLabel('Bearbeiten')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`characterCard_adv_${characterId}_${ownerDiscordId}`)
            .setLabel('Abenteuer')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`characterCard_dt_${characterId}_${ownerDiscordId}`)
            .setLabel('Downtime')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(Boolean(isFiller)),
        new ButtonBuilder()
            .setCustomId(`characterCard_del_${characterId}_${ownerDiscordId}`)
            .setLabel('L\u00f6schen')
            .setStyle(ButtonStyle.Danger),
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('characters'))
        .setDescription('Deine Charaktere (Dashboard) inkl. Bearbeiten/L\u00f6schen/Neu.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
            return;
        }

        let characters;
        try {
            characters = await listCharactersForDiscord(interaction.user);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return;
            }
            throw error;
        }

        const summary = new EmbedBuilder()
            .setTitle('Your Characters')
            .setColor(0x4f46e5)
            .setDescription(characters.length > 0 ? `**${characters.length}** aktiv` : 'Noch keine Charaktere. Erstelle deinen ersten mit **Neu**.');

        await interaction.reply({
            embeds: [summary],
            components: [buildSummaryRow(interaction.user.id)],
            flags: MessageFlags.Ephemeral,
        });

        for (const character of characters.slice(0, 8)) {
            const attachment = tryBuildLocalAvatarAttachment(character);
            const url = resolvePublicAvatarUrl(character.avatar);

            const files = [];
            let thumbnail = url;
            if (attachment) {
                files.push({ attachment: attachment.filePath, name: attachment.fileName });
                thumbnail = `attachment://${attachment.fileName}`;
            }

            // eslint-disable-next-line no-await-in-loop
            await interaction.followUp({
                embeds: [buildCharacterEmbed(character, { thumbnailUrlOrAttachment: thumbnail })],
                components: [buildCharacterCardRow({
                    ownerDiscordId: interaction.user.id,
                    characterId: character.id,
                    isFiller: character.is_filler,
                })],
                files,
                flags: MessageFlags.Ephemeral,
            });
        }
    },
};

