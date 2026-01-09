const { ChannelType } = require('discord.js');
const { guildIds } = require('./config');

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_DELAY_MS = 1200;
const DEFAULT_ATTACHMENT_DELAY_MS = 250;
const DEFAULT_CHANNEL_COOLDOWN_MS = 30000;

let isRunning = false;
const channelCooldowns = new Map();
const backupStatus = {
    running: false,
    startedAt: null,
    finishedAt: null,
    updatedAt: null,
    totalChannels: 0,
    processedChannels: 0,
    processedMessages: 0,
    currentChannel: null,
};

function updateStatus(patch) {
    Object.assign(backupStatus, patch);
    backupStatus.updatedAt = new Date().toISOString();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveAppUrl(appUrl) {
    const direct = String(appUrl || '').trim();
    if (direct) return direct.replace(/\/$/, '');

    const fallback = String(process.env.BOT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    return fallback ? fallback.replace(/\/$/, '') : '';
}

function resolveGuildIds(client) {
    if (guildIds.length) return guildIds;
    return [...client.guilds.cache.keys()];
}

function resolveChannelType(channel) {
    const typeName = Object.entries(ChannelType).find(([, value]) => value === channel.type)?.[0];
    return typeName || String(channel.type);
}

function shouldIncludeSelectableChannel(channel) {
    if (!channel.isTextBased?.()) return false;
    if (channel.isThread?.()) return false;
    if (channel.type === ChannelType.GuildForum) return false;

    return true;
}

function shouldIncludeListChannel(channel) {
    if (channel.type === ChannelType.GuildCategory) return true;

    return shouldIncludeSelectableChannel(channel);
}

function getChannelCooldown(channelId) {
    const cooldownMs = Number(process.env.BOT_BACKUP_CHANNEL_COOLDOWN_MS || DEFAULT_CHANNEL_COOLDOWN_MS);
    if (!Number.isFinite(cooldownMs) || cooldownMs <= 0) {
        return { active: false, retryAfterMs: 0 };
    }

    const now = Date.now();
    const lastRun = channelCooldowns.get(channelId) || 0;
    const delta = now - lastRun;
    if (delta < cooldownMs) {
        return { active: true, retryAfterMs: cooldownMs - delta };
    }

    return { active: false, retryAfterMs: 0 };
}

function markChannelCooldown(channelId) {
    channelCooldowns.set(channelId, Date.now());
}

async function fetchChannelState(appUrl, token, guildId) {
    const url = new URL('/bot/discord-backups/channels', appUrl);
    url.searchParams.set('guild_id', guildId);

    const response = await fetch(url.toString(), {
        headers: { 'X-Bot-Token': token },
    });

    if (!response.ok) {
        console.warn('[bot] Discord backup: failed to fetch channel state.');
        return new Map();
    }

    const payload = await response.json();
    const channels = Array.isArray(payload.channels) ? payload.channels : [];

    return new Map(channels.map(channel => [channel.id, channel]));
}

async function resolveSingleChannel(client, channelId) {
    try {
        return await client.channels.fetch(channelId);
    } catch (error) {
        console.warn(`[bot] Discord backup: failed to fetch channel ${channelId}.`, error);
        return null;
    }
}

function isChannelAllowed(channel, allowlistByGuild) {
    if (!allowlistByGuild) return true;
    const guildId = channel.guild?.id;
    if (!guildId) return false;
    const allowlist = allowlistByGuild.get(guildId);
    if (!allowlist || allowlist.size === 0) return false;
    return allowlist.has(channel.id) || (channel.parentId && allowlist.has(channel.parentId));
}

async function backupChannelSet(channels, guildId, appUrl, token) {
    const channelState = await fetchChannelState(appUrl, token, guildId);
    const channelPayload = channels.map(channel => ({
        id: channel.id,
        guild_id: guildId,
        name: channel.name || channel.id,
        type: resolveChannelType(channel),
        parent_id: channel.parentId || null,
        is_thread: Boolean(channel.isThread?.()),
        last_message_id: channelState.get(channel.id)?.last_message_id || null,
    }));

    await postJson(appUrl, token, '/bot/discord-backups/channels', {
        channels: channelPayload,
    });

    for (const channel of channels) {
        if (!shouldFetchMessages(channel)) {
            updateStatus({
                processedChannels: backupStatus.processedChannels + 1,
                currentChannel: null,
            });
            continue;
        }

        const lastMessage = channelState.get(channel.id)?.last_message_id || null;

        try {
            updateStatus({
                currentChannel: {
                    id: channel.id,
                    name: channel.name || channel.id,
                    guild_id: guildId,
                },
            });
            await backupChannelMessages(channel, guildId, lastMessage, appUrl, token);
        } catch (error) {
            console.warn(`[bot] Discord backup: failed to backup channel ${channel.id}.`, error);
        } finally {
            updateStatus({
                processedChannels: backupStatus.processedChannels + 1,
                currentChannel: null,
            });
        }
    }
}

async function listDiscordChannels(client, allowedGuildIds, options = {}) {
    const guildList = allowedGuildIds && allowedGuildIds.length ? allowedGuildIds : resolveGuildIds(client);
    const includeThreads = Boolean(options?.includeThreads);
    const guilds = [];

    for (const guildId of guildList) {
        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            console.warn(`[bot] Discord channels: failed to fetch guild ${guildId}.`, error);
            continue;
        }

        const guildChannels = await guild.channels.fetch();
        const channels = [];

        for (const channel of guildChannels.values()) {
            if (!shouldIncludeListChannel(channel)) {
                continue;
            }

            channels.push({
                id: channel.id,
                guild_id: guildId,
                name: channel.name || channel.id,
                type: resolveChannelType(channel),
                parent_id: channel.parentId || null,
                is_thread: Boolean(channel.isThread?.()),
            });

            if (includeThreads && shouldIncludeSelectableChannel(channel) && channel.threads) {
                const threads = await collectThreads(channel);
                for (const thread of threads) {
                    channels.push({
                        id: thread.id,
                        guild_id: guildId,
                        name: thread.name || thread.id,
                        type: resolveChannelType(thread),
                        parent_id: thread.parentId || null,
                        is_thread: true,
                    });
                }
            }
        }

        guilds.push({ guild_id: guildId, channels });
    }

    return guilds;
}

async function postJson(appUrl, token, path, payload) {
    const response = await fetch(`${appUrl}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Bot-Token': token,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Request failed (${response.status}): ${errorBody}`);
    }

    return response.json().catch(() => ({}));
}

async function uploadAttachment(appUrl, token, messageId, attachment) {
    if (!attachment?.url) {
        throw new Error('Attachment URL missing.');
    }

    const response = await fetch(attachment.url);
    if (!response.ok) {
        throw new Error(`Attachment download failed (${response.status}).`);
    }

    const filename = attachment.name || `${attachment.id || 'attachment'}`;
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = attachment.contentType || 'application/octet-stream';
    const form = new FormData();
    form.append('discord_message_id', messageId);
    form.append('attachment_id', attachment.id);
    form.append('filename', filename);
    form.append('content_type', attachment.contentType || '');
    form.append('size', String(attachment.size || 0));
    form.append('url', attachment.url);
    form.append('file', new Blob([buffer], { type: contentType }), filename);

    const uploadResponse = await fetch(`${appUrl}/bot/discord-backups/attachments`, {
        method: 'POST',
        headers: {
            'X-Bot-Token': token,
        },
        body: form,
    });

    if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.text();
        throw new Error(`Attachment upload failed (${uploadResponse.status}): ${errorBody}`);
    }
}

function shouldFetchMessages(channel) {
    if (channel.type === ChannelType.GuildForum) {
        return false;
    }

    return Boolean(channel.isTextBased?.());
}

async function collectThreads(channel) {
    if (!channel.threads) return [];

    const threads = [];

    try {
        const active = await channel.threads.fetchActive();
        threads.push(...active.threads.values());
    } catch (error) {
        console.warn('[bot] Discord backup: failed to fetch active threads.', error);
    }

    for (const type of ['public', 'private']) {
        try {
            const archived = await channel.threads.fetchArchived({ type, fetchAll: true });
            threads.push(...archived.threads.values());
        } catch (error) {
            console.warn(`[bot] Discord backup: failed to fetch archived threads (${type}).`, error);
        }
    }

    return threads;
}

async function collectChannels(guild, allowedChannelIds) {
    const channels = new Map();
    const guildChannels = await guild.channels.fetch();

    for (const channel of guildChannels.values()) {
        if (!shouldIncludeSelectableChannel(channel)) continue;
        if (allowedChannelIds && !allowedChannelIds.has(channel.id)) continue;
        channels.set(channel.id, channel);

        if (channel.threads) {
            const threads = await collectThreads(channel);
            for (const thread of threads) {
                channels.set(thread.id, thread);
            }
        }
    }

    return [...channels.values()];
}

async function processMessageBatch(appUrl, token, channelId, guildId, messages) {
    if (!messages.length) return;

    const payload = messages.map(message => ({
        id: message.id,
        author_id: message.author?.id || '0',
        author_name: message.author?.username || message.author?.tag || 'Unknown',
        author_display_name: message.member?.displayName || message.author?.globalName || null,
        content: message.content || null,
        message_type: message.type,
        is_pinned: message.pinned,
        sent_at: message.createdAt?.toISOString() || null,
        edited_at: message.editedAt?.toISOString() || null,
        payload: message.toJSON ? message.toJSON() : null,
        attachments: [...message.attachments.values()].map(attachment => ({
            id: attachment.id,
            filename: attachment.name || `${attachment.id || 'attachment'}`,
            content_type: attachment.contentType,
            size: attachment.size,
            url: attachment.url,
        })),
    }));

    await postJson(appUrl, token, '/bot/discord-backups/messages', {
        channel_id: channelId,
        guild_id: guildId,
        messages: payload,
    });

    updateStatus({
        processedMessages: backupStatus.processedMessages + messages.length,
    });

    for (const message of messages) {
        for (const attachment of message.attachments.values()) {
            try {
                await uploadAttachment(appUrl, token, message.id, attachment);
            } catch (error) {
                console.warn(`[bot] Discord backup: attachment upload failed (${attachment.id}).`, error);
            }

            await sleep(Number(process.env.BOT_BACKUP_ATTACHMENT_DELAY_MS || DEFAULT_ATTACHMENT_DELAY_MS));
        }
    }
}

async function backupChannelMessages(channel, guildId, lastMessageId, appUrl, token) {
    const batchSize = Number(process.env.BOT_BACKUP_BATCH_SIZE || DEFAULT_BATCH_SIZE);
    const delayMs = Number(process.env.BOT_BACKUP_DELAY_MS || DEFAULT_DELAY_MS);

    let cursor = lastMessageId || null;

    while (true) {
        const options = { limit: Math.min(batchSize, 100) };

        if (lastMessageId) {
            options.after = cursor;
        } else if (cursor) {
            options.before = cursor;
        }

        const batch = await channel.messages.fetch(options);
        if (!batch.size) {
            break;
        }

        const messages = [...batch.values()];
        messages.sort((a, b) => a.id.localeCompare(b.id));

        await processMessageBatch(appUrl, token, channel.id, guildId, messages);

        if (lastMessageId) {
            cursor = messages[messages.length - 1].id;
        } else {
            cursor = messages[0].id;
        }

        await sleep(delayMs);
    }
}

async function runDiscordBackup(client, appUrl, allowlistByGuild) {
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!token) {
        console.warn('[bot] BOT_HTTP_TOKEN missing; cannot push backups to app.');
        return;
    }

    const guildList = resolveGuildIds(client);
    if (!guildList.length) {
        console.warn('[bot] Discord backup: no guilds found.');
        return;
    }

    const guildPlans = [];
    let totalChannels = 0;

    for (const guildId of guildList) {
        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            console.warn(`[bot] Discord backup: failed to fetch guild ${guildId}.`, error);
            continue;
        }

        if (allowlistByGuild && !allowlistByGuild.has(guildId)) {
            continue;
        }

        const allowlist = allowlistByGuild?.get(guildId) || null;
        if (allowlist && allowlist.size === 0) {
            continue;
        }

        const channels = await collectChannels(guild, allowlist);
        if (!channels.length) {
            continue;
        }

        guildPlans.push({ guildId, channels });
        totalChannels += channels.length;
    }

    updateStatus({
        totalChannels,
        processedChannels: 0,
        processedMessages: 0,
        currentChannel: null,
    });

    if (totalChannels === 0) {
        updateStatus({
            running: false,
            finishedAt: new Date().toISOString(),
        });
        return;
    }

    for (const plan of guildPlans) {
        const { guildId, channels } = plan;
        try {
            await backupChannelSet(channels, guildId, appUrl, token);
        } catch (error) {
            console.warn('[bot] Discord backup: failed to store channel metadata.', error);
        }
    }
}

async function runSingleChannelBackup(client, appUrl, channelId, guildId, allowlistByGuild) {
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!token) {
        console.warn('[bot] BOT_HTTP_TOKEN missing; cannot push backups to app.');
        return;
    }

    const channel = await resolveSingleChannel(client, channelId);
    if (!channel) {
        return;
    }

    const resolvedGuildId = channel.guild?.id || guildId;
    if (!resolvedGuildId) {
        console.warn('[bot] Discord backup: channel guild not found.');
        return;
    }

    if (!isChannelAllowed(channel, allowlistByGuild)) {
        console.warn('[bot] Discord backup: channel not allowed.');
        return;
    }

    const channels = new Map();

    if (channel.isThread?.()) {
        channels.set(channel.id, channel);
    } else if (shouldIncludeSelectableChannel(channel)) {
        channels.set(channel.id, channel);
        if (channel.threads) {
            const threads = await collectThreads(channel);
            for (const thread of threads) {
                channels.set(thread.id, thread);
            }
        }
    } else {
        console.warn('[bot] Discord backup: channel type not supported.');
        return;
    }

    const channelList = [...channels.values()];
    updateStatus({
        totalChannels: channelList.length,
        processedChannels: 0,
        processedMessages: 0,
        currentChannel: null,
    });

    if (!channelList.length) {
        updateStatus({
            running: false,
            finishedAt: new Date().toISOString(),
        });
        return;
    }

    try {
        await backupChannelSet(channelList, resolvedGuildId, appUrl, token);
    } catch (error) {
        console.warn('[bot] Discord backup: single channel backup failed.', error);
    }
}

function startDiscordBackup(client, appUrl, allowlistByGuild) {
    if (isRunning) {
        return { started: false, error: 'Backup already running.' };
    }

    const resolvedUrl = resolveAppUrl(appUrl);
    if (!resolvedUrl) {
        return { started: false, error: 'App URL is missing.' };
    }

    isRunning = true;
    updateStatus({
        running: true,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        totalChannels: 0,
        processedChannels: 0,
        processedMessages: 0,
        currentChannel: null,
    });

    void runDiscordBackup(client, resolvedUrl, allowlistByGuild)
        .catch(error => {
            console.warn('[bot] Discord backup failed.', error);
        })
        .finally(() => {
            isRunning = false;
            updateStatus({
                running: false,
                finishedAt: new Date().toISOString(),
                currentChannel: null,
            });
        });

    return { started: true };
}

function startDiscordBackupChannel(client, appUrl, channelId, guildId, allowlistByGuild) {
    if (isRunning) {
        return { started: false, error: 'Backup already running.' };
    }

    const resolvedUrl = resolveAppUrl(appUrl);
    if (!resolvedUrl) {
        return { started: false, error: 'App URL is missing.' };
    }

    const cooldown = getChannelCooldown(channelId);
    if (cooldown.active) {
        return {
            started: false,
            error: 'Channel cooldown active.',
            retry_after_ms: cooldown.retryAfterMs,
        };
    }

    markChannelCooldown(channelId);

    isRunning = true;
    updateStatus({
        running: true,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        totalChannels: 0,
        processedChannels: 0,
        processedMessages: 0,
        currentChannel: null,
    });

    void runSingleChannelBackup(client, resolvedUrl, channelId, guildId, allowlistByGuild)
        .catch(error => {
            console.warn('[bot] Discord backup failed.', error);
        })
        .finally(() => {
            isRunning = false;
            updateStatus({
                running: false,
                finishedAt: new Date().toISOString(),
                currentChannel: null,
            });
        });

    return { started: true };
}

function getBackupStatus() {
    return {
        running: backupStatus.running,
        started_at: backupStatus.startedAt,
        finished_at: backupStatus.finishedAt,
        updated_at: backupStatus.updatedAt,
        total_channels: backupStatus.totalChannels,
        processed_channels: backupStatus.processedChannels,
        processed_messages: backupStatus.processedMessages,
        current_channel: backupStatus.currentChannel,
    };
}

module.exports = {
    startDiscordBackup,
    startDiscordBackupChannel,
    listDiscordChannels,
    getBackupStatus,
};
