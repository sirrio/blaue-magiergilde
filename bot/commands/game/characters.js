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

function resolvePublicUrl(urlOrPath) {
    const value = String(urlOrPath || '').trim();
    if (!value) return null;
    if (isHttpUrl(value)) return value;

    const appUrl = String(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    if (!appUrl) return null;
    const baseUrl = appUrl.replace(/\/$/, '');

    if (value.startsWith('/')) return `${baseUrl}${value}`;
    if (value.startsWith('storage/')) return `${baseUrl}/${value}`;

    return `${baseUrl}/storage/${value}`;
}

function formatTier(tier) {
    const normalized = String(tier || '').toUpperCase();
    if (!normalized) return '—';
    return normalized;
}

function truncate(text, max = 900) {
    const value = String(text || '').trim();
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildCharacterEmbed(character) {
    const tier = formatTier(character.start_tier);
    const name = String(character.name || '').trim() || `Charakter ${character.id}`;
    const link = String(character.external_link || '').trim();
    const notes = truncate(character.notes, 900);
    const avatarUrl = resolvePublicUrl(character.avatar);

    const embed = new EmbedBuilder()
        .setColor(0x4f46e5)
        .setTitle(`${name} · ${tier}`)
        .addFields({ name: 'ID', value: String(character.id), inline: true });

    if (isHttpUrl(link)) {
        embed.setURL(link);
        embed.setDescription('[Sheet öffnen](' + link + ')');
    } else if (link) {
        embed.setDescription(link);
    }

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
        embed.addFields({ name: 'Avatar', value: avatarUrl.slice(0, 1024), inline: false });
    }

    if (notes) {
        embed.addFields({ name: 'Notizen', value: notes.slice(0, 1024), inline: false });
    }

    return embed;
}

function buildActionsRow({ ownerDiscordId, hasCharacters }) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`charactersAction_update_${ownerDiscordId}`)
            .setLabel('Bearbeiten')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasCharacters),
        new ButtonBuilder()
            .setCustomId(`charactersAction_delete_${ownerDiscordId}`)
            .setLabel('Löschen')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!hasCharacters),
        new ButtonBuilder()
            .setCustomId(`charactersAction_new_${ownerDiscordId}`)
            .setLabel('Neu')
            .setStyle(ButtonStyle.Primary),
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('characters'))
        .setDescription('Verwalte deine Charaktere (Liste, Bearbeiten, Löschen, Neu).'),
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

        const hasCharacters = characters.length > 0;

        const summary = new EmbedBuilder()
            .setTitle('Deine Charaktere')
            .setColor(0x4f46e5)
            .setDescription(hasCharacters ? `Anzahl: **${characters.length}**` : 'Noch keine Charaktere. Erstelle deinen ersten mit **Neu**.');

        const embeds = [summary];
        if (hasCharacters) {
            embeds.push(...characters.slice(0, 9).map(buildCharacterEmbed)); // + summary = max 10 embeds
        }

        await interaction.reply({
            embeds,
            components: [buildActionsRow({ ownerDiscordId: interaction.user.id, hasCharacters })],
            flags: MessageFlags.Ephemeral,
        });
    },
};
