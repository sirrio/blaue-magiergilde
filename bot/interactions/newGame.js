const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} = require('discord.js');
const { attachRateLimitListener, waitForDiscordRateLimit } = require('../discordRateLimit');
const { formatLocalIsoDate, formatTimeHHMM } = require('../dateUtils');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { setManageMessageTarget } = require('../utils/manageMessageTarget');
const { buildErrorEmbed, buildSuccessEmbed, buildWarningEmbed } = require('../utils/noticeEmbeds');
const { pendingGames } = require('../state');
const { getLinkedUserLocaleForDiscord } = require('../appDb');
const { t } = require('../i18n');
const { isThreadChannel, threadRestrictionMessage } = require('./newGameHelpers');

async function resolveInteractionLocale(interaction) {
    return await getLinkedUserLocaleForDiscord(interaction.user).catch(() => null);
}

async function handle(interaction) {
    attachRateLimitListener(interaction?.client);
    if (interaction.isMessageComponent?.()) {
        setManageMessageTarget(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith('tier_')) {
        const locale = await resolveInteractionLocale(interaction);
        const [, id, tier] = interaction.customId.split('_');
        const data = pendingGames.get(id);

        if (!data) {
            await updateManageMessage(interaction, {
                content: '',
                embeds: [buildErrorEmbed(t('newGame.noDataFound', {}, locale))],
                components: [],
            });
            return true;
        }

        if (data.tiers.has(tier)) data.tiers.delete(tier);
        else data.tiers.add(tier);

        const row1 = new ActionRowBuilder().addComponents(
            ['BT', 'LT', 'HT', 'ET'].map(t =>
                new ButtonBuilder()
                    .setCustomId(`tier_${id}_${t}`)
                    .setLabel(t)
                    .setStyle(data.tiers.has(t) ? ButtonStyle.Success : ButtonStyle.Secondary),
            ),
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`details_${id}`)
                .setLabel(t('newGame.continue', {}, locale))
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.update({ components: [row1, row2] });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('details_')) {
        const locale = await resolveInteractionLocale(interaction);
        const id = interaction.customId.replace('details_', '');
        const data = pendingGames.get(id);

        if (!data) {
            await updateManageMessage(interaction, {
                content: '',
                embeds: [buildErrorEmbed(t('newGame.noDataFound', {}, locale))],
                components: [],
            });
            return true;
        }

        const now = new Date();
        const defaultDate = now.toISOString().slice(0, 10);
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);
        const defaultTime = nextHour.toISOString().slice(11, 16);

        const modal = new ModalBuilder()
            .setCustomId(`detailsModal_${id}`)
            .setTitle(t('newGame.gameDetailsTitle', {}, locale));

        const dateInput = new TextInputBuilder()
            .setCustomId('gameDate')
            .setLabel(t('newGame.dateLabel', {}, locale))
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(defaultDate);

        const timeInput = new TextInputBuilder()
            .setCustomId('gameTime')
            .setLabel(t('newGame.timeLabel', {}, locale))
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(defaultTime);

        const textInput = new TextInputBuilder()
            .setCustomId('gameText')
            .setLabel(t('newGame.textLabel', {}, locale))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(dateInput),
            new ActionRowBuilder().addComponents(timeInput),
            new ActionRowBuilder().addComponents(textInput),
        );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('detailsModal_')) {
        const locale = await resolveInteractionLocale(interaction);
        const id = interaction.customId.replace('detailsModal_', '');
        const data = pendingGames.get(id);

        if (!data) {
            await updateManageMessage(interaction, {
                content: '',
                embeds: [buildErrorEmbed(t('newGame.noDataFound', {}, locale))],
                components: [],
            });
            return true;
        }

        if (isThreadChannel(interaction.channel)) {
            pendingGames.delete(id);
            await interaction.reply({
                embeds: [buildWarningEmbed(t('newGame.cannotCreateFromThreadTitle', {}, locale), threadRestrictionMessage(locale))],
                flags: MessageFlags.Ephemeral,
            });
            return true;
        }

        if (!interaction.channel?.threads) {
            pendingGames.delete(id);
            await updateManageMessage(interaction, {
                content: '',
                embeds: [buildWarningEmbed(t('newGame.unsupportedChannelTitle', {}, locale), t('newGame.unsupportedChannelBody', {}, locale))],
                components: [],
            });
            return true;
        }

        const dateString = interaction.fields.getTextInputValue('gameDate');
        const timeString = interaction.fields.getTextInputValue('gameTime');
        const text = interaction.fields.getTextInputValue('gameText') || '';
        pendingGames.delete(id);

        let time = Date.parse(`${dateString}T${timeString}`);
        if (Number.isNaN(time)) time = Date.now();

        const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'magiergilde');
        const mention = role ? `<@&${role.id}>` : '@Magiergilde';

        const emojiMap = {
            BT: '804713705358622800',
            LT: '804713705262546995',
            HT: '804713704918089780',
            ET: '804713705337782312',
        };

        const tiers = Array.from(data.tiers).map(t => {
            const emojiId = emojiMap[t];
            const emoji = emojiId ? interaction.client.emojis.cache.get(emojiId) : null;
            return emoji ? emoji.toString() : t;
        }).join(' ');

        const date = new Date(time);
        const formattedDate = `${formatLocalIsoDate(date)} ${formatTimeHHMM(date)}`;

        const announcement = `${tiers} - ${formattedDate} - by <@${data.userId}> - ${mention} - ${text}`;
        await waitForDiscordRateLimit(interaction.client);
        const msg = await interaction.channel.send(announcement);
        await waitForDiscordRateLimit(interaction.client);
        await msg.startThread({ name: t('newGame.gameThreadName', {}, locale), autoArchiveDuration: 1440 });

        if (data.commandInteraction) {
            await data.commandInteraction.deleteReply().catch(() => undefined);
        }

        await updateManageMessage(interaction, {
            content: '',
            embeds: [buildSuccessEmbed(t('newGame.announcementCreated', {}, locale))],
            components: [],
        });
        return true;
    }

    return false;
}

module.exports = { handle };
