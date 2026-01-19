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
    const notes = typeof row.notes === 'string' ? row.notes.trim() : '';
    const itemName = notes ? `${row.name} - ${notes}` : row.name;
    const itemLink = formatLink(itemName, row.url);
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

function normalizeMessageId(value) {
    if (value === null || value === undefined) return null;
    const id = String(value).trim();
    return id ? id : null;
}

function parsePostPayload(value) {
    if (!value) {
        return {
            legacyMessageIds: [],
            headerMessageIds: [],
            itemMessageIds: {},
            shopId: null,
        };
    }

    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            parsed = null;
        }
    }

    if (Array.isArray(parsed)) {
        return {
            legacyMessageIds: parsed.filter(Boolean).map(String),
            headerMessageIds: [],
            itemMessageIds: {},
            shopId: null,
        };
    }

    if (!parsed || typeof parsed !== 'object') {
        return {
            legacyMessageIds: [],
            headerMessageIds: [],
            itemMessageIds: {},
            shopId: null,
        };
    }

    const headerMessageIds = Array.isArray(parsed.header_message_ids)
        ? parsed.header_message_ids.map(normalizeMessageId).filter(Boolean)
        : [];

    const itemMessageIds = {};
    if (parsed.item_message_ids && typeof parsed.item_message_ids === 'object') {
        for (const [key, value] of Object.entries(parsed.item_message_ids)) {
            const messageId = normalizeMessageId(value);
            if (messageId) {
                itemMessageIds[String(key)] = messageId;
            }
        }
    }

    const shopId = Number(parsed.shop_id || 0) || null;

    return {
        legacyMessageIds: [],
        headerMessageIds,
        itemMessageIds,
        shopId,
    };
}

async function fetchShopPostState() {
    const [rows] = await db.execute(
        'SELECT id, last_post_channel_id, last_post_message_ids FROM shop_settings ORDER BY id ASC LIMIT 1',
    );
    if (!rows[0]) return null;
    const parsed = parsePostPayload(rows[0].last_post_message_ids);
    return {
        id: rows[0].id,
        lastPostChannelId: rows[0].last_post_channel_id,
        legacyMessageIds: parsed.legacyMessageIds,
        headerMessageIds: parsed.headerMessageIds,
        itemMessageIds: parsed.itemMessageIds,
        shopId: parsed.shopId,
    };
}

async function saveShopPostState({ settingsId, channelId, shopId, headerMessageIds, itemMessageIds }) {
    const payload = JSON.stringify({
        shop_id: shopId,
        header_message_ids: headerMessageIds ?? [],
        item_message_ids: itemMessageIds ?? {},
    });
    const timestamp = nowSql();

    if (!settingsId) {
        await db.execute(
            'INSERT INTO shop_settings (last_post_channel_id, last_post_message_ids, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [channelId, payload, timestamp, timestamp],
        );
        return;
    }

    await db.execute(
        'UPDATE shop_settings SET last_post_channel_id = ?, last_post_message_ids = ?, updated_at = ? WHERE id = ?',
        [channelId, payload, timestamp, settingsId],
    );
}

async function deletePreviousPosts({ client, settings }) {
    if (!settings?.lastPostChannelId) return;

    const allMessageIds = new Set(
        [
            ...(settings.legacyMessageIds || []),
            ...(settings.headerMessageIds || []),
            ...Object.values(settings.itemMessageIds || {}),
        ].filter(Boolean),
    );

    if (!allMessageIds.size) return;

    let channel;
    try {
        await waitForDiscordRateLimit(client);
        channel = await client.channels.fetch(settings.lastPostChannelId);
    } catch {
        return;
    }

    if (!channel?.isTextBased?.()) return;

    for (const messageId of allMessageIds) {
        try {
            await waitForDiscordRateLimit(client);
             
            await channel.messages.delete(messageId);
        } catch {
            // Ignore missing permissions or deleted messages.
        }
    }
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
                si.item_id,
                COALESCE(si.item_name, i.name) AS name,
                COALESCE(si.item_url, i.url) AS url,
                COALESCE(si.item_cost, i.cost) AS cost,
                COALESCE(si.item_rarity, i.rarity) AS rarity,
                COALESCE(si.item_type, i.type) AS type,
                si.notes,
                si.spell_id,
                COALESCE(si.spell_name, s.name) AS spell_name,
                COALESCE(si.spell_url, s.url) AS spell_url,
                COALESCE(si.spell_legacy_url, s.legacy_url) AS spell_legacy_url,
                COALESCE(si.spell_level, s.spell_level) AS spell_level
            FROM item_shop si
            LEFT JOIN items i ON i.id = si.item_id
            LEFT JOIN spells s ON s.id = si.spell_id
            WHERE si.shop_id = ?
            ORDER BY COALESCE(si.item_name, i.name) ASC
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
    const message = await destination.send(String(line));
    return message?.id ?? null;
}

async function sendLines(destination, lines) {
    const messageIds = [];
    for (const line of lines) {
         
        const messageId = await sendOneLine(destination, line);
        if (messageId) messageIds.push(messageId);
    }
    return messageIds;
}

async function sendItemLine(destination, row) {
    const line = formatItemLine(row);
    return sendOneLine(destination, line);
}

async function postShopToChannel({ client, channelId, shopId, threadName }) {
    attachRateLimitListener(client);
    const postState = await fetchShopPostState();
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
    const headerMessageIds = [];
    const itemMessageIds = {};

    await deletePreviousPosts({ client, settings: postState });

    const createdAtUnix = Math.floor(new Date(shop.created_at).getTime() / 1000);
    const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(shop.created_at);
    const headerId = await sendOneLine(destination, `**Shop #${String(shop.id).padStart(3, '0')}** - Rolled: ${createdAtText}`);
    if (headerId) headerMessageIds.push(headerId);

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

        const sectionId = await sendOneLine(destination, `## ***:crossed_swords: ${rarityLabel} Magic Items (${tierText}):***`);
        if (sectionId) headerMessageIds.push(sectionId);
        for (const row of byType.get('item') ?? []) {
             
            const messageId = await sendItemLine(destination, row);
            if (messageId) itemMessageIds[String(row.shop_item_id)] = messageId;
        }

        if (rarity === 'common' || rarity === 'uncommon') {
            const consumableHeaderId = await sendOneLine(destination, `### ${rarityLabel} Consumable`);
            if (consumableHeaderId) headerMessageIds.push(consumableHeaderId);
            for (const row of byType.get('consumable') ?? []) {
                 
                const messageId = await sendItemLine(destination, row);
                if (messageId) itemMessageIds[String(row.shop_item_id)] = messageId;
            }

            const scrollHeaderId = await sendOneLine(destination, `### ${rarityLabel} Spell Scroll`);
            if (scrollHeaderId) headerMessageIds.push(scrollHeaderId);
            for (const row of byType.get('spellscroll') ?? []) {
                 
                const messageId = await sendItemLine(destination, row);
                if (messageId) itemMessageIds[String(row.shop_item_id)] = messageId;
            }
        } else {
            const mixedHeaderId = await sendOneLine(destination, `### ${rarityLabel} Consumable/Spell Scroll`);
            if (mixedHeaderId) headerMessageIds.push(mixedHeaderId);
            for (const row of [...(byType.get('consumable') ?? []), ...(byType.get('spellscroll') ?? [])]) {
                 
                const messageId = await sendItemLine(destination, row);
                if (messageId) itemMessageIds[String(row.shop_item_id)] = messageId;
            }
        }
    }

    await saveShopPostState({
        settingsId: postState?.id ?? null,
        channelId: destination.id,
        shopId: shop.id,
        headerMessageIds,
        itemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        shopId: shop.id,
    };
}

async function updateShopPost({ client, shopId }) {
    attachRateLimitListener(client);
    const postState = await fetchShopPostState();
    if (!postState?.lastPostChannelId) {
        return { ok: false, status: 409, error: 'No previous shop post found.' };
    }

    if (!postState.itemMessageIds || Object.keys(postState.itemMessageIds).length === 0) {
        return { ok: false, status: 409, error: 'Previous shop post does not support updates. Re-post the shop.' };
    }

    if (postState.shopId && Number(postState.shopId) !== Number(shopId)) {
        return { ok: false, status: 409, error: `Last posted shop is #${postState.shopId}.` };
    }

    const shop = await fetchShop(shopId);
    if (!shop) {
        return { ok: false, status: 404, error: `Shop #${shopId} not found.` };
    }

    const items = await fetchShopItems(shop.id);
    if (items.length === 0) {
        return { ok: false, status: 422, error: `Shop #${shop.id} has no items.` };
    }

    let destination;
    try {
        await waitForDiscordRateLimit(client);
        destination = await client.channels.fetch(postState.lastPostChannelId);
    } catch {
        return { ok: false, status: 404, error: 'Destination channel not found.' };
    }

    if (!destination?.isTextBased?.()) {
        return { ok: false, status: 422, error: 'Destination channel is not text-based.' };
    }

    const updatedItemMessageIds = { ...postState.itemMessageIds };

    for (const row of items) {
        const messageId = updatedItemMessageIds[String(row.shop_item_id)];
        const content = formatItemLine(row);

        if (!messageId) {
             
            const newMessageId = await sendOneLine(destination, content);
            if (newMessageId) {
                updatedItemMessageIds[String(row.shop_item_id)] = newMessageId;
            }
            continue;
        }

        try {
            await waitForDiscordRateLimit(client);
             
            await destination.messages.edit(messageId, content);
        } catch {
             
            const fallbackId = await sendOneLine(destination, content);
            if (fallbackId) {
                updatedItemMessageIds[String(row.shop_item_id)] = fallbackId;
            }
        }
    }

    await saveShopPostState({
        settingsId: postState.id ?? null,
        channelId: postState.lastPostChannelId,
        shopId: shop.id,
        headerMessageIds: postState.headerMessageIds ?? [],
        itemMessageIds: updatedItemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        shopId: shop.id,
    };
}

module.exports = {
    postShopToChannel,
    updateShopPost,
};
