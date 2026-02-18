const { ChannelType } = require('discord.js');
const { attachRateLimitListener, waitForDiscordRateLimit } = require('./discordRateLimit');
const db = require('./db');
const { resolveOperationId, updateOperationProgress } = require('./operationProgress');

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

function formatBackstockLine(row) {
    const notes = row.notes ? String(row.notes).trim() : '';
    const displayName = notes ? `${row.name} - ${notes}` : row.name;
    const itemLabel = formatLink(displayName, row.url);
    const cost = row.cost ? `: ${row.cost}` : '';
    return `${itemLabel}${cost}`;
}

function normalizeMessageId(value) {
    if (value === null || value === undefined) return null;
    const id = String(value).trim();
    return id ? id : null;
}

function parseItemMessageMap(value) {
    if (!value) return {};
    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            return {};
        }
    }

    if (!parsed || typeof parsed !== 'object') return {};

    const map = {};
    for (const [key, entryValue] of Object.entries(parsed)) {
        const messageId = normalizeMessageId(entryValue);
        if (messageId) {
            map[String(key)] = messageId;
        }
    }

    return map;
}

function parseBackstockPostPayload(value) {
    if (!value) {
        return {
            messageIds: [],
            itemMessageIds: {},
        };
    }

    if (Array.isArray(value)) {
        return {
            messageIds: value.filter(Boolean).map(String),
            itemMessageIds: {},
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
            messageIds: parsed.filter(Boolean).map(String),
            itemMessageIds: {},
        };
    }

    if (!parsed || typeof parsed !== 'object') {
        return {
            messageIds: [],
            itemMessageIds: {},
        };
    }

    const messageIds = Array.isArray(parsed.message_ids)
        ? parsed.message_ids.map(normalizeMessageId).filter(Boolean)
        : [];

    const itemMessageIds = parseItemMessageMap(parsed.item_message_ids);

    return {
        messageIds,
        itemMessageIds,
    };
}

async function fetchBackstockPostState() {
    const [rows] = await db.execute(
        'SELECT id, last_post_channel_id, last_post_message_ids, last_post_item_message_ids FROM backstock_settings ORDER BY id ASC LIMIT 1',
    );
    if (!rows[0]) return null;
    const parsed = parseBackstockPostPayload(rows[0].last_post_message_ids);
    const itemMessageIds = parseItemMessageMap(rows[0].last_post_item_message_ids);
    return {
        id: rows[0].id,
        lastPostChannelId: rows[0].last_post_channel_id,
        lastPostMessageIds: parsed.messageIds,
        lastPostItemMessageIds: Object.keys(itemMessageIds).length > 0 ? itemMessageIds : parsed.itemMessageIds,
    };
}

async function saveBackstockPostState({ settingsId, channelId, messageIds, itemMessageIds }) {
    const payload = JSON.stringify(messageIds ?? []);
    const itemPayload = JSON.stringify(itemMessageIds ?? {});
    const timestamp = nowSql();

    if (!settingsId) {
        await db.execute(
            'INSERT INTO backstock_settings (last_post_channel_id, last_post_message_ids, last_post_item_message_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [channelId, payload, itemPayload, timestamp, timestamp],
        );
        return;
    }

    await db.execute(
        'UPDATE backstock_settings SET last_post_channel_id = ?, last_post_message_ids = ?, last_post_item_message_ids = ?, updated_at = ? WHERE id = ?',
        [channelId, payload, itemPayload, timestamp, settingsId],
    );
}

async function deletePreviousPosts({ client, settings, onProgress }) {
    if (!settings?.lastPostChannelId || !settings?.lastPostMessageIds?.length) return { total: 0, processed: 0 };

    let channel;
    try {
        await waitForDiscordRateLimit(client);
        channel = await client.channels.fetch(settings.lastPostChannelId);
    } catch {
        return { total: settings.lastPostMessageIds.length, processed: 0 };
    }

    if (!channel?.isTextBased?.()) return { total: settings.lastPostMessageIds.length, processed: 0 };

    let processed = 0;
    for (const messageId of settings.lastPostMessageIds) {
        try {
            await waitForDiscordRateLimit(client);
             
            await channel.messages.delete(messageId);
        } catch {
            // Ignore missing permissions or deleted messages.
        } finally {
            processed += 1;
            if (typeof onProgress === 'function') {
                await onProgress({ processed, total: settings.lastPostMessageIds.length });
            }
        }
    }

    return { total: settings.lastPostMessageIds.length, processed };
}

async function fetchBackstockItems() {
    const [rows] = await db.execute(
        `
            SELECT
                bi.id,
                bi.notes,
                COALESCE(bi.item_name, i.name) AS name,
                COALESCE(bi.item_url, i.url) AS url,
                COALESCE(bi.item_cost, i.cost) AS cost,
                COALESCE(bi.item_rarity, i.rarity) AS rarity,
                COALESCE(bi.item_type, i.type) AS type
            FROM backstock_items bi
            LEFT JOIN items i ON i.id = bi.item_id
            ORDER BY COALESCE(bi.item_name, i.name) ASC
        `,
    );
    return rows;
}

async function fetchBackstockItemById(backstockItemId) {
    const [rows] = await db.execute(
        `
            SELECT
                bi.id,
                bi.notes,
                COALESCE(bi.item_name, i.name) AS name,
                COALESCE(bi.item_url, i.url) AS url,
                COALESCE(bi.item_cost, i.cost) AS cost,
                COALESCE(bi.item_rarity, i.rarity) AS rarity,
                COALESCE(bi.item_type, i.type) AS type
            FROM backstock_items bi
            LEFT JOIN items i ON i.id = bi.item_id
            WHERE bi.id = ?
            LIMIT 1
        `,
        [backstockItemId],
    );

    return rows[0] ?? null;
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

        const dateForName = new Date().toISOString().slice(0, 10);
        const defaultThreadName = `Backstock - ${dateForName}`;

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

function countPlannedBackstockLines(grouped, rarityOrder, typeOrder) {
    let total = 0;

    for (const rarity of rarityOrder) {
        const byType = grouped.get(rarity);
        if (!byType) continue;

        total += 1;
        for (const type of typeOrder) {
            total += (byType.get(type) ?? []).length;
        }
    }

    return total;
}

async function postBackstockToChannel({ client, channelId, operationId }) {
    attachRateLimitListener(client);
    const resolvedOperationId = await resolveOperationId({
        operationId,
        action: 'post_backstock',
        channelId,
    });
    const postState = await fetchBackstockPostState();
    const items = await fetchBackstockItems();
    if (items.length === 0) {
        return { ok: false, status: 422, error: 'Backstock has no items.' };
    }

    const destinationResult = await resolveDestination({ client, channelId });
    if (!destinationResult.destination) {
        return { ok: false, status: destinationResult.status || 422, error: destinationResult.error };
    }

    const destination = destinationResult.destination;
    const messageIds = [];
    const itemMessageIds = {};

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

    const deleteCount = Array.isArray(postState?.lastPostMessageIds) ? postState.lastPostMessageIds.length : 0;
    const postCount = countPlannedBackstockLines(grouped, rarityOrder, typeOrder);
    const totalLines = Math.max(1, deleteCount + postCount);
    let postedLines = 0;
    await updateOperationProgress(resolvedOperationId, {
        totalLines,
        postedLines,
        lastLine: 'Preparing backstock post',
    });

    if (deleteCount > 0) {
        await updateOperationProgress(resolvedOperationId, {
            totalLines,
            postedLines,
            lastLine: `Deleting old backstock messages (0/${deleteCount})`,
        });
    }

    const deleteResult = await deletePreviousPosts({
        client,
        settings: postState,
        onProgress: async ({ processed, total }) => {
            postedLines = Math.min(totalLines, processed);
            await updateOperationProgress(resolvedOperationId, {
                totalLines,
                postedLines,
                lastLine: `Deleting old backstock messages (${processed}/${total})`,
            });
        },
    });
    if (deleteCount > 0 && postedLines < deleteCount) {
        postedLines = Math.min(totalLines, deleteCount);
        await updateOperationProgress(resolvedOperationId, {
            totalLines,
            postedLines,
            lastLine: `Deleting old backstock messages (${deleteResult.processed}/${deleteCount})`,
        });
    }

    const sendTrackedLine = async (line, label) => {
        const messageId = await sendOneLine(destination, line);
        postedLines = Math.min(totalLines, postedLines + 1);
        await updateOperationProgress(resolvedOperationId, {
            totalLines,
            postedLines,
            lastLine: label || null,
        });
        return messageId;
    };

    for (const rarity of rarityOrder) {
        const byType = grouped.get(rarity);
        if (!byType) continue;

        for (const type of typeOrder) {
            const rows = byType.get(type);
            if (rows) rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        }

        const tierText = tierRequirementForRarity(rarity);
        const header = `## ${rarityDisplayName(rarity)}${tierText ? ` (${tierText})` : ''}`;
        const headerId = await sendTrackedLine(header, `${rarityDisplayName(rarity)} section`);
        if (headerId) messageIds.push(headerId);

        for (const type of typeOrder) {
            const rows = byType.get(type) ?? [];
            for (const row of rows) {
                const messageId = await sendTrackedLine(
                    formatBackstockLine(row),
                    row.name || 'Backstock item',
                );
                if (messageId) {
                    messageIds.push(messageId);
                    itemMessageIds[String(row.id)] = messageId;
                }
            }
        }
    }

    await saveBackstockPostState({
        settingsId: postState?.id ?? null,
        channelId: destination.id,
        messageIds,
        itemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
    };
}

async function updateBackstockItemPost({ client, backstockItemId }) {
    attachRateLimitListener(client);
    const postState = await fetchBackstockPostState();
    if (!postState?.lastPostChannelId) {
        return { ok: false, status: 409, error: 'No previous backstock post found.' };
    }

    if (!postState.lastPostItemMessageIds || Object.keys(postState.lastPostItemMessageIds).length === 0) {
        return { ok: false, status: 409, error: 'Previous backstock post does not support line updates. Re-post backstock.' };
    }

    const row = await fetchBackstockItemById(backstockItemId);
    if (!row) {
        return { ok: false, status: 404, error: 'Backstock line not found.' };
    }

    const messageId = postState.lastPostItemMessageIds[String(backstockItemId)];
    if (!messageId) {
        return { ok: false, status: 404, error: 'Posted line for this backstock entry was not found.' };
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

    const updatedItemMessageIds = { ...postState.lastPostItemMessageIds };
    const content = formatBackstockLine(row);
    try {
        await waitForDiscordRateLimit(client);
        await destination.messages.edit(messageId, content);
    } catch {
        const fallbackId = await sendOneLine(destination, content);
        if (!fallbackId) {
            return { ok: false, status: 500, error: 'Failed to update backstock line.' };
        }
        updatedItemMessageIds[String(backstockItemId)] = fallbackId;
    }

    await saveBackstockPostState({
        settingsId: postState.id ?? null,
        channelId: postState.lastPostChannelId,
        messageIds: postState.lastPostMessageIds ?? [],
        itemMessageIds: updatedItemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        backstockItemId: Number(backstockItemId),
    };
}

module.exports = {
    postBackstockToChannel,
    updateBackstockItemPost,
};
