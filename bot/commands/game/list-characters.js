const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('list-characters'))
        .setDescription('Liste deiner Charaktere (aus der App).'),
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

        if (characters.length === 0) {
            await interaction.reply({ content: 'Keine Charaktere gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Deine Charaktere')
            .setColor(0x4f46e5)
            .setDescription(
                [
                    `Anzahl: **${characters.length}**`,
                    '',
                    `Bearbeiten: \`/${commandName('update-character')}\` · Löschen: \`/${commandName('unregister-character')}\` · Neu: \`/${commandName('register-character')}\``,
                ].join('\n'),
            )
            .addFields(characters.slice(0, 25).map(buildCharacterField));

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
