const { ChannelType } = require('discord.js');
const { attachRateLimitListener, waitForDiscordRateLimit } = require('./discordRateLimit');
const db = require('./db');

function nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function missingPermissions(permissions, required) {
    return required.filter(perm => !permissions?.has(perm));
}

function formatPermissionList(perms) {
    const names = {
        ViewChannel: 'View Channel',
        SendMessages: 'Send Messages',
        SendMessagesInThreads: 'Send Messages in Threads',
        CreatePublicThreads: 'Create Public Threads',
        ManageThreads: 'Manage Threads',
    };
    return perms.map(p => `- ${names[p] || p}`).join('\n');
}

function rarityDisplayName(rarity) {
    switch (rarity) {
        case 'very_rare':
            return 'Very Rare';
        case 'rare':
            return 'Rare';
        case 'uncommon':
            return 'Uncommon';
        case 'common':
        default:
            return 'Common';
    }
}

function formatLink(name, url) {
    if (!url) return String(name ?? '');
    return `[${name}](<${url}>)`;
}

function getBidStep(row) {
    let baseStep = 10;
    if (row.rarity === 'uncommon') baseStep = 50;
    if (row.rarity === 'rare') baseStep = 100;
    if (row.rarity === 'very_rare') baseStep = 500;

    if (row.type === 'consumable' || row.type === 'spellscroll') {
        baseStep = Math.floor(baseStep / 2);
    }

    return Math.max(1, baseStep);
}

function getStartingBid(row) {
    const step = getBidStep(row);
    const repairCurrent = Number(row.repair_current);
    const currentValue = Number.isFinite(repairCurrent) ? repairCurrent : 0;
    const halfRepair = Math.ceil(currentValue / 2);
    return Math.ceil(halfRepair / step) * step;
}

function getRepairMissing(row) {
    const repairMax = Number(row.repair_max);
    const repairCurrent = Number(row.repair_current);
    const maxValue = Number.isFinite(repairMax) ? repairMax : 0;
    const currentValue = Number.isFinite(repairCurrent) ? repairCurrent : 0;
    return Math.max(0, maxValue - currentValue);
}

function formatAuctionLine(row, currency) {
    const notes = row.notes ? String(row.notes).trim() : '';
    const displayName = notes ? `${row.name} - ${notes}` : row.name;
    const itemLabel = formatLink(displayName, row.url);
    const missing = getRepairMissing(row);
    const startingBid = getStartingBid(row);
    const baseLine = `**(${row.remaining_auctions})** - ${startingBid} ${currency} - ${itemLabel} (${missing})`;
    if (!row.sold_at) {
        return baseLine;
    }
    const soldDetails = row.sold_amount
        ? ` (${row.sold_amount} ${currency}${row.sold_bidder_name ? ` · ${row.sold_bidder_name}` : ''})`
        : (row.sold_bidder_name ? ` (${row.sold_bidder_name})` : '');
    return `~~${baseLine}~~ ✅ SOLD${soldDetails}`;
}

function parseMessageIds(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
        return [];
    }
    return [];
}

function parseItemMessageMap(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch {
        return {};
    }
    return {};
}

async function fetchAuctionPostState() {
    const [rows] = await db.execute(
        'SELECT id, last_post_channel_id, last_post_message_ids, last_post_item_message_ids FROM auction_settings ORDER BY id ASC LIMIT 1',
    );
    if (!rows[0]) return null;
    return {
        id: rows[0].id,
        lastPostChannelId: rows[0].last_post_channel_id,
        lastPostMessageIds: parseMessageIds(rows[0].last_post_message_ids),
        lastPostItemMessageIds: parseItemMessageMap(rows[0].last_post_item_message_ids),
    };
}

async function saveAuctionPostState({ settingsId, channelId, messageIds, itemMessageIds }) {
    const payload = JSON.stringify(messageIds ?? []);
    const itemPayload = JSON.stringify(itemMessageIds ?? {});
    const timestamp = nowSql();

    if (!settingsId) {
        await db.execute(
            'INSERT INTO auction_settings (last_post_channel_id, last_post_message_ids, last_post_item_message_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [channelId, payload, itemPayload, timestamp, timestamp],
        );
        return;
    }

    await db.execute(
        'UPDATE auction_settings SET last_post_channel_id = ?, last_post_message_ids = ?, last_post_item_message_ids = ?, updated_at = ? WHERE id = ?',
        [channelId, payload, itemPayload, timestamp, settingsId],
    );
}

async function deletePreviousPosts({ client, settings }) {
    if (!settings?.lastPostChannelId || !settings?.lastPostMessageIds?.length) return;

    let channel;
    try {
        await waitForDiscordRateLimit(client);
        channel = await client.channels.fetch(settings.lastPostChannelId);
    } catch {
        return;
    }

    if (!channel?.isTextBased?.()) return;

    for (const messageId of settings.lastPostMessageIds) {
        try {
            await waitForDiscordRateLimit(client);
             
            await channel.messages.delete(messageId);
        } catch {
            // Ignore missing permissions or deleted messages.
        }
    }
}

async function fetchAuction(auctionId) {
    const [rows] = await db.execute(
        'SELECT id, created_at, currency FROM auctions WHERE id = ? LIMIT 1',
        [auctionId],
    );
    return rows[0] ?? null;
}

async function fetchAuctionItems(auctionId) {
    const [rows] = await db.execute(
        `
            SELECT
                ai.id AS auction_item_id,
                ai.remaining_auctions,
                ai.repair_current,
                ai.repair_max,
                ai.notes,
                ai.sold_at,
                ai.sold_bid_id,
                COALESCE(ai.item_name, i.name) AS name,
                COALESCE(ai.item_url, i.url) AS url,
                COALESCE(ai.item_cost, i.cost) AS cost,
                COALESCE(ai.item_rarity, i.rarity) AS rarity,
                COALESCE(ai.item_type, i.type) AS type,
                b.bidder_name AS sold_bidder_name,
                b.bidder_discord_id AS sold_bidder_discord_id,
                b.amount AS sold_amount
            FROM auction_items ai
            LEFT JOIN items i ON i.id = ai.item_id
            LEFT JOIN auction_bids b ON b.id = ai.sold_bid_id
            WHERE ai.auction_id = ?
            ORDER BY COALESCE(ai.item_name, i.name) ASC
        `,
        [auctionId],
    );
    return rows;
}

async function fetchAuctionItemById(auctionItemId) {
    const [rows] = await db.execute(
        `
            SELECT
                ai.id AS auction_item_id,
                ai.auction_id,
                ai.remaining_auctions,
                ai.repair_current,
                ai.repair_max,
                ai.notes,
                ai.sold_at,
                ai.sold_bid_id,
                COALESCE(ai.item_name, i.name) AS name,
                COALESCE(ai.item_url, i.url) AS url,
                COALESCE(ai.item_cost, i.cost) AS cost,
                COALESCE(ai.item_rarity, i.rarity) AS rarity,
                COALESCE(ai.item_type, i.type) AS type,
                b.bidder_name AS sold_bidder_name,
                b.bidder_discord_id AS sold_bidder_discord_id,
                b.amount AS sold_amount,
                a.currency AS auction_currency
            FROM auction_items ai
            LEFT JOIN items i ON i.id = ai.item_id
            LEFT JOIN auction_bids b ON b.id = ai.sold_bid_id
            INNER JOIN auctions a ON a.id = ai.auction_id
            WHERE ai.id = ?
            LIMIT 1
        `,
        [auctionItemId],
    );

    return rows[0] ?? null;
}

async function updateAuctionItemPost({ client, auctionItemId }) {
    const postState = await fetchAuctionPostState();
    if (!postState?.lastPostChannelId) {
        return { ok: false, status: 404, error: 'No auction post channel configured.' };
    }

    const row = await fetchAuctionItemById(auctionItemId);
    if (!row) {
        return { ok: false, status: 404, error: 'Auction item not found.' };
    }

    const messageId = postState.lastPostItemMessageIds?.[String(auctionItemId)];
    if (!messageId) {
        return { ok: false, status: 404, error: 'Auction post message not found.' };
    }

    let channel;
    try {
        await waitForDiscordRateLimit(client);
        channel = await client.channels.fetch(postState.lastPostChannelId);
    } catch {
        return { ok: false, status: 404, error: 'Channel not found.' };
    }

    if (!channel?.isTextBased?.()) {
        return { ok: false, status: 422, error: 'Channel is not text based.' };
    }

    try {
        await waitForDiscordRateLimit(client);
        const message = await channel.messages.fetch(messageId);
        if (!message) {
            return { ok: false, status: 404, error: 'Message not found.' };
        }
        await waitForDiscordRateLimit(client);
        await message.edit(formatAuctionLine(row, row.auction_currency || 'GP'));
    } catch {
        return { ok: false, status: 500, error: 'Failed to update auction post.' };
    }

    return { ok: true, auctionItemId };
}
async function resolveDestination({ client, channelId, auction }) {
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
        const missing = missingPermissions(perms, [
            'ViewChannel',
            'SendMessages',
            'CreatePublicThreads',
            'SendMessagesInThreads',
        ]);
        if (missing.length > 0) {
            return {
                error: `Missing bot permissions:\n${formatPermissionList(missing)}`,
                status: 403,
            };
        }

        const dateForName = new Date(auction.created_at).toISOString().slice(0, 10);
        const defaultThreadName = `Auction #${String(auction.id).padStart(3, '0')} - ${dateForName}`;

        await waitForDiscordRateLimit(client);
        const thread = await target.threads.create({
            name: defaultThreadName.slice(0, 100),
            autoArchiveDuration: 1440,
            type: ChannelType.PublicThread,
        });

        return { destination: thread, target };
    }

    if (!target.isThread?.()) {
        return { error: 'Channel must be a text channel or thread.', status: 422 };
    }

    const perms = target.permissionsFor(botMember);
    const missing = missingPermissions(perms, ['ViewChannel', 'SendMessagesInThreads']);
    if (missing.length > 0) {
        return {
            error: `Missing bot permissions:\n${formatPermissionList(missing)}`,
            status: 403,
        };
    }

    if (target.type === ChannelType.PrivateThread) {
        try {
            await waitForDiscordRateLimit(client);
            await target.members.fetch(botMember.id);
        } catch {
            return {
                error: 'Bot is not a member of the private thread.',
                status: 403,
            };
        }
    }

    if (target.locked) {
        return { error: 'Thread is locked.', status: 422 };
    }

    return { destination: target, target };
}

async function sendOneLine(destination, line) {
    if (!line) return null;
    await waitForDiscordRateLimit(destination.client);
    const message = await destination.send(String(line));
    return message?.id ?? null;
}

async function sendLines(destination, lines) {
    const messageIds = [];
    const itemMessageIds = {};
    for (const line of lines) {
        const messageId = await sendOneLine(destination, line.text);
        if (messageId) {
            messageIds.push(messageId);
            if (line.auctionItemId) {
                itemMessageIds[String(line.auctionItemId)] = messageId;
            }
        }
    }
    return { messageIds, itemMessageIds };
}

async function postAuctionToChannel({ client, channelId, auctionId }) {
    attachRateLimitListener(client);
    const postState = await fetchAuctionPostState();
    const auction = await fetchAuction(auctionId);
    if (!auction) {
        return { ok: false, status: 404, error: `Auction #${auctionId} not found.` };
    }

    const items = await fetchAuctionItems(auction.id);
    if (items.length === 0) {
        return { ok: false, status: 422, error: `Auction #${auction.id} has no items.` };
    }

    const destinationResult = await resolveDestination({ client, channelId, auction });
    if (!destinationResult.destination) {
        return { ok: false, status: destinationResult.status || 422, error: destinationResult.error };
    }

    const destination = destinationResult.destination;
    const messageIds = [];
    const itemMessageIds = {};

    await deletePreviousPosts({ client, settings: postState });

    const createdAtUnix = Math.floor(new Date(auction.created_at).getTime() / 1000);
    const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(auction.created_at);
    const headerId = await sendOneLine(destination, `**Auction #${String(auction.id).padStart(3, '0')}** - Created: ${createdAtText}`);
    if (headerId) messageIds.push(headerId);

    const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare'];
    const typeOrder = ['item', 'consumable', 'spellscroll'];
    const grouped = new Map();

    for (const row of items) {
        const rarity = row.rarity ?? 'common';
        const type = row.type ?? 'item';
        if (!grouped.has(rarity)) grouped.set(rarity, new Map());
        const byType = grouped.get(rarity);
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type).push(row);
    }

    for (const rarity of rarityOrder) {
        const byType = grouped.get(rarity);
        if (!byType) continue;

        for (const type of typeOrder) {
            const rows = byType.get(type);
            if (rows) rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }

        const sectionId = await sendOneLine(destination, `## ${rarityDisplayName(rarity)}`);
        if (sectionId) messageIds.push(sectionId);

        const lines = [];
        typeOrder.forEach((type) => {
            const rows = byType.get(type) ?? [];
            rows.forEach((row) => {
                lines.push({
                    auctionItemId: row.auction_item_id,
                    text: formatAuctionLine(row, auction.currency || 'GP'),
                });
            });
        });
        const { messageIds: lineMessageIds, itemMessageIds: lineItemMap } = await sendLines(destination, lines);
        messageIds.push(...lineMessageIds);
        Object.assign(itemMessageIds, lineItemMap);
    }

    const updateUnix = Math.floor(Date.now() / 1000);
    const updateId = await sendOneLine(destination, `# :exclamation: Letzte aktuallisierung <t:${updateUnix}:R> :exclamation:`);
    if (updateId) messageIds.push(updateId);

    await saveAuctionPostState({
        settingsId: postState?.id ?? null,
        channelId: destination.id,
        messageIds,
        itemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        auctionId: auction.id,
    };
}

module.exports = {
    postAuctionToChannel,
    updateAuctionItemPost,
    fetchAuctionItemById,
};
