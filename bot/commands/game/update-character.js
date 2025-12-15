const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const db = require('../../db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wwt-update-character')
        .setDescription('Aktualisiere einen registrierten Charakter.')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID aus /wwt-list-characters')
                .setRequired(true),
        ),
    async execute(interaction) {
        const id = interaction.options.getInteger('id');
        const [rows] = await db.execute(
            'SELECT character_name, tier, character_url, notes FROM registrations WHERE id = ? AND discord_id = ?',
            [id, interaction.user.id],
        );

        if (rows.length === 0) {
            await interaction.reply({ content: 'Charakter nicht gefunden.', flags: MessageFlags.Ephemeral });
            return;
        }

        const character = rows[0];
        const modal = new ModalBuilder()
            .setCustomId(`updateCharacterModal_${id}`)
            .setTitle('Charakter aktualisieren');

        const nameInput = new TextInputBuilder()
            .setCustomId('updName')
            .setLabel('Charaktername')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(character.character_name);

        const tierInput = new TextInputBuilder()
            .setCustomId('updTier')
            .setLabel('Tier')
            .setPlaceholder('bt | lt | ht')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(character.tier);

        const urlInput = new TextInputBuilder()
            .setCustomId('updUrl')
            .setLabel('URL')
            .setPlaceholder('https://www.dndbeyond.com/profile/.../characters/...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(character.character_url);

        const notesInput = new TextInputBuilder()
            .setCustomId('updNotes')
            .setLabel('Notizen')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(character.notes || '');

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(tierInput),
            new ActionRowBuilder().addComponents(urlInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
    },
};
