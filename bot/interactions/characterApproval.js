const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const { resolveApiBaseUrls } = require('../appUrls');
const { withInsecureDispatcher } = require('../httpClient');
const { buildErrorEmbed, buildSuccessEmbed, buildWarningEmbed } = require('../utils/noticeEmbeds');

function parseApprovalAction(customId) {
    if (!customId || !customId.startsWith('character-approval:')) return null;

    const parts = customId.split(':');
    if (parts.length !== 3) return null;

    const action = parts[1];
    const characterId = Number(parts[2]);
    if (!Number.isFinite(characterId) || characterId <= 0) return null;

    if (action === 'approve') return { status: 'approved', characterId };
    if (action === 'needs-changes') return { status: 'needs_changes', characterId };
    if (action === 'decline') return { status: 'declined', characterId };
    if (action === 'set-pending') return { status: 'pending', characterId };

    return null;
}

function parseApprovalModal(customId) {
    if (!customId || !customId.startsWith('character-approval-note:')) return null;

    const parts = customId.split(':');
    if (parts.length !== 3) return null;

    const status = String(parts[1] || '').trim().toLowerCase();
    if (!['needs_changes', 'declined'].includes(status)) return null;

    const characterId = Number(parts[2]);
    if (!Number.isFinite(characterId) || characterId <= 0) return null;

    return { status, characterId };
}

function parseApprovalConfirm(customId) {
    if (!customId || !customId.startsWith('character-approval-confirm:')) return null;

    const parts = customId.split(':');
    if (parts.length !== 3) return null;

    const status = String(parts[1] || '').trim().toLowerCase();
    if (!['approved', 'pending'].includes(status)) return null;

    const characterId = Number(parts[2]);
    if (!Number.isFinite(characterId) || characterId <= 0) return null;

    return { status, characterId };
}

function parseApprovalCancel(customId) {
    if (!customId || !customId.startsWith('character-approval-cancel:')) return null;

    const parts = customId.split(':');
    if (parts.length !== 3) return null;

    const status = String(parts[1] || '').trim().toLowerCase();
    if (!['approved', 'pending'].includes(status)) return null;

    const characterId = Number(parts[2]);
    if (!Number.isFinite(characterId) || characterId <= 0) return null;

    return { status, characterId };
}

async function sendStatusUpdate(interaction, action, reviewNote = '') {
    const appUrls = resolveApiBaseUrls();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();

    if (appUrls.length === 0 || !token) {
        await interaction.reply({
            embeds: [buildErrorEmbed('Bot HTTP not configured', 'Set BOT_APP_URL or BOT_PUBLIC_APP_URL and BOT_HTTP_TOKEN.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let response = null;
    let lastEndpoint = '';
    for (const appUrl of appUrls) {
        const endpoint = `${appUrl.replace(/\/$/, '')}/bot/character-approvals/status`;
        lastEndpoint = endpoint;

        try {
            response = await fetch(endpoint, withInsecureDispatcher(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Bot-Token': token,
                },
                body: JSON.stringify({
                    character_id: action.characterId,
                    status: action.status,
                    actor_discord_id: String(interaction.user.id),
                    review_note: reviewNote || undefined,
                }),
            }));
            break;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[bot] Character approval request failed.', { endpoint, error: message });
        }
    }

    if (!response) {
        await interaction.editReply({
            embeds: [buildErrorEmbed('App request failed', `Failed to reach the app (${lastEndpoint}).`)],
        });
        return true;
    }

    if (!response.ok) {
        let detail = '';
        try {
            const payload = await response.json();
            detail = payload?.error || payload?.message || '';
        } catch {
            detail = '';
        }

        const message = detail ? `Request failed: ${detail}` : 'Request failed.';
        await interaction.editReply({
            embeds: [buildErrorEmbed('Approval update failed', message)],
        });
        return true;
    }

    const verb = action.status === 'approved'
        ? 'Approved'
        : action.status === 'needs_changes'
            ? 'Marked as needs changes'
            : action.status === 'declined'
                ? 'Declined'
                : 'Set back to pending';
    await interaction.editReply({
        embeds: [buildSuccessEmbed('Character status updated', `${verb} character.`)],
    });
    return true;
}

async function showConfirmation(interaction, action) {
    const label = action.status === 'approved' ? 'approve' : 'set this character back to pending';
    await interaction.reply({
        embeds: [buildWarningEmbed('Confirm action', `Do you want to ${label}?`)],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`character-approval-confirm:${action.status}:${action.characterId}`)
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`character-approval-cancel:${action.status}:${action.characterId}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary),
            ),
        ],
        flags: MessageFlags.Ephemeral,
    });
    return true;
}

async function handle(interaction) {
    if (interaction.isButton()) {
        const confirmAction = parseApprovalConfirm(interaction.customId);
        if (confirmAction) {
            return sendStatusUpdate(interaction, confirmAction);
        }

        const cancelAction = parseApprovalCancel(interaction.customId);
        if (cancelAction) {
            await interaction.update({
                embeds: [buildSuccessEmbed('Cancelled', 'No changes were made.')],
                components: [],
            });
            return true;
        }

        const action = parseApprovalAction(interaction.customId);
        if (!action) return false;

        if (action.status === 'approved' || action.status === 'pending') {
            return showConfirmation(interaction, action);
        }

        const modal = new ModalBuilder()
            .setCustomId(`character-approval-note:${action.status}:${action.characterId}`)
            .setTitle(action.status === 'declined' ? 'Decline character' : 'Request changes');

        const reviewNoteInput = new TextInputBuilder()
            .setCustomId('review_note')
            .setLabel('Review note (required)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000)
            .setMinLength(1)
            .setPlaceholder('Explain why this character was declined or what needs to be fixed.');

        modal.addComponents(new ActionRowBuilder().addComponents(reviewNoteInput));
        await interaction.showModal(modal);
        return true;
    }

    if (!interaction.isModalSubmit()) return false;

    const action = parseApprovalModal(interaction.customId);
    if (!action) return false;

    const reviewNote = String(interaction.fields.getTextInputValue('review_note') || '').trim();
    if (!reviewNote) {
        await interaction.reply({
            embeds: [buildErrorEmbed('Missing review note', 'Please provide a review note before submitting.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    return sendStatusUpdate(interaction, action, reviewNote);
}

module.exports = {
    handle,
};
