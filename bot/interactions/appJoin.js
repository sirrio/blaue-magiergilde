const { MessageFlags } = require('discord.js');
const { createUserForDiscord } = require('../appDb');
const { buildJoinConfirmButtons, notLinkedContent } = require('../linkingUi');

function isOwnerOfInteraction(interaction, ownerDiscordId) {
    return String(interaction.user.id) === String(ownerDiscordId);
}

async function handle(interaction) {
    if (!interaction.isButton()) return false;
    if (!interaction.customId.startsWith('app')) return false;

    const [action, ownerDiscordId] = interaction.customId.split('_');

    if (!isOwnerOfInteraction(interaction, ownerDiscordId)) {
        await interaction.reply({ content: 'You cannot perform this action.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (action === 'appLinkInfo') {
        await interaction.update({
            content: [
                notLinkedContent(),
                '',
                'If you already use the app: please connect Discord in your profile (Connect Discord).',
            ].join('\n'),
            components: [],
        });
        return true;
    }

    if (action === 'appJoinStart') {
        await interaction.update({
            content: [
                '**Create a new app account?**',
                '',
                'This creates a new user account linked to your Discord ID.',
                '',
                '**Do not do this** if you already have an app account (otherwise you will end up with two accounts).',
            ].join('\n'),
            components: [buildJoinConfirmButtons(ownerDiscordId)],
        });
        return true;
    }

    if (action === 'appJoinCancel') {
        await interaction.update({ content: 'Canceled.', components: [] });
        return true;
    }

    if (action === 'appJoinConfirm') {
        try {
            const result = await createUserForDiscord(interaction.user);
            await interaction.update({
                content: result.created
                    ? 'Account created and linked to Discord. You can run the command again now.'
                    : 'Your Discord is already linked to an account. You can run the command again now.',
                components: [],
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            await interaction.update({ content: `Failed to create: ${error.message}`, components: [] });
        }
        return true;
    }

    await interaction.reply({ content: 'Unknown action.', flags: MessageFlags.Ephemeral });
    return true;
}

module.exports = { handle };

