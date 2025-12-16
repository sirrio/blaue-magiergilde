const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { DiscordNotLinkedError, getLinkedUserIdForDiscord } = require('../../appDb');

function linkNotConnectedMessage() {
    return 'Dein Account ist nicht mit Discord verbunden.\n' +
        'Bitte verbinde Discord in deinem Profil: https://blaue-magiergilde.de/settings/profile';
}

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
                await interaction.reply({ content: linkNotConnectedMessage(), flags: MessageFlags.Ephemeral });
                return;
            }
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await interaction.reply({ content: linkNotConnectedMessage(), flags: MessageFlags.Ephemeral });
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
