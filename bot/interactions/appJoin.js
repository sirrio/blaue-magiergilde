const { createUserForDiscord, acceptPrivacyPolicyForDiscord } = require('../appDb');
const { buildJoinConfirmButtons, legalLinksLine, notLinkedContent } = require('../linkingUi');
const { buildErrorEmbed, buildInfoEmbed, buildSuccessEmbed, buildWarningEmbed } = require('../utils/noticeEmbeds');
const { updateManageMessage } = require('../utils/updateManageMessage');
const { setManageMessageTarget } = require('../utils/manageMessageTarget');
const { t } = require('../i18n');

function isOwnerOfInteraction(interaction, ownerDiscordId) {
    return String(interaction.user.id) === String(ownerDiscordId);
}

async function handle(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith('app')) return false;
    setManageMessageTarget(interaction);

    const [action, ownerDiscordId] = interaction.customId.split('_');

    if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
        await updateManageMessage(interaction, {
            content: '',
            embeds: [buildErrorEmbed(t('common.actionDeniedTitle'), t('common.actionDeniedBody'))],
            components: [],
        });
        return true;
    }

    if (action === 'appLinkInfo') {
        await interaction.update({
            content: '',
            embeds: [buildInfoEmbed(t('linking.connectExistingAccountTitle'), [
                notLinkedContent(),
                '',
                t('linking.connectExistingAccountHint'),
            ].join('\n'))],
            components: [],
        });
        return true;
    }

    if (action === 'appJoinStart') {
        await interaction.update({
            content: '',
            embeds: [buildWarningEmbed(t('linking.createNewAccountPromptTitle'), [
                t('linking.createNewAccountPromptHeading'),
                '',
                t('linking.createNewAccountPromptBody'),
                '',
                t('linking.createNewAccountPromptWarning'),
                '',
                t('linking.createNewAccountPromptLegal'),
                legalLinksLine(),
            ].join('\n'))],
            components: [buildJoinConfirmButtons(ownerDiscordId)],
        });
        return true;
    }

    if (action === 'appJoinCancel') {
        await interaction.update({
            content: '',
            embeds: [buildInfoEmbed(t('linking.canceled'))],
            components: [],
        });
        return true;
    }

    if (action === 'appJoinConfirm') {
        try {
            const result = await createUserForDiscord(interaction.user);
            await interaction.update({
                content: '',
                embeds: [
                    result.created
                        ? buildSuccessEmbed(t('linking.accountCreatedTitle'), t('linking.accountCreatedBody'))
                        : buildInfoEmbed(t('linking.alreadyLinkedTitle'), t('linking.alreadyLinkedBody')),
                ],
                components: [],
            });
        } catch (error) {
             
            console.error(error);
            await interaction.update({
                content: '',
                embeds: [buildErrorEmbed(t('linking.createFailedTitle'), t('linking.createFailedBody', { message: error.message }))],
                components: [],
            });
        }
        return true;
    }

    if (action === 'appPolicyAccept') {
        try {
            await acceptPrivacyPolicyForDiscord(interaction.user);
            await interaction.update({
                content: '',
                embeds: [buildSuccessEmbed(t('linking.policyAcceptedTitle'), t('linking.policyAcceptedBody'))],
                components: [],
            });
        } catch (error) {
            console.error(error);
            await interaction.update({
                content: '',
                embeds: [buildErrorEmbed(t('linking.createFailedTitle'), t('linking.createFailedBody', { message: error.message }))],
                components: [],
            });
        }
        return true;
    }

    await updateManageMessage(interaction, {
        content: '',
        embeds: [buildErrorEmbed(t('common.unknownAction'))],
        components: [],
    });
    return true;
}

module.exports = { handle };
