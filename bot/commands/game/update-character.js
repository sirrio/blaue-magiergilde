const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { findCharacterForDiscord } = require('../../appDb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('update-character'))
        .setDescription('Aktualisiere einen Charakter (aus der App).')
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

        const modal = new ModalBuilder()
            .setCustomId(`updateCharacterModal_${id}`)
            .setTitle('Charakter aktualisieren');

        const nameInput = new TextInputBuilder()
            .setCustomId('updName')
            .setLabel('Charaktername')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(character.name);

        const tierInput = new TextInputBuilder()
            .setCustomId('updTier')
            .setLabel('Start-Tier')
            .setPlaceholder('bt | lt | ht')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(character.start_tier);

        const urlInput = new TextInputBuilder()
            .setCustomId('updUrl')
            .setLabel('External Link (URL)')
            .setPlaceholder('https://...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(character.external_link);

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
