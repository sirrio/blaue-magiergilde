const {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags,
} = require('discord.js');
const { commandName } = require('../../commandConfig');
const { DiscordNotLinkedError, listCharactersForDiscord } = require('../../appDb');
const { replyNotLinked } = require('../../linkingUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('update-character'))
        .setDescription('Aktualisiere einen Charakter (aus der App).'),
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

        const select = new StringSelectMenuBuilder()
            .setCustomId(`characterUpdateSelect_${interaction.user.id}`)
            .setPlaceholder('Charakter auswählen…')
            .addOptions(
                characters.slice(0, 25).map(c =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(String(c.name).slice(0, 100) || `Charakter ${c.id}`)
                        .setDescription(`ID ${c.id} · ${(String(c.start_tier || '').toUpperCase() || '—')}`)
                        .setValue(String(c.id)),
                ),
            );

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({
            content: 'Welchen Charakter möchtest du aktualisieren?',
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
    },
};
