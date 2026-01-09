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

function tierRequirementForRarity(rarity) {
    switch (rarity) {
        case 'common':
        case 'uncommon':
            return 'Ab Low Tier';
        case 'rare':
            return 'Ab High Tier';
        case 'very_rare':
            return 'Ab Epic Tier';
        default:
            return '';
    }
}

function formatLink(name, url) {
    if (!url) return String(name ?? '');
    return `[${name}](<${url}>)`;
}

function formatItemLine(row) {
    const itemLink = formatLink(row.name, row.url);
    const parts = [itemLink];

    if (row.spell_id) {
        const spellPrimaryUrl = row.spell_url || row.spell_legacy_url;
        const spellLink = formatLink(row.spell_name, spellPrimaryUrl);
        parts.push(spellLink);

        if (row.spell_legacy_url && row.spell_legacy_url !== spellPrimaryUrl) {
            parts.push(formatLink('Legacy', row.spell_legacy_url));
        }
    }

    const prefix = parts.join(' - ');
    const cost = row.cost ? `: ${row.cost}` : '';
    return `${prefix}${cost}`;
}

async function fetchShop(shopId) {
    const [rows] = await db.execute('SELECT id, created_at FROM shops WHERE id = ? LIMIT 1', [shopId]);
    return rows[0] ?? null;
}

async function fetchShopItems(shopId) {
    const [rows] = await db.execute(
        `
            SELECT
                si.id AS shop_item_id,
                i.id AS item_id,
                i.name,
                i.url,
                i.cost,
                i.rarity,
                i.type,
                s.id AS spell_id,
                s.name AS spell_name,
                s.url AS spell_url,
                s.legacy_url AS spell_legacy_url,
                s.spell_level
            FROM item_shop si
            INNER JOIN items i ON i.id = si.item_id
            LEFT JOIN spells s ON s.id = si.spell_id
            WHERE si.shop_id = ?
              AND i.deleted_at IS NULL
            ORDER BY i.name ASC
        `,
        [shopId],
    );

    return rows;
}

async function resolveDestination({ client, channelId, shop, threadName }) {
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

        const dateForName = new Date(shop.created_at).toISOString().slice(0, 10);
        const defaultThreadName = `Shop #${String(shop.id).padStart(3, '0')} - ${dateForName}`;
        const resolvedThreadName = (threadName || defaultThreadName).slice(0, 100);

        await waitForDiscordRateLimit(client);
        const thread = await target.threads.create({
            name: resolvedThreadName,
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

async function postShopToChannel({ client, channelId, shopId, threadName }) {
    attachRateLimitListener(client);
    const shop = await fetchShop(shopId);
    if (!shop) {
        return { ok: false, status: 404, error: `Shop #${shopId} not found.` };
    }

    const items = await fetchShopItems(shop.id);
    if (items.length === 0) {
        return { ok: false, status: 422, error: `Shop #${shop.id} has no items.` };
    }

    const destinationResult = await resolveDestination({ client, channelId, shop, threadName });
    if (!destinationResult.destination) {
        return { ok: false, status: destinationResult.status || 422, error: destinationResult.error };
    }

    const destination = destinationResult.destination;

    const createdAtUnix = Math.floor(new Date(shop.created_at).getTime() / 1000);
    const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(shop.created_at);
    await sendOneLine(destination, `**Shop #${String(shop.id).padStart(3, '0')}** - Rolled: ${createdAtText}`);

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

        const rarityLabel = rarityDisplayName(rarity);
        const tierText = tierRequirementForRarity(rarity);

        for (const type of typeOrder) {
            const rows = byType.get(type);
            if (rows) rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }

        await sendOneLine(destination, `## ***?? ${rarityLabel} Magic Items (${tierText}):***`);
        await sendLines(destination, (byType.get('item') ?? []).map(formatItemLine));

        const consumableLines = (byType.get('consumable') ?? []).map(formatItemLine);
        const scrollLines = (byType.get('spellscroll') ?? []).map(formatItemLine);

        if (rarity === 'common' || rarity === 'uncommon') {
            await sendOneLine(destination, `### ${rarityLabel} Consumable`);
            await sendLines(destination, consumableLines);

            await sendOneLine(destination, `### ${rarityLabel} Spell Scroll`);
            await sendLines(destination, scrollLines);
        } else {
            await sendOneLine(destination, `### ${rarityLabel} Consumable/Spell Scroll`);
            await sendLines(destination, [...consumableLines, ...scrollLines]);
        }
    }

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        shopId: shop.id,
    };
}

module.exports = {
    postShopToChannel,
};
