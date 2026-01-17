const {
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const { attachRateLimitListener, waitForDiscordRateLimit } = require('../discordRateLimit');
const { pendingGames } = require('../state');
const { isThreadChannel, threadRestrictionMessage } = require('./newGameHelpers');

async function handle(interaction) {
    attachRateLimitListener(interaction?.client);

    if (interaction.isButton() && interaction.customId.startsWith('tier_')) {
        const [, id, tier] = interaction.customId.split('_');
        const data = pendingGames.get(id);

        if (!data) {
            await interaction.reply({ content: 'No data found.', flags: MessageFlags.Ephemeral });
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
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.update({ components: [row1, row2] });
        return true;
    }

    if (interaction.isButton() && interaction.customId.startsWith('details_')) {
        const id = interaction.customId.replace('details_', '');
        const data = pendingGames.get(id);

        if (!data) {
            await interaction.reply({ content: 'No data found.', flags: MessageFlags.Ephemeral });
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
            .setTitle('Game details');

        const dateInput = new TextInputBuilder()
            .setCustomId('gameDate')
            .setLabel('Date (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(defaultDate);

        const timeInput = new TextInputBuilder()
            .setCustomId('gameTime')
            .setLabel('Time (HH:mm)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setValue(defaultTime);

        const textInput = new TextInputBuilder()
            .setCustomId('gameText')
            .setLabel('Text')
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
        const id = interaction.customId.replace('detailsModal_', '');
        const data = pendingGames.get(id);

        if (!data) {
            await interaction.reply({ content: 'No data found.', flags: MessageFlags.Ephemeral });
            return true;
        }

        if (isThreadChannel(interaction.channel)) {
            pendingGames.delete(id);
            await interaction.reply({
                content: threadRestrictionMessage(),
                flags: MessageFlags.Ephemeral,
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
        const formattedDate = `${date.toLocaleString('en-GB', { day: '2-digit' })}. ${date.toLocaleString('en-GB', { month: 'long' })} ${date.toLocaleString('en-GB', { year: 'numeric' })} ${date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

        const announcement = `${tiers} - ${formattedDate} - by <@${data.userId}> - ${mention} - ${text}`;
        await waitForDiscordRateLimit(interaction.client);
        const msg = await interaction.channel.send(announcement);
        await waitForDiscordRateLimit(interaction.client);
        await msg.startThread({ name: 'Game thread', autoArchiveDuration: 1440 });

        if (data.commandInteraction) {
            await data.commandInteraction.deleteReply().catch(() => {});
        }

        await interaction.reply({ content: 'Announcement created.', flags: MessageFlags.Ephemeral });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
        return true;
    }

    return false;
}

module.exports = { handle };
