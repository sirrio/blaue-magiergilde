const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const { pendingGames } = require('../../state');
const { commandName } = require('../../commandConfig');
const { getLinkedUserLocaleForDiscord } = require('../../appDb');
const { t } = require('../../i18n');
const { isThreadChannel, threadRestrictionMessage } = require('../../interactions/newGameHelpers');
const { buildInfoEmbed, buildWarningEmbed } = require('../../utils/noticeEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('new-game'))
        .setDescription(t('newGame.commandDescription')),
    async execute(interaction) {
        const locale = await getLinkedUserLocaleForDiscord(interaction.user).catch(() => null);
        if (isThreadChannel(interaction.channel)) {
            await interaction.reply({
                embeds: [buildWarningEmbed(t('newGame.cannotCreateFromThreadTitle', {}, locale), threadRestrictionMessage(locale))],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

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
                .setLabel(t('newGame.continue', {}, locale))
                .setStyle(ButtonStyle.Primary),
        );

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                content: '',
                embeds: [buildInfoEmbed(t('newGame.selectTiersTitle', {}, locale), t('newGame.selectTiersBody', {}, locale))],
                components: [row1, row2],
            });
        }
    },
};
