const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { commandName } = require('../../commandConfig');
const hiddenBid = require('../../interactions/hiddenBid');
const { buildErrorEmbed } = require('../../utils/noticeEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('hiddenbid'))
        .setDescription('Set your hidden max bid for auction items.'),
    async execute(interaction) {
        try {
            await hiddenBid.showCommandPicker(interaction);
        } catch {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '',
                    embeds: [buildErrorEmbed('Hidden bids unavailable', 'Could not load auction items right now.')],
                    components: [],
                });
            }
        }
    },
};
