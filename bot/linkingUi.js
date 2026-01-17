const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

function notLinkedContent() {
    return [
        '**Your Discord is not connected to the Blaue Magiergilde app yet.**',
        '',
        'To let the bot manage *your existing characters*, you need to connect Discord to your app account once.',
        '',
        'If you **do not have** an account yet, you can create a new app account here (linked to your Discord ID).',
        '',
        '**Important:** If you already use the app, *do not create a new account*; connect Discord in your profile instead.',
    ].join('\n');
}

function buildNotLinkedButtons(discordUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appJoinStart_${discordUserId}`)
            .setLabel('Create account')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`appLinkInfo_${discordUserId}`)
            .setLabel('I already have an account')
            .setStyle(ButtonStyle.Secondary),
    );
}

function buildJoinConfirmButtons(discordUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appJoinConfirm_${discordUserId}`)
            .setLabel('Yes, create account')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`appJoinCancel_${discordUserId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

async function replyNotLinked(interaction) {
    if (interaction?.isMessageComponent?.()) {
        await interaction.update({
            content: notLinkedContent(),
            components: [buildNotLinkedButtons(interaction.user.id)],
        });
        return;
    }

    if (interaction?.isRepliable?.()) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                content: notLinkedContent(),
                components: [buildNotLinkedButtons(interaction.user.id)],
            });
        }
    }
}

module.exports = {
    replyNotLinked,
    buildNotLinkedButtons,
    buildJoinConfirmButtons,
    notLinkedContent,
};
