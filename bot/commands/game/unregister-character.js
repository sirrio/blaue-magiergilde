const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wwt-unregister-character')
        .setDescription('Entferne eine Charakter-Registrierung.')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID aus /wwt-list-characters')
                .setRequired(true),
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        const [result] = await db.execute(
            'DELETE FROM registrations WHERE id = ? AND discord_id = ?',
            [id, interaction.user.id],
        );

        if (result.affectedRows === 0) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.reply({ content: 'Charakter erfolgreich entfernt.', flags: MessageFlags.Ephemeral });
    },
};
