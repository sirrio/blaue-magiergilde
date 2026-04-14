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

function formatLink(name, url) {
    if (!url) return String(name ?? '');
    return `[${name}](<${url}>)`;
}

const DEFAULT_LINE_TEMPLATE = '{item_link}{spell_part}{legacy_part}: {item_cost}';

function formatItemLine(row, template) {
    const tpl = (typeof template === 'string' && template.trim()) ? template : DEFAULT_LINE_TEMPLATE;

    const notes = typeof row.notes === 'string' ? row.notes.trim() : '';
    const itemName = notes ? `${row.name} - ${notes}` : String(row.name ?? '');
    const itemLink = formatLink(itemName, row.url);
    const cost = row.cost ?? '';

    let spellLink = '';
    let spellPart = '';
    let spellLegacyLink = '';
    let legacyPart = '';

    if (row.spell_id) {
        const spellPrimaryUrl = row.spell_url || row.spell_legacy_url;
        spellLink = formatLink(row.spell_name, spellPrimaryUrl);
        spellPart = ` - ${spellLink}`;

        if (row.spell_legacy_url && row.spell_legacy_url !== spellPrimaryUrl) {
            spellLegacyLink = formatLink('Legacy', row.spell_legacy_url);
            legacyPart = ` - ${spellLegacyLink}`;
        }
    }

    const sourceKind = typeof row.roll_source_kind === 'string' ? row.roll_source_kind : '';
    const sourceLabel = sourceKind === 'official' ? 'Official' : sourceKind === 'partnered' ? 'Partnered' : '';
    const sourceShortcode = typeof row.source_shortcode === 'string' ? row.source_shortcode : '';

    return tpl
        .replaceAll('{item_link}', itemLink)
        .replaceAll('{item_name}', itemName)
        .replaceAll('{item_cost}', cost)
        .replaceAll('{notes}', notes)
        .replaceAll('{spell_link}', spellLink)
        .replaceAll('{spell_name}', row.spell_name ?? '')
        .replaceAll('{spell_legacy_link}', spellLegacyLink)
        .replaceAll('{spell_part}', spellPart)
        .replaceAll('{legacy_part}', legacyPart)
        .replaceAll('{source_label}', sourceLabel)
        .replaceAll('{source_shortcode}', sourceShortcode);
}

function formatHeadingLine(title) {
    return String(title ?? '').trim();
}

function normalizeMessageId(value) {
    if (value === null || value === undefined) return null;
    const id = String(value).trim();
    return id ? id : null;
}

function parsePostPayload(value) {
    if (!value) {
        return {
            headingLineMessageIds: [],
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

    if (!parsed || typeof parsed !== 'object') {
        return {
            headingLineMessageIds: [],
            itemMessageIds: {},
            shopId: null,
        };
    }

    const headingLineMessageIds = Array.isArray(parsed.heading_line_message_ids)
        ? parsed.heading_line_message_ids.map(normalizeMessageId).filter(Boolean)
        : [];

    const itemMessageIds = {};
    if (parsed.item_message_ids && typeof parsed.item_message_ids === 'object') {
        for (const [key, entryValue] of Object.entries(parsed.item_message_ids)) {
            const messageId = normalizeMessageId(entryValue);
            if (messageId) {
                itemMessageIds[String(key)] = messageId;
            }
        }
    }

    const shopId = Number(parsed.shop_id || 0) || null;

    return {
        headingLineMessageIds,
        itemMessageIds,
        shopId,
    };
}

async function fetchShopPostState() {
    const [rows] = await db.execute(
        'SELECT id, last_post_channel_id, last_post_message_ids, keep_previous_post FROM shop_settings ORDER BY id ASC LIMIT 1',
    );
    if (!rows[0]) return null;
    const parsed = parsePostPayload(rows[0].last_post_message_ids);
    return {
        id: rows[0].id,
        lastPostChannelId: rows[0].last_post_channel_id,
        headingLineMessageIds: parsed.headingLineMessageIds,
        itemMessageIds: parsed.itemMessageIds,
        shopId: parsed.shopId,
        keepPreviousPost: rows[0].keep_previous_post === 1 || rows[0].keep_previous_post === true,
    };
}

async function saveShopPostState({ settingsId, channelId, shopId, headingLineMessageIds, itemMessageIds }) {
    const payload = JSON.stringify({
        shop_id: shopId,
        heading_line_message_ids: headingLineMessageIds ?? [],
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

async function deletePreviousPosts({ client, settings, onProgress }) {
    if (!settings?.lastPostChannelId) return { total: 0, processed: 0 };

    const allMessageIds = new Set(
        [
            ...(settings.headingLineMessageIds || []),
            ...Object.values(settings.itemMessageIds || {}),
        ].filter(Boolean),
    );

    if (!allMessageIds.size) return { total: 0, processed: 0 };

    let channel;
    try {
        await waitForDiscordRateLimit(client);
        channel = await client.channels.fetch(settings.lastPostChannelId);
    } catch {
        return { total: allMessageIds.size, processed: 0 };
    }

    if (!channel?.isTextBased?.()) return { total: allMessageIds.size, processed: 0 };

    let processed = 0;
    for (const messageId of allMessageIds) {
        try {
            await waitForDiscordRateLimit(client);
             
            await channel.messages.delete(messageId);
        } catch {
            // Ignore missing permissions or deleted messages.
        } finally {
            processed += 1;
            if (typeof onProgress === 'function') {
                await onProgress({ processed, total: allMessageIds.size });
            }
        }
    }

    return { total: allMessageIds.size, processed };
}

async function fetchShop(shopId) {
    const [rows] = await db.execute(
        `SELECT s.id, s.created_at, s.roll_rows_snapshot, ss.line_template
         FROM shops s
         LEFT JOIN shop_settings ss ON 1=1
         WHERE s.id = ? LIMIT 1`,
        [shopId],
    );
    return rows[0] ?? null;
}

function parseRollRowsSnapshot(value) {
    if (!value) {
        return [];
    }

    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            return [];
        }
    }

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
            id: Number(row.id || 0),
            row_kind: row.row_kind === 'heading' ? 'heading' : 'rule',
            heading_title: typeof row.heading_title === 'string' ? row.heading_title : '',
            sort_order: Number(row.sort_order || 0),
        }));
}

async function fetchShopItems(shopId) {
    const [rows] = await db.execute(
        `
            SELECT
                si.id AS shop_item_id,
                si.item_id,
                si.item_name AS name,
                si.item_url AS url,
                si.item_cost AS cost,
                si.item_rarity AS rarity,
                si.item_type AS type,
                si.roll_rule_id,
                si.notes,
                si.spell_id,
                si.spell_name AS spell_name,
                si.spell_url AS spell_url,
                si.spell_legacy_url AS spell_legacy_url,
                si.spell_level AS spell_level,
                si.roll_source_kind,
                si.source_shortcode
            FROM item_shop si
            WHERE si.shop_id = ?
            ORDER BY si.id ASC
        `,
        [shopId],
    );

    return rows;
}

async function fetchShopItemById(shopItemId) {
    const [rows] = await db.execute(
        `
            SELECT
                si.id AS shop_item_id,
                si.shop_id,
                si.item_id,
                si.item_name AS name,
                si.item_url AS url,
                si.item_cost AS cost,
                si.item_rarity AS rarity,
                si.item_type AS type,
                si.roll_rule_id,
                si.notes,
                si.spell_id,
                si.spell_name AS spell_name,
                si.spell_url AS spell_url,
                si.spell_legacy_url AS spell_legacy_url,
                si.spell_level AS spell_level,
                si.roll_source_kind,
                si.source_shortcode
            FROM item_shop si
            WHERE si.id = ?
            LIMIT 1
        `,
        [shopItemId],
    );

    return rows[0] ?? null;
}

function buildShopPostRows(ruleRows, shopItems) {
    const itemsByRuleId = new Map();

    for (const row of shopItems) {
        const rollRuleId = Number(row.roll_rule_id || 0);
        if (!rollRuleId) {
            continue;
        }

        const existingRows = itemsByRuleId.get(rollRuleId) || [];
        existingRows.push(row);
        itemsByRuleId.set(rollRuleId, existingRows);
    }

    return ruleRows.flatMap((rule) => {
        if (rule.row_kind === 'heading') {
            return [{
                type: 'heading',
                id: Number(rule.id),
                title: typeof rule.heading_title === 'string' ? rule.heading_title.trim() : '',
            }];
        }

        const ruleId = Number(rule.id || 0);

        return (itemsByRuleId.get(ruleId) || []).map((row) => ({
            type: 'item',
            row,
        }));
    });
}

async function resolveDestination({ client, channelId, shop, threadName }) {
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
    if (!line) return;
    await waitForDiscordRateLimit(destination.client);
    const message = await destination.send(String(line));
    return message?.id ?? null;
}

function countPlannedShopLines(postRows) {
    // Top shop title line.
    let total = 1;

    for (const row of postRows) {
        if (row.type === 'heading' || row.type === 'item') {
            total += 1;
        }
    }

    return total;
}

async function postShopToChannel({ client, channelId, shopId, operationId, threadName }) {
    attachRateLimitListener(client);
    const resolvedOperationId = await resolveOperationId({
        operationId,
        action: 'publish_draft',
        channelId,
    });
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
    const headingLineMessageIds = [];
    const itemMessageIds = {};
    const ruleRows = parseRollRowsSnapshot(shop.roll_rows_snapshot);
    const postRows = buildShopPostRows(ruleRows, items);

    const previousMessageIds = new Set(
        [
            ...(postState?.headingLineMessageIds || []),
            ...Object.values(postState?.itemMessageIds || {}),
        ].filter(Boolean),
    );
    const deleteCount = previousMessageIds.size;
    const postCount = countPlannedShopLines(postRows);
    const totalLines = Math.max(1, deleteCount + postCount);
    let postedLines = 0;
    await updateOperationProgress(resolvedOperationId, {
        totalLines,
        postedLines,
        lastLine: `Preparing shop #${String(shop.id).padStart(3, '0')}`,
    });

    if (deleteCount > 0 && !postState?.keepPreviousPost) {
        await updateOperationProgress(resolvedOperationId, {
            totalLines,
            postedLines,
            lastLine: `Deleting old shop messages (0/${deleteCount})`,
        });
    }

    const deleteResult = postState?.keepPreviousPost
        ? { total: 0, processed: 0 }
        : await deletePreviousPosts({
            client,
            settings: postState,
            onProgress: async ({ processed, total }) => {
                postedLines = Math.min(totalLines, processed);
                await updateOperationProgress(resolvedOperationId, {
                    totalLines,
                    postedLines,
                    lastLine: `Deleting old shop messages (${processed}/${total})`,
                });
            },
        });
    if (deleteCount > 0 && !postState?.keepPreviousPost && postedLines < deleteCount) {
        postedLines = Math.min(totalLines, deleteCount);
        await updateOperationProgress(resolvedOperationId, {
            totalLines,
            postedLines,
            lastLine: `Deleting old shop messages (${deleteResult.processed}/${deleteCount})`,
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

    const createdAtUnix = Math.floor(new Date(shop.created_at).getTime() / 1000);
    const createdAtText = Number.isFinite(createdAtUnix) ? `<t:${createdAtUnix}:f>` : String(shop.created_at);
    const shopTitleMessageId = await sendTrackedLine(
        `**Shop #${String(shop.id).padStart(3, '0')}** - Rolled: ${createdAtText}`,
        `Shop line: #${String(shop.id).padStart(3, '0')}`,
    );
    if (shopTitleMessageId) headingLineMessageIds.push(shopTitleMessageId);

    for (const postRow of postRows) {
        if (postRow.type === 'heading') {
            const headingId = await sendTrackedLine(
                formatHeadingLine(postRow.title),
                formatHeadingLine(postRow.title),
            );
            if (headingId) headingLineMessageIds.push(headingId);

            continue;
        }

        const messageId = await sendTrackedLine(formatItemLine(postRow.row, shop.line_template), postRow.row.name || 'Item');
        if (messageId) itemMessageIds[String(postRow.row.shop_item_id)] = messageId;
    }

    await saveShopPostState({
        settingsId: postState?.id ?? null,
        channelId: destination.id,
        shopId: shop.id,
        headingLineMessageIds,
        itemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        shopId: shop.id,
    };
}

async function updateShopPost({ client, shopId, operationId }) {
    attachRateLimitListener(client);
    const resolvedOperationId = await resolveOperationId({
        operationId,
        action: 'update_current_post',
    });
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
    const totalLines = items.length;
    let postedLines = 0;
    await updateOperationProgress(resolvedOperationId, {
        totalLines,
        postedLines,
        lastLine: `Preparing update for shop #${String(shop.id).padStart(3, '0')}`,
    });

    for (const row of items) {
        const messageId = updatedItemMessageIds[String(row.shop_item_id)];
        const content = formatItemLine(row, shop.line_template);

        if (!messageId) {
             
            const newMessageId = await sendOneLine(destination, content);
            if (newMessageId) {
                updatedItemMessageIds[String(row.shop_item_id)] = newMessageId;
            }
            postedLines += 1;
            await updateOperationProgress(resolvedOperationId, {
                totalLines,
                postedLines,
                lastLine: row.name || 'Item',
            });
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

        postedLines += 1;
        await updateOperationProgress(resolvedOperationId, {
            totalLines,
            postedLines,
            lastLine: row.name || 'Item',
        });
    }

    await saveShopPostState({
        settingsId: postState.id ?? null,
        channelId: postState.lastPostChannelId,
        shopId: shop.id,
        headingLineMessageIds: postState.headingLineMessageIds ?? [],
        itemMessageIds: updatedItemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        shopId: shop.id,
    };
}

async function updateShopItemPost({ client, shopItemId }) {
    attachRateLimitListener(client);
    const postState = await fetchShopPostState();
    if (!postState?.lastPostChannelId) {
        return { ok: false, status: 409, error: 'No previous shop post found.' };
    }

    if (!postState.itemMessageIds || Object.keys(postState.itemMessageIds).length === 0) {
        return { ok: false, status: 409, error: 'Previous shop post does not support line updates. Re-post the shop.' };
    }

    const row = await fetchShopItemById(shopItemId);
    if (!row) {
        return { ok: false, status: 404, error: 'Shop line not found.' };
    }

    if (postState.shopId && Number(postState.shopId) !== Number(row.shop_id)) {
        return { ok: false, status: 409, error: `Last posted shop is #${postState.shopId}.` };
    }

    const shop = await fetchShop(row.shop_id);

    const messageId = postState.itemMessageIds[String(shopItemId)];
    if (!messageId) {
        return { ok: false, status: 404, error: 'Posted line for this shop entry was not found.' };
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
    const content = formatItemLine(row, shop?.line_template);
    try {
        await waitForDiscordRateLimit(client);
        await destination.messages.edit(messageId, content);
    } catch {
        const fallbackId = await sendOneLine(destination, content);
        if (!fallbackId) {
            return { ok: false, status: 500, error: 'Failed to update shop line.' };
        }
        updatedItemMessageIds[String(shopItemId)] = fallbackId;
    }

    await saveShopPostState({
        settingsId: postState.id ?? null,
        channelId: postState.lastPostChannelId,
        shopId: postState.shopId || row.shop_id || null,
        headingLineMessageIds: postState.headingLineMessageIds ?? [],
        itemMessageIds: updatedItemMessageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
        shopId: row.shop_id,
        shopItemId: Number(shopItemId),
    };
}

module.exports = {
    buildShopPostRows,
    formatHeadingLine,
    parseRollRowsSnapshot,
    postShopToChannel,
    updateShopPost,
    updateShopItemPost,
};
