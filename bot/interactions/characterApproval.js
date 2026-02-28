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
const { buildErrorEmbed, buildSuccessEmbed } = require('../utils/noticeEmbeds');

const APPROVAL_STATUS_LABELS = new Set(['pending', 'approved', 'declined', 'needs changes', 'needs_changes', 'retired', 'draft']);

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
    if (parts.length !== 4) return null;

    const status = String(parts[1] || '').trim().toLowerCase();
    if (!['approved', 'pending'].includes(status)) return null;

    const characterId = Number(parts[2]);
    if (!Number.isFinite(characterId) || characterId <= 0) return null;

    const sourceStatus = normalizeApprovalStatus(parts[3]);
    if (!sourceStatus) return null;

    return { status, characterId, sourceStatus };
}

function parseApprovalCancel(customId) {
    if (!customId || !customId.startsWith('character-approval-cancel:')) return null;

    const parts = customId.split(':');
    if (parts.length !== 4) return null;

    const status = String(parts[1] || '').trim().toLowerCase();
    if (!['approved', 'pending'].includes(status)) return null;

    const characterId = Number(parts[2]);
    if (!Number.isFinite(characterId) || characterId <= 0) return null;

    const sourceStatus = normalizeApprovalStatus(parts[3]);
    if (!sourceStatus) return null;

    return { status, characterId, sourceStatus };
}

function normalizeApprovalStatus(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalized || !APPROVAL_STATUS_LABELS.has(normalized.replace(/_/g, ' ')) && !APPROVAL_STATUS_LABELS.has(normalized)) {
        return null;
    }

    return normalized === 'needs changes' ? 'needs_changes' : normalized;
}

function getMessageApprovalStatus(message) {
    const title = String(message?.embeds?.[0]?.title || '').trim();
    if (!title) {
        return null;
    }

    const [rawStatus] = title.split('·', 1);
    return normalizeApprovalStatus(rawStatus);
}

function buildApprovalActionRow(status, characterId) {
    const normalizedStatus = normalizeApprovalStatus(status) || 'pending';
    const isPending = normalizedStatus === 'pending';
    const canSetPending = ['approved', 'declined', 'needs_changes'].includes(normalizedStatus);
    const hasCharacterId = Number.isFinite(characterId) && characterId > 0;
    const characterIdValue = hasCharacterId ? String(characterId) : '0';

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`character-approval:approve:${characterIdValue}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isPending || !hasCharacterId),
        new ButtonBuilder()
            .setCustomId(`character-approval:needs-changes:${characterIdValue}`)
            .setLabel('Needs changes')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!isPending || !hasCharacterId),
        new ButtonBuilder()
            .setCustomId(`character-approval:decline:${characterIdValue}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!isPending || !hasCharacterId),
        new ButtonBuilder()
            .setCustomId(`character-approval:set-pending:${characterIdValue}`)
            .setLabel('Set pending')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!canSetPending || !hasCharacterId),
    );
}

function preserveSecondaryRows(message) {
    return (message?.components ?? [])
        .slice(1)
        .map((row) => row.toJSON());
}

function buildInlineConfirmRow(action, sourceStatus) {
    const characterIdValue = String(action.characterId);
    const source = normalizeApprovalStatus(sourceStatus) || 'pending';
    const confirmLabel = action.status === 'approved' ? 'Confirm approve' : 'Confirm set pending';

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`character-approval-confirm:${action.status}:${characterIdValue}:${source}`)
            .setLabel(confirmLabel)
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`character-approval-cancel:${action.status}:${characterIdValue}:${source}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary),
    );
}

async function restoreApprovalMessage(interaction, status, characterId) {
    const components = [
        buildApprovalActionRow(status, characterId).toJSON(),
        ...preserveSecondaryRows(interaction.message),
    ];

    await interaction.message.edit({
        components,
    });
}

async function sendStatusUpdate(interaction, action, reviewNote = '') {
    const appUrls = resolveApiBaseUrls();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    const usesInlineConfirm = interaction.isButton();

    if (appUrls.length === 0 || !token) {
        await interaction.reply({
            embeds: [buildErrorEmbed('Bot HTTP not configured', 'Set BOT_APP_URL or BOT_PUBLIC_APP_URL and BOT_HTTP_TOKEN.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    if (usesInlineConfirm) {
        await interaction.deferUpdate();
    } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

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
        const payload = {
            embeds: [buildErrorEmbed('App request failed', `Failed to reach the app (${lastEndpoint}).`)],
        };
        if (usesInlineConfirm) {
            await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.editReply(payload);
        }
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
        const payload = {
            embeds: [buildErrorEmbed('Approval update failed', message)],
        };
        if (usesInlineConfirm) {
            await interaction.followUp({ ...payload, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.editReply(payload);
        }
        return true;
    }

    if (usesInlineConfirm && interaction.message?.editable) {
        await restoreApprovalMessage(interaction, action.status, action.characterId);
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
    const sourceStatus = getMessageApprovalStatus(interaction.message) || (action.status === 'approved' ? 'pending' : 'approved');

    await interaction.update({
        components: [
            buildInlineConfirmRow(action, sourceStatus).toJSON(),
            ...preserveSecondaryRows(interaction.message),
        ],
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
                components: [
                    buildApprovalActionRow(cancelAction.sourceStatus, cancelAction.characterId).toJSON(),
                    ...preserveSecondaryRows(interaction.message),
                ],
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
