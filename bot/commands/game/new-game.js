const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const { pendingGames } = require('../../state');
const { commandName } = require('../../commandConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('new-game'))
        .setDescription('Erstellt eine neue Spielankuendigung.'),
    async execute(interaction) {
        const id = interaction.id;
        pendingGames.set(id, {
            userId: interaction.user.id,
            tiers: new Set(),
            commandInteraction: interaction,
        });

        const tierButtons = ['BT', 'LT', 'HT', 'ET'].map(tier =>
            new ButtonBuilder()
                .setCustomId(`tier_${id}_${tier}`)
                .setLabel(tier)
                .setStyle(ButtonStyle.Secondary),
        );

        const row1 = new ActionRowBuilder().addComponents(tierButtons);
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`details_${id}`)
                .setLabel('Weiter')
                .setStyle(ButtonStyle.Primary),
        );

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                content: 'Tiers ausw\xC3\xA4hlen und dann "Weiter" klicken:',
                components: [row1, row2],
            });
        }
    },
};
