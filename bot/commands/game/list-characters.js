const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wwt-list-characters')
        .setDescription('Liste deiner registrierten Charaktere.'),
    async execute(interaction) {
        const [rows] = await db.execute(
            'SELECT id, character_name, start_tier, tier, character_url, notes FROM registrations WHERE discord_id = ? ORDER BY id',
            [interaction.user.id],
        );

        if (rows.length === 0) {
            await interaction.reply({ content: 'Keine registrierten Charaktere gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        const lines = rows.map(r => {
            const noteText = r.notes ? ` - ${r.notes}` : '';
            return `${r.id}: ${r.character_name} [${r.start_tier} -> ${r.tier}] - ${r.character_url}${noteText}`;
        });
        const message = 'Deine Charaktere:\n' + lines.join('\n');

        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    },
};
