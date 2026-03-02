const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { withInsecureDispatcher, shouldAllowInsecure } = require('./httpClient');
const { resolveChannelId } = require('./channelOverride');

function resolveAvatarExtension(contentType, fallback) {
    if (!contentType) return fallback;
    const normalized = String(contentType).toLowerCase();
    if (normalized.includes('image/jpeg')) return 'jpg';
    if (normalized.includes('image/png')) return 'png';
    if (normalized.includes('image/webp')) return 'webp';
    if (normalized.includes('image/gif')) return 'gif';
    return fallback;
}

async function fetchAvatarAttachment(url) {
    const fallbackExtension = 'png';
    const response = await fetch(url, withInsecureDispatcher(url));
    if (!response.ok) {
        throw new Error(`Avatar fetch failed (${response.status}).`);
    }

    const contentType = response.headers.get('content-type') || '';
    const extension = resolveAvatarExtension(contentType, fallbackExtension);
    const filename = `character-avatar.${extension}`;
    const buffer = Buffer.from(await response.arrayBuffer());

    return new AttachmentBuilder(buffer, { name: filename });
}

const STATUS_STYLES = {
    pending: { label: 'Pending', color: 0xf59e0b },
    approved: { label: 'Approved', color: 0x22c55e },
    declined: { label: 'Declined', color: 0xef4444 },
    needs_changes: { label: 'Needs changes', color: 0xf97316 },
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

function formatClasses(values, limit = 3) {
    if (!Array.isArray(values) || values.length === 0) return '—';
    const trimmed = values.filter(Boolean);
    if (trimmed.length <= limit) return trimmed.join(', ');
    const visible = trimmed.slice(0, limit).join(', ');
    return `${visible} +${trimmed.length - limit}`;
}

function trimField(value, max = 1024) {
    if (!value) return '—';
    const text = String(value).trim();
    if (text.length <= max) return text;
    return `${text.slice(0, max - 3)}...`;
}

function isMeaningful(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
        return value.trim() !== '' && value.trim() !== '—';
    }
    return true;
}

function buildCharacterApprovalMessage(payload, options = {}) {
    const statusRaw = payload?.character_status || 'pending';
    const { label, color } = buildStatusInfo(statusRaw);
    const name = payload?.character_name || 'Unknown character';
    const tier = payload?.character_tier ? String(payload.character_tier).toUpperCase() : '';
    const tierBadge = tier ? `[${tier}]` : '';
    const versionValue = payload?.character_version ? String(payload.character_version).trim() : '';
    const version = versionValue !== '' ? versionValue : null;
    const rawFaction = payload?.character_faction;
    const factionValue = rawFaction && String(rawFaction).trim() !== '' ? String(rawFaction) : '';
    const faction = factionValue.toLowerCase() === 'none' ? '' : factionValue;
    const classes = formatClasses(payload?.character_classes);
    const filler = payload?.character_is_filler ? 'Yes' : 'No';
    const dmBubbles = payload?.character_dm_bubbles ?? '—';
    const dmCoins = payload?.character_dm_coins ?? '—';
    const rawShopSpend = payload?.character_shop_spend ?? null;
    const numericShopSpend = Number(rawShopSpend);
    const shopSpend = Number.isFinite(numericShopSpend) ? numericShopSpend : null;
    const notes = trimField(payload?.character_notes || '');
    const registrationNote = trimField(payload?.character_registration_note || '');
    const reviewNote = trimField(payload?.character_review_note || '');
    const externalLink = payload?.external_link || '';
    const approvalUrl = payload?.approval_url || '';
    const avatarUrl = options.avatarUrlOverride || payload?.character_avatar_url || '';
    const userName = payload?.user_name || 'Unknown';
    const userMention = buildUserMention(payload?.user_discord_id);
    const userLine = userMention ? `${userName} (${userMention})` : userName;
    const dmSummary = `${dmBubbles} bubbles · ${dmCoins} coins`;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${label.toUpperCase()} · ${tierBadge ? `${tierBadge} ` : ''}${name}`);

    const fields = [];
    if (version) {
        fields.push({ name: 'Version', value: version, inline: true });
    }
    if (faction) {
        fields.push({ name: 'Faction', value: faction, inline: true });
    }
    fields.push({ name: 'Classes', value: trimField(classes), inline: false });
    fields.push({ name: 'User', value: trimField(userLine, 1024), inline: false });
    fields.push({ name: 'DM', value: dmSummary, inline: true });
    fields.push({ name: 'Filler', value: filler, inline: true });
    if (shopSpend !== null && shopSpend > 0) {
        fields.push({ name: 'Shop spend', value: String(shopSpend), inline: true });
    }

    embed.addFields(fields);

    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    }

    if (isMeaningful(notes) && notes !== '—') {
        embed.addFields({ name: 'Notes', value: notes, inline: false });
    }
    if (isMeaningful(registrationNote) && registrationNote !== '—') {
        embed.addFields({ name: 'Registration notes', value: registrationNote, inline: false });
    }
    if (isMeaningful(reviewNote) && reviewNote !== '—') {
        embed.addFields({ name: 'Review note', value: reviewNote, inline: false });
    }

    if (payload?.character_id) {
        embed.setFooter({ text: `Character #${payload.character_id}` });
    }

    const actionButtons = new ActionRowBuilder();
    const isPending = statusRaw === 'pending';
    const canSetPending = ['approved', 'declined', 'needs_changes'].includes(String(statusRaw).toLowerCase());
    const characterId = Number(payload?.character_id);
    const hasCharacterId = Number.isFinite(characterId) && characterId > 0;
    const characterIdValue = hasCharacterId ? String(characterId) : '0';

    actionButtons.addComponents(
        new ButtonBuilder()
            .setCustomId(`character-approval:approve:${characterIdValue}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isPending || !hasCharacterId),
        new ButtonBuilder()
            .setCustomId(`character-approval:needs-changes:${characterIdValue}`)
            .setLabel('Request changes')
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

    const components = [actionButtons];
    const linkButtons = new ActionRowBuilder();
    if (approvalUrl) {
        linkButtons.addComponents(
            new ButtonBuilder()
                .setLabel('Open approvals')
                .setStyle(ButtonStyle.Link)
                .setURL(approvalUrl),
        );
    }

    if (externalLink) {
        linkButtons.addComponents(
            new ButtonBuilder()
                .setLabel('Open external link')
                .setStyle(ButtonStyle.Link)
                .setURL(externalLink),
        );
    }

    if (linkButtons.components.length > 0) {
        components.push(linkButtons);
    }

    return {
        embeds: [embed],
        components,
    };
}

async function sendCharacterApprovalDm({
    client,
    discordUserId,
    status,
    characterName,
    characterUrl,
    charactersUrl,
    characterTier,
    characterVersion,
    characterFaction,
    characterClasses,
    characterAvatarUrl,
    characterReviewNote,
    externalLink,
}) {
    if (!discordUserId || !/^[0-9]{5,}$/.test(String(discordUserId))) {
        return { ok: false, status: 422, error: 'Invalid discord_user_id.' };
    }

    let user;
    try {
        user = await client.users.fetch(String(discordUserId));
    } catch {
        return { ok: false, status: 404, error: 'Discord user not found.' };
    }

    const { label, color } = buildStatusInfo(status);
    const safeName = characterName || 'Unknown';
    const tierBadge = characterTier ? String(characterTier).toUpperCase() : '';
    const versionValue = characterVersion ? String(characterVersion).trim() : '';
    const rawFaction = characterFaction ? String(characterFaction).trim() : '';
    const faction = rawFaction.toLowerCase() === 'none' ? '' : rawFaction;
    const classes = formatClasses(characterClasses);
    const reviewNote = trimField(characterReviewNote || '');

    let description = '';
    if (label.toLowerCase() === 'approved') {
        description = 'Your character is now approved and ready to play.';
    } else if (label.toLowerCase() === 'needs changes') {
        description = 'Your character needs changes. Please update it and register again for review.';
    } else if (label.toLowerCase() === 'declined') {
        description = 'Your character was declined. Please review the details and update if needed.';
    } else {
        description = `Your character status is now **${label}**.`;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${label} · ${tierBadge ? `${tierBadge} ` : ''}${safeName}`)
        .setDescription(description);

    const fields = [];
    if (tierBadge) {
        fields.push({ name: 'Tier', value: tierBadge, inline: true });
    }
    if (versionValue) {
        fields.push({ name: 'Version', value: versionValue, inline: true });
    }
    if (faction) {
        fields.push({ name: 'Faction', value: faction, inline: true });
    }
    fields.push({ name: 'Classes', value: trimField(classes), inline: false });

    if (fields.length > 0) {
        embed.addFields(fields);
    }

    if (isMeaningful(reviewNote) && reviewNote !== '—' && (status === 'needs_changes' || status === 'declined')) {
        embed.addFields({ name: 'Review note', value: reviewNote, inline: false });
    }

    let avatarAttachment = null;
    let avatarOverride = null;
    if (characterAvatarUrl) {
        if (shouldAllowInsecure(characterAvatarUrl)) {
            try {
                avatarAttachment = await fetchAvatarAttachment(characterAvatarUrl);
                avatarOverride = `attachment://${avatarAttachment.name}`;
            } catch (error) {
                console.warn('[bot] Character approval DM avatar fetch failed.', error);
            }
        } else {
            avatarOverride = characterAvatarUrl;
        }
    }

    if (avatarOverride) {
        embed.setThumbnail(avatarOverride);
    }

    const buttons = new ActionRowBuilder();
    if (externalLink) {
        buttons.addComponents(
            new ButtonBuilder()
                .setLabel('Open external link')
                .setStyle(ButtonStyle.Link)
                .setURL(externalLink),
        );
    }
    if (charactersUrl) {
        buttons.addComponents(
            new ButtonBuilder()
                .setLabel('Your characters')
                .setStyle(ButtonStyle.Link)
                .setURL(charactersUrl),
        );
    }

    const payload = { embeds: [embed] };
    if (buttons.components.length > 0) {
        payload.components = [buttons];
    }
    if (avatarAttachment) {
        payload.files = [avatarAttachment];
    }

    try {
        await user.send(payload);
        return { ok: true, status: 200 };
    } catch {
        return { ok: false, status: 500, error: 'Failed to send DM.' };
    }
}

async function postCharacterApprovalAnnouncement({ client, channelId, payload }) {
    channelId = resolveChannelId(channelId);

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

    let avatarAttachment = null;
    let avatarOverride = null;
    const avatarUrl = payload?.character_avatar_url || '';
    if (avatarUrl && shouldAllowInsecure(avatarUrl)) {
        try {
            avatarAttachment = await fetchAvatarAttachment(avatarUrl);
            avatarOverride = `attachment://${avatarAttachment.name}`;
        } catch (error) {
            console.warn('[bot] Character approval avatar fetch failed.', error);
        }
    }

    const messagePayload = buildCharacterApprovalMessage(payload, { avatarUrlOverride: avatarOverride });
    if (avatarAttachment) {
        messagePayload.files = [avatarAttachment];
    }

    try {
        const message = await channel.send(messagePayload);
        return { ok: true, status: 200, message_id: message.id, channel_id: channel.id };
    } catch {
        return { ok: false, status: 500, error: 'Failed to post announcement.' };
    }
}

async function updateCharacterApprovalAnnouncement({ client, channelId, messageId, payload }) {
    channelId = resolveChannelId(channelId);

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

        let avatarAttachment = null;
        let avatarOverride = null;
        const avatarUrl = payload?.character_avatar_url || '';
        if (avatarUrl && shouldAllowInsecure(avatarUrl)) {
            try {
                avatarAttachment = await fetchAvatarAttachment(avatarUrl);
                avatarOverride = `attachment://${avatarAttachment.name}`;
            } catch (error) {
                console.warn('[bot] Character approval avatar fetch failed.', error);
            }
        }

        const messagePayload = buildCharacterApprovalMessage(payload, { avatarUrlOverride: avatarOverride });
        if (avatarAttachment) {
            messagePayload.files = [avatarAttachment];
        }
        await message.edit(messagePayload);
        return { ok: true, status: 200 };
    } catch {
        return { ok: false, status: 500, error: 'Failed to update announcement.' };
    }
}

async function deleteCharacterApprovalAnnouncement({ client, channelId, messageId }) {
    channelId = resolveChannelId(channelId);

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
        return { ok: true, status: 200, deleted: false, reason: 'Channel not found.' };
    }

    if (!channel?.isTextBased?.()) {
        return { ok: false, status: 422, error: 'Channel must be text-based.' };
    }

    try {
        const message = await channel.messages.fetch(String(messageId));
        if (!message) {
            return { ok: true, status: 200, deleted: false, reason: 'Message not found.' };
        }

        await message.delete();
        return { ok: true, status: 200, deleted: true };
    } catch {
        return { ok: true, status: 200, deleted: false, reason: 'Message not found.' };
    }
}

module.exports = {
    buildCharacterApprovalMessage,
    sendCharacterApprovalDm,
    postCharacterApprovalAnnouncement,
    updateCharacterApprovalAnnouncement,
    deleteCharacterApprovalAnnouncement,
};
