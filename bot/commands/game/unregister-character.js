const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../db');
const { commandName } = require('../../commandConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('unregister-character'))
        .setDescription('Entferne eine Charakter-Registrierung.')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription(`ID aus /${commandName('list-characters')}`)
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
