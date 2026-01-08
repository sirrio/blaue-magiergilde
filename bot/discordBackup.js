const { ChannelType } = require('discord.js');
const { guildIds } = require('./config');

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_DELAY_MS = 1200;
const DEFAULT_ATTACHMENT_DELAY_MS = 250;

let isRunning = false;

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

async function listDiscordChannels(client, allowedGuildIds) {
    const guildList = allowedGuildIds && allowedGuildIds.length ? allowedGuildIds : resolveGuildIds(client);
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
            if (!shouldIncludeSelectableChannel(channel)) {
                continue;
            }

            channels.push({
                id: channel.id,
                guild_id: guildId,
                name: channel.name || channel.id,
                type: resolveChannelType(channel),
                parent_id: channel.parentId || null,
                is_thread: false,
            });
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

        const channelState = await fetchChannelState(appUrl, token, guildId);
        const channels = await collectChannels(guild, allowlist);

        const channelPayload = channels.map(channel => ({
            id: channel.id,
            guild_id: guildId,
            name: channel.name || channel.id,
            type: resolveChannelType(channel),
            parent_id: channel.parentId || null,
            is_thread: Boolean(channel.isThread?.()),
            last_message_id: channelState.get(channel.id)?.last_message_id || null,
        }));

        try {
            await postJson(appUrl, token, '/bot/discord-backups/channels', {
                channels: channelPayload,
            });
        } catch (error) {
            console.warn('[bot] Discord backup: failed to store channel metadata.', error);
            continue;
        }

        for (const channel of channels) {
            if (!shouldFetchMessages(channel)) {
                continue;
            }

            const lastMessage = channelState.get(channel.id)?.last_message_id || null;

            try {
                await backupChannelMessages(channel, guildId, lastMessage, appUrl, token);
            } catch (error) {
                console.warn(`[bot] Discord backup: failed to backup channel ${channel.id}.`, error);
            }
        }
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

    void runDiscordBackup(client, resolvedUrl, allowlistByGuild)
        .catch(error => {
            console.warn('[bot] Discord backup failed.', error);
        })
        .finally(() => {
            isRunning = false;
        });

    return { started: true };
}

module.exports = {
    startDiscordBackup,
    listDiscordChannels,
};
