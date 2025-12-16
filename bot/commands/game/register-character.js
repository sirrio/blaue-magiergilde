const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { DiscordNotLinkedError, getLinkedUserIdForDiscord } = require('../../appDb');
const { replyNotLinked } = require('../../linkingUi');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('register-character'))
        .setDescription('Erstellt einen Charakter in der App.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            const userId = await getLinkedUserIdForDiscord(interaction.user);
            if (!userId) {
                await replyNotLinked(interaction);
                return;
            }
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await replyNotLinked(interaction);
                return;
            }
            throw error;
        }

        const modal = new ModalBuilder()
            .setCustomId('registerCharacterModal')
            .setTitle('Charakter erstellen');

        const nameInput = new TextInputBuilder()
            .setCustomId('regName')
            .setLabel('Charaktername')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const tierInput = new TextInputBuilder()
            .setCustomId('regTier')
            .setLabel('Start-Tier')
            .setPlaceholder('bt | lt | ht')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

            const urlInput = new TextInputBuilder()
                .setCustomId('regUrl')
                .setLabel('External Link (URL)')
                .setPlaceholder('https://...')
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
