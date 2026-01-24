function buildUserMention(discordUserId) {
    if (!discordUserId) return null;
    return `<@${discordUserId}>`;
}

function buildStatusLabel(status) {
    if (status === 'approved') return 'approved';
    if (status === 'declined') return 'declined';
    return String(status || 'updated');
}

async function sendCharacterApprovalDm({ client, discordUserId, status, characterName, characterUrl, charactersUrl }) {
    if (!discordUserId || !/^[0-9]{5,}$/.test(String(discordUserId))) {
        return { ok: false, status: 422, error: 'Invalid discord_user_id.' };
    }

    let user;
    try {
        user = await client.users.fetch(String(discordUserId));
    } catch {
        return { ok: false, status: 404, error: 'Discord user not found.' };
    }

    const statusLabel = buildStatusLabel(status);
    let message = `Your character **${characterName || 'Unknown'}** has been ${statusLabel}.`;
    if (characterUrl) {
        message += `\nCharacter: <${characterUrl}>`;
    }
    if (charactersUrl) {
        message += `\nYour characters: <${charactersUrl}>`;
    }

    try {
        await user.send(message);
        return { ok: true, status: 200 };
    } catch {
        return { ok: false, status: 500, error: 'Failed to send DM.' };
    }
}

async function postCharacterApprovalAnnouncement({
    client,
    channelId,
    characterName,
    characterTier,
    userName,
    userDiscordId,
    approvalUrl,
    characterUrl,
}) {
    if (!channelId || !/^[0-9]{5,}$/.test(String(channelId))) {
        return { ok: false, status: 422, error: 'Invalid channel_id.' };
    }

    let channel;
    try {
        channel = await client.channels.fetch(String(channelId));
    } catch {
        return { ok: false, status: 404, error: 'Channel not found.' };
    }

    if (!channel?.isTextBased?.()) {
        return { ok: false, status: 422, error: 'Channel must be text-based.' };
    }

    const tierLabel = characterTier ? String(characterTier).toUpperCase() : 'Unknown';
    const userMention = buildUserMention(userDiscordId);
    const userLabel = userMention ? `${userName || 'User'} (${userMention})` : (userName || 'User');

    const lines = [
        `New character pending approval: **${characterName || 'Unknown'}** (${tierLabel})`,
        `User: ${userLabel}`,
    ];

    if (approvalUrl) {
        lines.push(`Approval: <${approvalUrl}>`);
    }
    if (characterUrl) {
        lines.push(`Character: <${characterUrl}>`);
    }

    const content = lines.filter(Boolean).join('\n');

    try {
        await channel.send({ content });
        return { ok: true, status: 200 };
    } catch {
        return { ok: false, status: 500, error: 'Failed to post announcement.' };
    }
}

module.exports = {
    sendCharacterApprovalDm,
    postCharacterApprovalAnnouncement,
};
