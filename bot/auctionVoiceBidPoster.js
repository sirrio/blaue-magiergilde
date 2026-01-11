const { ChannelType } = require('discord.js');
const { attachRateLimitListener, waitForDiscordRateLimit } = require('./discordRateLimit');
const db = require('./db');

function nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function parseMessageMap(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

async function fetchVoiceBidState() {
    const [rows] = await db.execute(
        'SELECT id, last_voice_bid_message_ids FROM auction_settings ORDER BY id ASC LIMIT 1',
    );
    if (!rows[0]) return null;
    return {
        id: rows[0].id,
        messageMap: parseMessageMap(rows[0].last_voice_bid_message_ids),
    };
}

async function saveVoiceBidState({ settingsId, messageMap }) {
    const payload = JSON.stringify(messageMap ?? {});
    const timestamp = nowSql();

    if (!settingsId) {
        await db.execute(
            'INSERT INTO auction_settings (last_voice_bid_message_ids, created_at, updated_at) VALUES (?, ?, ?)',
            [payload, timestamp, timestamp],
        );
        return;
    }

    await db.execute(
        'UPDATE auction_settings SET last_voice_bid_message_ids = ?, updated_at = ? WHERE id = ?',
        [payload, timestamp, settingsId],
    );
}

async function fetchAuctionItemInfo(auctionItemId) {
    const [rows] = await db.execute(
        `
            SELECT
                ai.id,
                ai.notes,
                a.currency,
                i.name
            FROM auction_items ai
            INNER JOIN auctions a ON a.id = ai.auction_id
            INNER JOIN items i ON i.id = ai.item_id
            WHERE ai.id = ?
            LIMIT 1
        `,
        [auctionItemId],
    );
    return rows[0] ?? null;
}

function missingPermissions(permissions, required) {
    return required.filter(perm => !permissions?.has(perm));
}

function formatPermissionList(perms) {
    const names = {
        ViewChannel: 'View Channel',
        SendMessages: 'Send Messages',
        SendMessagesInThreads: 'Send Messages in Threads',
    };
    return perms.map(p => `- ${names[p] || p}`).join('\n');
}

async function resolveDestination({ client, channelId }) {
    let target;
    try {
        await waitForDiscordRateLimit(client);
        target = await client.channels.fetch(channelId);
    } catch {
        return { error: 'Channel not found.', status: 404 };
    }

    if (!target || !target.guild) {
        return { error: 'Channel must belong to a guild.', status: 422 };
    }

    await waitForDiscordRateLimit(client);
    const botMember = target.guild.members.me ?? await target.guild.members.fetchMe();

    if (target.type === ChannelType.GuildText || target.type === ChannelType.GuildAnnouncement) {
        const perms = target.permissionsFor(botMember);
        const missing = missingPermissions(perms, ['ViewChannel', 'SendMessages']);
        if (missing.length > 0) {
            return {
                error: `Missing bot permissions:\n${formatPermissionList(missing)}`,
                status: 403,
            };
        }
        return { destination: target };
    }

    if (target.isThread?.()) {
        const perms = target.permissionsFor(botMember);
        const missing = missingPermissions(perms, ['ViewChannel', 'SendMessagesInThreads']);
        if (missing.length > 0) {
            return {
                error: `Missing bot permissions:\n${formatPermissionList(missing)}`,
                status: 403,
            };
        }
        return { destination: target };
    }

    if (!target.isTextBased?.()) {
        return { error: 'Channel must support messages.', status: 422 };
    }

    const perms = target.permissionsFor(botMember);
    const missing = missingPermissions(perms, ['ViewChannel', 'SendMessages']);
    if (missing.length > 0) {
        return {
            error: `Missing bot permissions:\n${formatPermissionList(missing)}`,
            status: 403,
        };
    }

    return { destination: target };
}

async function deleteMessage({ client, channelId, messageId }) {
    if (!channelId || !messageId) return;
    try {
        await waitForDiscordRateLimit(client);
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased?.()) return;
        await waitForDiscordRateLimit(client);
        await channel.messages.delete(messageId);
    } catch {
        // ignore missing permissions or deleted messages
    }
}

async function sendOneLine(destination, line) {
    if (!line) return null;
    await waitForDiscordRateLimit(destination.client);
    const message = await destination.send(String(line));
    return message?.id ?? null;
}

async function postVoiceHighestBid({
    client,
    channelId,
    auctionItemId,
    bidderDiscordId,
    bidderName,
    amount,
    clear,
}) {
    attachRateLimitListener(client);

    const postState = await fetchVoiceBidState();
    const messageMap = postState?.messageMap ?? {};
    const existing = messageMap[String(auctionItemId)];

    if (clear) {
        if (existing?.message_id) {
            await deleteMessage({
                client,
                channelId: existing.channel_id || channelId,
                messageId: existing.message_id,
            });
        }
        delete messageMap[String(auctionItemId)];
        await saveVoiceBidState({
            settingsId: postState?.id ?? null,
            messageMap,
        });
        return { ok: true, cleared: true };
    }

    if (!bidderDiscordId || !/^[0-9]{5,}$/.test(String(bidderDiscordId))) {
        return { ok: false, status: 422, error: 'Invalid bidder_discord_id.' };
    }

    const info = await fetchAuctionItemInfo(auctionItemId);
    if (!info) {
        return { ok: false, status: 404, error: 'Auction item not found.' };
    }

    const destinationResult = await resolveDestination({ client, channelId });
    if (!destinationResult.destination) {
        return { ok: false, status: destinationResult.status || 422, error: destinationResult.error };
    }

    if (existing?.message_id) {
        await deleteMessage({
            client,
            channelId: existing.channel_id || channelId,
            messageId: existing.message_id,
        });
    }

    const notes = info.notes ? String(info.notes).trim() : '';
    const itemLabel = notes ? `${info.name} - ${notes}` : info.name;
    const currency = info.currency || 'GP';
    const mention = `<@${bidderDiscordId}>`;
    const bidderLabel = bidderName ? ` (${bidderName})` : '';
    const line = `🏆 Highest bid for **${itemLabel}**: ${mention}${bidderLabel} - ${amount} ${currency}`;

    const messageId = await sendOneLine(destinationResult.destination, line);
    if (!messageId) {
        return { ok: false, status: 500, error: 'Failed to post highest bid.' };
    }

    messageMap[String(auctionItemId)] = {
        channel_id: destinationResult.destination.id,
        message_id: messageId,
    };

    await saveVoiceBidState({
        settingsId: postState?.id ?? null,
        messageMap,
    });

    return { ok: true, message_id: messageId };
}

module.exports = {
    postVoiceHighestBid,
};
