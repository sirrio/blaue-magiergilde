const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { commandName } = require('../../commandConfig');
const hiddenBid = require('../../interactions/hiddenBid');
const { buildErrorEmbed } = require('../../utils/noticeEmbeds');
const { t } = require('../../i18n');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('hiddenbid'))
        .setDescription(t('hiddenBid.commandDescription'))
        .setContexts(0, 1),  // 0 = Guild, 1 = Bot DM
    async execute(interaction) {
        try {
            await hiddenBid.showCommandPicker(interaction);
        } catch (error) {
            console.error('[bot] Hidden bid command failed.', error);
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            }
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '',
                    embeds: [buildErrorEmbed(t('hiddenBid.unavailableTitle'), t('hiddenBid.unavailableBody'))],
                    components: [],
                });
            }
        }
    },
};
