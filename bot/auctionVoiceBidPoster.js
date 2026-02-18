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
                i.name,
                sb.bidder_discord_id AS sold_bidder_discord_id,
                sb.bidder_name AS sold_bidder_name,
                sb.amount AS sold_amount
            FROM auction_items ai
            INNER JOIN auctions a ON a.id = ai.auction_id
            INNER JOIN items i ON i.id = ai.item_id
            LEFT JOIN auction_bids sb ON sb.id = ai.sold_bid_id
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

async function editMessage({ client, channelId, messageId, line }) {
    if (!channelId || !messageId || !line) return false;
    try {
        await waitForDiscordRateLimit(client);
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased?.()) return false;
        await waitForDiscordRateLimit(client);
        const message = await channel.messages.fetch(messageId);
        if (!message) return false;
        await waitForDiscordRateLimit(client);
        await message.edit(String(line));
        return true;
    } catch {
        return false;
    }
}

function formatAuctionVoiceLine({
    itemLabel,
    currency,
    bidderDiscordId,
    bidderName,
    amount,
    sold,
}) {
    const hasDiscordId = bidderDiscordId && /^[0-9]{5,}$/.test(String(bidderDiscordId));
    const mention = hasDiscordId ? `<@${bidderDiscordId}>` : '';
    const nameSuffix = bidderName ? (mention ? ` (${bidderName})` : bidderName) : '';
    const bidderLabel = mention ? `${mention}${nameSuffix}` : (nameSuffix || 'Unknown bidder');
    const amountSuffix = Number.isFinite(amount) && amount > 0 ? ` - ${amount} ${currency}` : '';

    if (sold) {
        return `✅ Sold **${itemLabel}**: ${bidderLabel}${amountSuffix}`;
    }

    return `🏆 Highest bid for **${itemLabel}**: ${bidderLabel}${amountSuffix}`;
}

async function postVoiceHighestBid({
    client,
    channelId,
    auctionItemId,
    bidderDiscordId,
    bidderName,
    amount,
    clear,
    sold,
}) {
    attachRateLimitListener(client);

    const postState = await fetchVoiceBidState();
    const messageMap = postState?.messageMap ?? {};
    const existing = messageMap[String(auctionItemId)];
    const shouldClear = Boolean(clear);
    const soldState = Boolean(sold);

    if (shouldClear) {
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

    const info = await fetchAuctionItemInfo(auctionItemId);
    if (!info) {
        return { ok: false, status: 404, error: 'Auction item not found.' };
    }

    const effectiveBidderDiscordId = bidderDiscordId || (soldState ? String(info.sold_bidder_discord_id || '') : '');
    const effectiveBidderName = bidderName || (soldState ? String(info.sold_bidder_name || '') : '');
    const rawAmount = Number(amount || 0);
    const soldAmount = Number(info.sold_amount || 0);
    const effectiveAmount = Number.isFinite(rawAmount) && rawAmount > 0
        ? rawAmount
        : (Number.isFinite(soldAmount) && soldAmount > 0 ? soldAmount : 0);

    if (!soldState && (!effectiveBidderDiscordId || !/^[0-9]{5,}$/.test(String(effectiveBidderDiscordId)))) {
        return { ok: false, status: 422, error: 'Invalid bidder_discord_id.' };
    }

    if (!soldState && (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0)) {
        return { ok: false, status: 422, error: 'Invalid amount.' };
    }

    const effectiveChannelId = channelId || existing?.channel_id || '';
    if (!effectiveChannelId) {
        return { ok: false, status: 404, error: 'No destination channel available.' };
    }

    const destinationResult = await resolveDestination({ client, channelId: effectiveChannelId });
    if (!destinationResult.destination) {
        return { ok: false, status: destinationResult.status || 422, error: destinationResult.error };
    }

    const notes = info.notes ? String(info.notes).trim() : '';
    const itemLabel = notes ? `${info.name} - ${notes}` : info.name;
    const currency = info.currency || 'GP';
    const line = formatAuctionVoiceLine({
        itemLabel,
        currency,
        bidderDiscordId: effectiveBidderDiscordId,
        bidderName: effectiveBidderName,
        amount: effectiveAmount,
        sold: soldState,
    });

    if (existing?.message_id && soldState) {
        const didEdit = await editMessage({
            client,
            channelId: existing.channel_id || effectiveChannelId,
            messageId: existing.message_id,
            line,
        });
        if (didEdit) {
            messageMap[String(auctionItemId)] = {
                channel_id: existing.channel_id || effectiveChannelId,
                message_id: existing.message_id,
            };

            await saveVoiceBidState({
                settingsId: postState?.id ?? null,
                messageMap,
            });

            return { ok: true, message_id: existing.message_id, updated: true };
        }
    }

    if (existing?.message_id && !soldState) {
        await deleteMessage({
            client,
            channelId: existing.channel_id || effectiveChannelId,
            messageId: existing.message_id,
        });
    }

    const messageId = await sendOneLine(destinationResult.destination, line);
    if (!messageId) {
        return { ok: false, status: 500, error: soldState ? 'Failed to post sold status.' : 'Failed to post highest bid.' };
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
    formatAuctionVoiceLine,
    postVoiceHighestBid,
};
