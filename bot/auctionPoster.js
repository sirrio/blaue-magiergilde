const { ChannelType } = require('discord.js');
const { attachRateLimitListener, waitForDiscordRateLimit } = require('./discordRateLimit');
const db = require('./db');

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
    return `**(${row.remaining_auctions})** - ${row.starting_bid} ${currency} - ${itemLabel} (${missing})`;
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
                ai.remaining_auctions,
                ai.starting_bid,
                ai.repair_current,
                ai.repair_max,
                ai.notes,
                i.name,
                i.url,
                i.rarity,
                i.type
            FROM auction_items ai
            INNER JOIN items i ON i.id = ai.item_id
            WHERE ai.auction_id = ?
              AND i.deleted_at IS NULL
            ORDER BY i.name ASC
        `,
        [auctionId],
    );
    return rows;
}

async function resolveDestination({ client, channelId, auction }) {
    let target;
    try {
        await waitForDiscordRateLimit(client);
        target = await client.channels.fetch(channelId);
    } catch (error) {
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
        } catch (error) {
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
    if (!line) return;
    await waitForDiscordRateLimit(destination.client);
    await destination.send(String(line));
}

async function sendLines(destination, lines) {
    for (const line of lines) {
        // eslint-disable-next-line no-await-in-loop
        await sendOneLine(destination, line);
    }
}

async function postAuctionToChannel({ client, channelId, auctionId }) {
    attachRateLimitListener(client);
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
    const createdAtUnix = Math.floor(new Date(auction.created_at).getTime() / 1000);
    const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(auction.created_at);
    await sendOneLine(destination, `**Auction #${String(auction.id).padStart(3, '0')}** - Created: ${createdAtText}`);

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

        await sendOneLine(destination, `## ${rarityDisplayName(rarity)}`);

        const lines = [];
        typeOrder.forEach((type) => {
            const rows = byType.get(type) ?? [];
            rows.forEach((row) => {
                lines.push(formatAuctionLine(row, auction.currency || 'GP'));
            });
        });
        await sendLines(destination, lines);
    }

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        auctionId: auction.id,
    };
}

module.exports = {
    postAuctionToChannel,
};
