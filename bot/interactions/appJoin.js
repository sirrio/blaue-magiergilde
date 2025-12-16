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
        await interaction.reply({ content: 'Du kannst diese Aktion nicht ausf\u00fchren.', flags: MessageFlags.Ephemeral });
        return true;
    }

    if (action === 'appLinkInfo') {
        await interaction.update({
            content: [
                notLinkedContent(),
                '',
                'Wenn du die App bereits nutzt: bitte verbinde Discord in deinem Profil (Connect Discord).',
            ].join('\n'),
            components: [],
        });
        return true;
    }

    if (action === 'appJoinStart') {
        await interaction.update({
            content: [
                '**Neuen App-Account erstellen?**',
                '',
                'Das erstellt einen neuen Benutzer-Account, der an deine Discord-ID gebunden ist.',
                '',
                '**Nicht machen**, wenn du bereits einen App-Account hast (sonst hast du danach zwei Accounts).',
            ].join('\n'),
            components: [buildJoinConfirmButtons(ownerDiscordId)],
        });
        return true;
    }

    if (action === 'appJoinCancel') {
        await interaction.update({ content: 'Abgebrochen.', components: [] });
        return true;
    }

    if (action === 'appJoinConfirm') {
        try {
            const result = await createUserForDiscord(interaction.user);
            await interaction.update({
                content: result.created
                    ? 'Account erstellt und mit Discord verbunden. Du kannst den Command jetzt erneut ausf\u00fchren.'
                    : 'Dein Discord ist bereits mit einem Account verbunden. Du kannst den Command jetzt erneut ausf\u00fchren.',
                components: [],
            });
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
            await interaction.update({ content: `Fehler beim Erstellen: ${error.message}`, components: [] });
        }
        return true;
    }

    await interaction.reply({ content: 'Unbekannte Aktion.', flags: MessageFlags.Ephemeral });
    return true;
}

module.exports = { handle };

