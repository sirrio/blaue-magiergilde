const { MessageFlags } = require('discord.js');
const { resolveApiBaseUrl } = require('../appUrls');
const { withInsecureDispatcher } = require('../httpClient');
const { buildErrorEmbed, buildSuccessEmbed } = require('../utils/noticeEmbeds');

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

    return null;
}

async function handle(interaction) {
    if (!interaction.isButton()) return false;

    const action = parseApprovalAction(interaction.customId);
    if (!action) return false;

    const appUrl = resolveApiBaseUrl();
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();

    if (!appUrl || !token) {
        await interaction.reply({
            embeds: [buildErrorEmbed('Bot HTTP not configured', 'Set BOT_APP_URL and BOT_HTTP_TOKEN.')],
            flags: MessageFlags.Ephemeral,
        });
        return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const endpoint = `${appUrl.replace(/\/$/, '')}/bot/character-approvals/status`;
    let response;
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
            }),
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[bot] Character approval request failed.', { endpoint, error: message });
        await interaction.editReply({
            embeds: [buildErrorEmbed('App request failed', `Failed to reach the app (${endpoint}).`)],
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
            : 'Declined';
    await interaction.editReply({
        embeds: [buildSuccessEmbed('Character status updated', `${verb} character.`)],
    });
    return true;
}

module.exports = {
    handle,
};
