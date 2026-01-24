const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const STATUS_STYLES = {
    pending: { label: 'Pending', color: 0xf59e0b },
    approved: { label: 'Approved', color: 0x22c55e },
    declined: { label: 'Declined', color: 0xef4444 },
    retired: { label: 'Retired', color: 0x9ca3af },
    draft: { label: 'Draft', color: 0x64748b },
};

function buildUserMention(discordUserId) {
    if (!discordUserId) return null;
    return `<@${discordUserId}>`;
}

function buildStatusInfo(status) {
    const key = status && STATUS_STYLES[status] ? status : 'pending';
    return STATUS_STYLES[key] || { label: 'Pending', color: 0xf59e0b };
}

function formatList(values) {
    if (!Array.isArray(values) || values.length === 0) return '—';
    return values.filter(Boolean).join(', ');
}

function trimField(value, max = 1024) {
    if (!value) return '—';
    const text = String(value).trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3)}...`;
}

function buildCharacterApprovalMessage(payload) {
    const statusRaw = payload?.character_status || 'pending';
    const { label, color } = buildStatusInfo(statusRaw);
    const name = payload?.character_name || 'Unknown character';
    const tier = payload?.character_tier ? String(payload.character_tier).toUpperCase() : '—';
    const version = payload?.character_version || '—';
    const faction = payload?.character_faction || '—';
    const classes = formatList(payload?.character_classes);
    const filler = payload?.character_is_filler ? 'Yes' : 'No';
    const dmBubbles = payload?.character_dm_bubbles ?? '—';
    const dmCoins = payload?.character_dm_coins ?? '—';
    const shopSpend = payload?.character_shop_spend ?? '—';
    const notes = trimField(payload?.character_notes || '');
    const externalLink = payload?.external_link || '';
    const approvalUrl = payload?.approval_url || '';
    const avatarUrl = payload?.character_avatar_url || '';
    const userName = payload?.user_name || 'Unknown';
    const userMention = buildUserMention(payload?.user_discord_id);
    const userLine = userMention ? `${userName} (${userMention})` : userName;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${label.toUpperCase()} · ${name}`)
        .setDescription(`**Status:** ${label}`)
        .addFields(
            { name: 'Tier', value: tier, inline: true },
            { name: 'Version', value: version, inline: true },
            { name: 'Faction', value: String(faction), inline: true },
            { name: 'Classes', value: trimField(classes), inline: false },
            { name: 'Filler', value: filler, inline: true },
            { name: 'DM bubbles', value: String(dmBubbles), inline: true },
            { name: 'DM coins', value: String(dmCoins), inline: true },
            { name: 'Shop spend', value: String(shopSpend), inline: true },
            { name: 'User', value: trimField(userLine, 512), inline: true },
            { name: 'Notes', value: notes, inline: false },
            { name: 'External link', value: trimField(externalLink || '—', 512), inline: false },
        );

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    }

    if (payload?.character_id) {
        embed.setFooter({ text: `Character #${payload.character_id}` });
    }

    const buttons = new ActionRowBuilder();
    const isPending = statusRaw === 'pending';
    const characterId = Number(payload?.character_id);
    const hasCharacterId = Number.isFinite(characterId) && characterId > 0;
    const characterIdValue = hasCharacterId ? String(characterId) : '0';

    buttons.addComponents(
        new ButtonBuilder()
            .setCustomId(`character-approval:approve:${characterIdValue}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isPending || !hasCharacterId),
        new ButtonBuilder()
            .setCustomId(`character-approval:decline:${characterIdValue}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!isPending || !hasCharacterId),
    );

    if (approvalUrl) {
        buttons.addComponents(
            new ButtonBuilder()
                .setLabel('Open approvals')
                .setStyle(ButtonStyle.Link)
                .setURL(approvalUrl),
        );
    }

    if (externalLink) {
        buttons.addComponents(
            new ButtonBuilder()
                .setLabel('Open external link')
                .setStyle(ButtonStyle.Link)
                .setURL(externalLink),
        );
    }

    return {
        embeds: [embed],
        components: [buttons],
    };
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

    const { label } = buildStatusInfo(status);
    let message = `Your character **${characterName || 'Unknown'}** has been ${label.toLowerCase()}.`;
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

async function postCharacterApprovalAnnouncement({ client, channelId, payload }) {
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

    const messagePayload = buildCharacterApprovalMessage(payload);

    try {
        const message = await channel.send(messagePayload);
        return { ok: true, status: 200, message_id: message.id, channel_id: channel.id };
    } catch {
        return { ok: false, status: 500, error: 'Failed to post announcement.' };
    }
}

async function updateCharacterApprovalAnnouncement({ client, channelId, messageId, payload }) {
    if (!channelId || !/^[0-9]{5,}$/.test(String(channelId))) {
        return { ok: false, status: 422, error: 'Invalid channel_id.' };
    }

    if (!messageId || !/^[0-9]{5,}$/.test(String(messageId))) {
        return { ok: false, status: 422, error: 'Invalid message_id.' };
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

    try {
        const message = await channel.messages.fetch(String(messageId));
        if (!message) {
            return { ok: false, status: 404, error: 'Message not found.' };
        }

        const messagePayload = buildCharacterApprovalMessage(payload);
        await message.edit(messagePayload);
        return { ok: true, status: 200 };
    } catch {
        return { ok: false, status: 500, error: 'Failed to update announcement.' };
    }
}

module.exports = {
    sendCharacterApprovalDm,
    postCharacterApprovalAnnouncement,
    updateCharacterApprovalAnnouncement,
};
