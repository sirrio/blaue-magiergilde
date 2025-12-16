const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { commandName } = require('../../commandConfig');
const { DiscordNotLinkedError, findCharacterForDiscord } = require('../../appDb');

function linkNotConnectedMessage() {
    return 'Dein Account ist nicht mit Discord verbunden.\n' +
        'Bitte verbinde Discord in deinem Profil: https://blaue-magiergilde.de/settings/profile';
}

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
        if (!interaction.inGuild()) {
            await interaction.reply({ content: 'Bitte nutze diesen Befehl in einem Server (nicht in DMs).', flags: MessageFlags.Ephemeral });
            return;
        }

        const id = interaction.options.getInteger('id');
        let character;
        try {
            character = await findCharacterForDiscord(interaction.user, id);
        } catch (error) {
            if (error instanceof DiscordNotLinkedError) {
                await interaction.reply({ content: linkNotConnectedMessage(), flags: MessageFlags.Ephemeral });
                return;
            }
            throw error;
        }
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
