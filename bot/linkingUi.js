const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { resolvePublicBaseUrl } = require('./appUrls');
const { t } = require('./i18n');

function legalLinksLine() {
    const baseUrl = resolvePublicBaseUrl();
    if (!baseUrl) {
        return t('linking.legalFallback');
    }

    return [
        t('linking.legalHeading'),
        `Datenschutz: <${baseUrl}/datenschutz>`,
        `Impressum: <${baseUrl}/impressum>`,
    ].join('\n');
}

function notLinkedContent() {
    return [
        t('linking.notLinkedTitle'),
        '',
        t('linking.notLinkedExisting'),
        '',
        t('linking.notLinkedNoAccount'),
        '',
        t('linking.notLinkedWarning'),
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
            .setLabel(t('linking.createNewAccount'))
            .setStyle(ButtonStyle.Primary),
        profileUrl
            ? new ButtonBuilder()
                .setLabel(t('linking.connectExistingAccount'))
                .setStyle(ButtonStyle.Link)
                .setURL(profileUrl)
            : new ButtonBuilder()
                .setCustomId(`appLinkInfo_${discordUserId}`)
                .setLabel(t('linking.connectExistingAccount'))
                .setStyle(ButtonStyle.Secondary),
    );
}

function buildJoinConfirmButtons(discordUserId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`appJoinConfirm_${discordUserId}`)
            .setLabel(t('linking.confirmCreateAccount'))
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`appJoinCancel_${discordUserId}`)
            .setLabel(t('common.cancel'))
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
