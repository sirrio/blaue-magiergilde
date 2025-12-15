const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wwt-register-character')
        .setDescription('Registriere einen Charakter.'),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('registerCharacterModal')
            .setTitle('Charakter registrieren');

        const nameInput = new TextInputBuilder()
            .setCustomId('regName')
            .setLabel('Charaktername')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const tierInput = new TextInputBuilder()
            .setCustomId('regTier')
            .setLabel('Tier')
            .setPlaceholder('bt | lt | ht')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

            const urlInput = new TextInputBuilder()
                .setCustomId('regUrl')
                .setLabel('URL')
                .setPlaceholder('https://www.dndbeyond.com/profile/.../characters/...')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

        const notesInput = new TextInputBuilder()
            .setCustomId('regNotes')
            .setLabel('Notizen')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(tierInput),
            new ActionRowBuilder().addComponents(urlInput),
            new ActionRowBuilder().addComponents(notesInput),
        );

        await interaction.showModal(modal);
    },
};
