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

function formatTier(tier) {
    const normalized = String(tier || '').toUpperCase();
    if (!normalized) return '—';
    return normalized;
}

function truncate(text, max = 240) {
    const value = String(text || '').trim();
    if (value.length <= max) return value;
    return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildCharacterField(character) {
    const tier = formatTier(character.start_tier);
    const name = String(character.name || '').trim() || `Charakter ${character.id}`;
    const id = String(character.id);
    const link = String(character.external_link || '').trim();
    const notes = truncate(character.notes, 240);

    const linkPart = link ? `[Sheet öffnen](${link})` : 'Kein Link hinterlegt.';
    const notesPart = notes ? `\nNotizen: ${notes}` : '';

    return {
        name: `${name} · ${tier}`,
        value: `${linkPart}\nID: ${id}${notesPart}`,
        inline: false,
    };
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

        const embed = new EmbedBuilder()
            .setTitle('Deine Charaktere')
            .setColor(0x4f46e5)
            .setDescription(hasCharacters ? `Anzahl: **${characters.length}**` : 'Noch keine Charaktere. Erstelle deinen ersten mit **Neu**.');

        if (hasCharacters) {
            embed.addFields(characters.slice(0, 25).map(buildCharacterField));
        }

        await interaction.reply({
            embeds: [embed],
            components: [buildActionsRow({ ownerDiscordId: interaction.user.id, hasCharacters })],
            flags: MessageFlags.Ephemeral,
        });
    },
};

