const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { commandName } = require('../../commandConfig');
const reactionDraw = require('../../interactions/reactionDraw');
const { t } = require('../../i18n');
const { buildErrorEmbed } = require('../../utils/noticeEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('draw'))
        .setDescription(t('reactionDraw.commandDescription'))
        .addStringOption(option => option
            .setName('emoji')
            .setDescription(t('reactionDraw.optionEmoji'))
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('count')
            .setDescription(t('reactionDraw.optionCount'))
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(25)),
    async execute(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            await reactionDraw.showPreview(interaction);
        } catch (error) {
            console.error('[bot] Reaction draw command failed.', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '',
                    embeds: [buildErrorEmbed(t('reactionDraw.unavailableTitle'), t('reactionDraw.unavailableBody'))],
                    components: [],
                });
            }
        }
    },
};
