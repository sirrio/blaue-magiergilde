const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { resolvePublicBaseUrl } = require('./appUrls');

function legalLinksLine() {
    const baseUrl = resolvePublicBaseUrl();
    if (!baseUrl) {
        return 'Rechtliches: Datenschutz und Impressum sind auf der Blaue-Magiergilde-Website verfuegbar.';
    }

    return [
        '**Rechtliches**',
        `Datenschutz: <${baseUrl}/datenschutz>`,
        `Impressum: <${baseUrl}/impressum>`,
    ].join('\n');
}

function notLinkedContent() {
    return [
        '**Your Discord is not connected to the Blaue Magiergilde app yet.**',
        '',
        'Connect Discord to your existing app account once so the bot can use your characters.',
        '',
        'If you **do not have** an account yet, create a new account here.',
        '',
        '**Important:** If you already use the app, *do not create a new account*. Open your profile and connect Discord there instead.',
        '',
        legalLinksLine(),
    ].join('\n');
}

function buildNotLinkedButtons(discordUserId) {
    const baseUrl = resolvePublicBaseUrl();
    const profileUrl = baseUrl ? `${baseUrl}/settings/profile` : null;

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appJoinStart_${discordUserId}`)
            .setLabel('Create new account')
            .setStyle(ButtonStyle.Primary),
        profileUrl
            ? new ButtonBuilder()
                .setLabel('Connect existing account')
                .setStyle(ButtonStyle.Link)
                .setURL(profileUrl)
            : new ButtonBuilder()
                .setCustomId(`appLinkInfo_${discordUserId}`)
                .setLabel('Connect existing account')
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
    legalLinksLine,
    notLinkedContent,
};
