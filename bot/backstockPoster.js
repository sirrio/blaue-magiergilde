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

function formatBackstockLine(row) {
    const notes = row.notes ? String(row.notes).trim() : '';
    const displayName = notes ? `${row.name} - ${notes}` : row.name;
    const itemLabel = formatLink(displayName, row.url);
    const cost = row.cost ? `: ${row.cost}` : '';
    return `${itemLabel}${cost}`;
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

async function fetchBackstockPostState() {
    const [rows] = await db.execute(
        'SELECT id, last_post_channel_id, last_post_message_ids FROM backstock_settings ORDER BY id ASC LIMIT 1',
    );
    if (!rows[0]) return null;
    return {
        id: rows[0].id,
        lastPostChannelId: rows[0].last_post_channel_id,
        lastPostMessageIds: parseMessageIds(rows[0].last_post_message_ids),
    };
}

async function saveBackstockPostState({ settingsId, channelId, messageIds }) {
    const payload = JSON.stringify(messageIds ?? []);
    const timestamp = nowSql();

    if (!settingsId) {
        await db.execute(
            'INSERT INTO backstock_settings (last_post_channel_id, last_post_message_ids, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [channelId, payload, timestamp, timestamp],
        );
        return;
    }

    await db.execute(
        'UPDATE backstock_settings SET last_post_channel_id = ?, last_post_message_ids = ?, updated_at = ? WHERE id = ?',
        [channelId, payload, timestamp, settingsId],
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

async function sendLines(destination, lines) {
    const messageIds = [];
    for (const line of lines) {
         
        const messageId = await sendOneLine(destination, line);
        if (messageId) messageIds.push(messageId);
    }
    return messageIds;
}

async function postBackstockToChannel({ client, channelId }) {
    attachRateLimitListener(client);
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

    await deletePreviousPosts({ client, settings: postState });

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

        const tierText = tierRequirementForRarity(rarity);
        const header = `## ${rarityDisplayName(rarity)}${tierText ? ` (${tierText})` : ''}`;
        const headerId = await sendOneLine(destination, header);
        if (headerId) messageIds.push(headerId);

        const lines = [];
        typeOrder.forEach((type) => {
            const rows = byType.get(type) ?? [];
            rows.forEach((row) => {
                lines.push(formatBackstockLine(row));
            });
        });
        messageIds.push(...await sendLines(destination, lines));
    }

    await saveBackstockPostState({
        settingsId: postState?.id ?? null,
        channelId: destination.id,
        messageIds,
    });

    return {
        ok: true,
        destinationId: destination.id,
        destinationName: destination.name || destination.id,
    };
}

module.exports = {
    postBackstockToChannel,
};
