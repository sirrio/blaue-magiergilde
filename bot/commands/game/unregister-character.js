const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { findCharacterForDiscord } = require('../../appDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('unregister-character'))
        .setDescription('Löscht einen Charakter (soft delete).')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription(`ID aus /${commandName('list-characters')}`)
                .setRequired(true),
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        const character = await findCharacterForDiscord(interaction.user, id);
        if (!character) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`deleteCharacterConfirm_${id}_${interaction.user.id}`)
                .setLabel('Löschen')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`deleteCharacterCancel_${id}_${interaction.user.id}`)
                .setLabel('Abbrechen')
                .setStyle(ButtonStyle.Secondary),
        );

        await interaction.reply({
            content: `Charakter wirklich löschen?\n${character.id}: ${character.name} [${character.start_tier}]`,
            components: [row],
            flags: MessageFlags.Ephemeral,
        });
    },
};
