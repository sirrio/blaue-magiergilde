const http = require('node:http');
const { getBackupStatus, listChannelThreads, listDiscordChannels, startDiscordBackup, startDiscordBackupChannel } = require('./discordBackup');
const { postAuctionToChannel, updateAuctionItemPost, fetchAuctionItemById } = require('./auctionPoster');
const { postVoiceHighestBid } = require('./auctionVoiceBidPoster');
const { postBackstockToChannel, updateBackstockItemPost } = require('./backstockPoster');
const { postShopToChannel, updateShopPost, updateShopItemPost } = require('./shopPoster');
const { getSnapshot } = require('./voiceStateCache');
const { runGameAnnouncementSync } = require('./discordGameSync');
const { guildIds: configuredGuildIds } = require('./config');
const {
    postCharacterApprovalAnnouncement,
    sendCharacterApprovalDm,
    updateCharacterApprovalAnnouncement,
    deleteCharacterApprovalAnnouncement,
} = require('./characterApprovalNotifier');

const RATE_LIMIT_WINDOW_MS = Number(process.env.BOT_HTTP_RATE_LIMIT_MS || 3000);
const MAX_BODY_SIZE = 10 * 1024;
const rateLimit = new Map();

function resolveListenConfig() {
    const rawUrl = String(process.env.BOT_HTTP_URL || '').trim();
    if (rawUrl) {
        try {
            const parsed = new URL(rawUrl);
            const port = parsed.port
                ? Number(parsed.port)
                : parsed.protocol === 'https:' ? 443 : 80;
            return { host: parsed.hostname, port };
        } catch {
            // fall through
        }
    }

    const host = String(process.env.BOT_HTTP_HOST || '127.0.0.1').trim() || '127.0.0.1';
    const port = process.env.BOT_HTTP_PORT ? Number(process.env.BOT_HTTP_PORT) : 3125;
    return { host, port };
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > MAX_BODY_SIZE) {
                reject(new Error('Payload too large.'));
                req.destroy();
            }
        });
        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

function respondJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function getClientIp(req) {
    return req.socket?.remoteAddress || 'unknown';
}

function logReject(req, reason) {
    const ip = getClientIp(req);
    console.warn(`[bot] HTTP reject: ${reason} (${req.method} ${req.url}) from ${ip}`);
}

function getRateLimitKey(req) {
    const path = req.url?.split('?')[0] || 'unknown';
    const ip = getClientIp(req);
    return `${ip}:${path}`;
}

function getRateLimitStatus(req) {
    if (!Number.isFinite(RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS <= 0) {
        return { limited: false, retryAfterMs: 0 };
    }

    const key = getRateLimitKey(req);
    const now = Date.now();
    const lastSeen = rateLimit.get(key) || 0;
    const delta = now - lastSeen;
    if (delta < RATE_LIMIT_WINDOW_MS) {
        return { limited: true, retryAfterMs: RATE_LIMIT_WINDOW_MS - delta };
    }

    rateLimit.set(key, now);
    return { limited: false, retryAfterMs: 0 };
}

function startHttpServer(client) {
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!token) {
        console.warn('[bot] BOT_HTTP_TOKEN missing; HTTP control is disabled.');
        return null;
    }

    const { host, port } = resolveListenConfig();

    const server = http.createServer(async (req, res) => {
        const path = req.url?.split('?')[0];
        const isVoiceSync = path === '/voice-sync';
        const isDiscordBackup = path === '/discord-backup';
        const isDiscordChannels = path === '/discord-channels';
        const isDiscordThreads = path === '/discord-threads';
        const isDiscordBackupChannel = path === '/discord-backup/channel';
        const isDiscordBackupStatus = path === '/discord-backup/status';
        const isDiscordMemberLookup = path === '/discord-member-lookup';
        const isCharacterApprovalNotify = path === '/character-approval/notify';
        const isCharacterApprovalPending = path === '/character-approval/pending';
        const isCharacterApprovalUpdate = path === '/character-approval/update';
        const isCharacterApprovalDelete = path === '/character-approval/delete';
        const isShopPost = path === '/shop-post';
        const isShopUpdate = path === '/shop-update';
        const isShopLineUpdate = path === '/shop-line-update';
        const isBackstockPost = path === '/backstock-post';
        const isBackstockLineUpdate = path === '/backstock-line-update';
        const isAuctionPost = path === '/auction-post';
        const isAuctionLineUpdate = path === '/auction-line-update';
        const isAuctionVoiceBid = path === '/auction-voice-bid';
        const isAuctionItemSold = path === '/auction-item-sold';
        const isGamesSync = path === '/games-sync';

        const allowedPost =
            isVoiceSync ||
            isDiscordBackup ||
            isDiscordChannels ||
            isDiscordThreads ||
            isDiscordBackupStatus ||
            isDiscordBackupChannel ||
            isDiscordMemberLookup ||
            isCharacterApprovalNotify ||
            isCharacterApprovalPending ||
            isCharacterApprovalUpdate ||
            isCharacterApprovalDelete ||
            isShopPost ||
            isShopUpdate ||
            isShopLineUpdate ||
            isBackstockPost ||
            isBackstockLineUpdate ||
            isAuctionPost ||
            isAuctionLineUpdate ||
            isAuctionVoiceBid ||
            isAuctionItemSold ||
            isGamesSync;

        if (req.method !== 'POST' || !allowedPost) {
            respondJson(res, 404, { error: 'Not found.' });
            return;
        }

        if (!isDiscordBackupStatus) {
            const limitStatus = getRateLimitStatus(req);
            if (limitStatus.limited) {
                logReject(req, 'rate limited');
                respondJson(res, 429, {
                    error: 'Too many requests.',
                    retry_after_ms: Math.max(0, Math.ceil(limitStatus.retryAfterMs)),
                });
                return;
            }
        }

        const providedToken = req.headers['x-bot-token'];
        if (typeof providedToken !== 'string' || providedToken !== token) {
            logReject(req, 'unauthorized');
            respondJson(res, 401, { error: 'Unauthorized.' });
            return;
        }

        let payload = {};
        if (req.method === 'POST') {
            try {
                payload = await readJson(req);
            } catch (error) {
                if (error instanceof Error && error.message === 'Payload too large.') {
                    logReject(req, 'payload too large');
                    respondJson(res, 413, { error: 'Payload too large.' });
                    return;
                }

                logReject(req, 'invalid JSON');
                respondJson(res, 400, { error: 'Invalid JSON.' });
                return;
            }
        }

        if (isDiscordBackupStatus) {
            respondJson(res, 200, { status: getBackupStatus() });
            return;
        }

        if (isDiscordMemberLookup) {
            const discordUserId = String(payload?.discord_user_id || '').trim();
            if (!discordUserId || !/^[0-9]{5,}$/.test(discordUserId)) {
                logReject(req, 'invalid discord_user_id');
                respondJson(res, 422, { error: 'Invalid discord_user_id.' });
                return;
            }

            const requestedGuildIds = Array.isArray(payload?.guild_ids)
                ? payload.guild_ids.map(id => String(id).trim()).filter(id => /^[0-9]{5,}$/.test(id))
                : [];

            const knownGuildIds = requestedGuildIds.length
                ? requestedGuildIds
                : (Array.isArray(configuredGuildIds) && configuredGuildIds.length
                    ? configuredGuildIds
                    : Array.from(client.guilds.cache.keys()));

            if (!knownGuildIds.length) {
                logReject(req, 'no guild scope for member lookup');
                respondJson(res, 422, { error: 'No guild scope available for member lookup.' });
                return;
            }

            for (const guildId of knownGuildIds) {
                try {
                    const guild = await client.guilds.fetch(guildId);
                    const member = await guild.members.fetch(discordUserId);
                    const displayName = member.displayName || member.user?.globalName || member.user?.username || '';
                    const username = member.user?.username || '';

                    if (displayName || username) {
                        respondJson(res, 200, {
                            status: 'found',
                            guild_id: guild.id,
                            discord_user_id: discordUserId,
                            display_name: displayName || username,
                            username,
                        });
                        return;
                    }
                } catch {
                    // Try next guild.
                }
            }

            logReject(req, 'discord member not found in configured guilds');
            respondJson(res, 404, { error: 'Discord member not found in configured guilds.' });
            return;
        }

        if (isCharacterApprovalNotify) {
            const discordUserId = String(payload?.discord_user_id || '').trim();
            const status = String(payload?.status || '').trim();
            const characterName = String(payload?.character_name || '').trim();
            const characterUrl = typeof payload?.character_url === 'string' ? payload.character_url.trim() : '';
            const charactersUrl = typeof payload?.characters_url === 'string' ? payload.characters_url.trim() : '';
            const characterTier = payload?.character_tier ? String(payload.character_tier).trim() : '';
            const characterVersion = payload?.character_version ? String(payload.character_version).trim() : '';
            const characterFaction = payload?.character_faction ? String(payload.character_faction).trim() : '';
            const characterClasses = Array.isArray(payload?.character_classes) ? payload.character_classes : [];
            const characterAvatarUrl = payload?.character_avatar_url ? String(payload.character_avatar_url).trim() : '';
            const externalLink = typeof payload?.external_link === 'string' ? payload.external_link.trim() : '';
            const characterReviewNote = typeof payload?.character_review_note === 'string' ? payload.character_review_note.trim() : '';

            const result = await sendCharacterApprovalDm({
                client,
                discordUserId,
                status,
                characterName,
                characterUrl,
                charactersUrl,
                characterTier,
                characterVersion,
                characterFaction,
                characterClasses,
                characterAvatarUrl,
                characterReviewNote,
                externalLink,
            });

            if (!result.ok) {
                logReject(req, result.error || 'character approval DM failed');
                respondJson(res, result.status || 500, { error: result.error || 'DM failed.' });
                return;
            }

            respondJson(res, 200, { status: 'sent' });
            return;
        }

        if (isCharacterApprovalPending) {
            const channelId = String(payload?.channel_id || '').trim();

            const result = await postCharacterApprovalAnnouncement({
                client,
                channelId,
                payload,
            });

            if (!result.ok) {
                logReject(req, result.error || 'character approval announcement failed');
                respondJson(res, result.status || 500, { error: result.error || 'Announcement failed.' });
                return;
            }

            respondJson(res, 200, {
                status: 'posted',
                channel_id: result.channel_id,
                message_id: result.message_id,
            });
            return;
        }

        if (isCharacterApprovalUpdate) {
            const channelId = String(payload?.channel_id || '').trim();
            const messageId = String(payload?.message_id || '').trim();

            const result = await updateCharacterApprovalAnnouncement({
                client,
                channelId,
                messageId,
                payload,
            });

            if (!result.ok) {
                logReject(req, result.error || 'character approval update failed');
                respondJson(res, result.status || 500, { error: result.error || 'Announcement update failed.' });
                return;
            }

            respondJson(res, 200, { status: 'updated' });
            return;
        }

        if (isCharacterApprovalDelete) {
            const channelId = String(payload?.channel_id || '').trim();
            const messageId = String(payload?.message_id || '').trim();

            const result = await deleteCharacterApprovalAnnouncement({
                client,
                channelId,
                messageId,
            });

            if (!result.ok) {
                logReject(req, result.error || 'character approval delete failed');
                respondJson(res, result.status || 500, { error: result.error || 'Announcement delete failed.' });
                return;
            }

            respondJson(res, 200, { status: 'deleted', deleted: result.deleted ?? false });
            return;
        }

        if (isDiscordChannels) {
            const allowedGuildIds = Array.isArray(payload?.guild_ids) ? payload.guild_ids.map(String) : null;
            try {
                const includeThreads = Boolean(payload?.include_threads);
                const includeArchivedThreads = Boolean(payload?.include_archived_threads);
                const includePrivateThreads = Boolean(payload?.include_private_threads);
                const guilds = await listDiscordChannels(client, allowedGuildIds, {
                    includeThreads,
                    includeArchivedThreads,
                    includePrivateThreads,
                });
                respondJson(res, 200, { guilds });
            } catch {
                logReject(req, 'failed to list channels');
                respondJson(res, 500, { error: 'Failed to list channels.' });
            }
            return;
        }

        if (isDiscordThreads) {
            const channelId = String(payload?.channel_id || '').trim();
            if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
                logReject(req, 'invalid channel_id');
                respondJson(res, 422, { error: 'Invalid channel_id.' });
                return;
            }

            const includeArchivedThreads = Boolean(payload?.include_archived_threads);
            const includePrivateThreads = Boolean(payload?.include_private_threads);

            try {
                const result = await listChannelThreads(client, channelId, {
                    includeArchivedThreads,
                    includePrivateThreads,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'threads lookup failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Failed to list threads.' });
                    return;
                }

                respondJson(res, 200, { threads: result.threads });
            } catch {
                logReject(req, 'failed to list threads');
                respondJson(res, 500, { error: 'Failed to list threads.' });
            }
            return;
        }

        if (isDiscordBackup) {
            const appUrl = String(payload?.app_url || '').trim();
            const guildSelections = Array.isArray(payload?.guilds) ? payload.guilds : null;
            const allowlistByGuild = new Map();

            if (guildSelections) {
                for (const guild of guildSelections) {
                    if (!guild?.guild_id || !Array.isArray(guild?.channel_ids)) {
                        continue;
                    }
                    allowlistByGuild.set(String(guild.guild_id), new Set(guild.channel_ids.map(String)));
                }
            }

            const result = startDiscordBackup(client, appUrl, allowlistByGuild.size ? allowlistByGuild : null);
            if (!result.started) {
                logReject(req, result.error || 'backup rejected');
                const status = result.error === 'App URL is missing.' ? 422 : 409;
                respondJson(res, status, { error: result.error || 'Backup already running.' });
                return;
            }

            respondJson(res, 202, { status: 'started' });
            return;
        }

        if (isDiscordBackupChannel) {
            const appUrl = String(payload?.app_url || '').trim();
            const channelId = String(payload?.channel_id || '').trim();
            const guildId = String(payload?.guild_id || '').trim();
            const guildSelections = Array.isArray(payload?.guilds) ? payload.guilds : null;
            const allowlistByGuild = new Map();

            if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
                logReject(req, 'invalid channel_id');
                respondJson(res, 422, { error: 'Invalid channel_id.' });
                return;
            }

            if (!guildId || !/^[0-9]{5,}$/.test(guildId)) {
                logReject(req, 'invalid guild_id');
                respondJson(res, 422, { error: 'Invalid guild_id.' });
                return;
            }

            if (guildSelections) {
                for (const guild of guildSelections) {
                    if (!guild?.guild_id || !Array.isArray(guild?.channel_ids)) {
                        continue;
                    }
                    allowlistByGuild.set(String(guild.guild_id), new Set(guild.channel_ids.map(String)));
                }
            }

            const result = startDiscordBackupChannel(
                client,
                appUrl,
                channelId,
                guildId,
                allowlistByGuild.size ? allowlistByGuild : null,
            );
            if (!result.started) {
                logReject(req, result.error || 'backup rejected');
                let status = 409;
                if (result.error === 'App URL is missing.') {
                    status = 422;
                } else if (result.error === 'Channel cooldown active.') {
                    status = 429;
                }
                respondJson(res, status, { error: result.error || 'Backup already running.', retry_after_ms: result.retry_after_ms });
                return;
            }

            respondJson(res, 202, { status: 'started' });
            return;
        }

        if (isShopPost) {
            const channelId = String(payload?.channel_id || '').trim();
            const shopId = Number(payload?.shop_id || 0);
            const operationId = Number(payload?.operation_id || 0);
            const threadName = typeof payload?.thread_name === 'string' ? payload.thread_name.trim() : '';

            if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
                logReject(req, 'invalid channel_id');
                respondJson(res, 422, { error: 'Invalid channel_id.' });
                return;
            }

            if (!Number.isFinite(shopId) || shopId <= 0) {
                logReject(req, 'invalid shop_id');
                respondJson(res, 422, { error: 'Invalid shop_id.' });
                return;
            }
            if (payload?.operation_id !== undefined && (!Number.isFinite(operationId) || operationId <= 0)) {
                logReject(req, 'invalid operation_id');
                respondJson(res, 422, { error: 'Invalid operation_id.' });
                return;
            }

            try {
                const result = await postShopToChannel({
                    client,
                    channelId,
                    shopId,
                    operationId: operationId > 0 ? operationId : null,
                    threadName,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'shop post failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Shop post failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'posted',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'shop post failed');
                respondJson(res, 500, { error: 'Shop post failed.' });
                return;
            }
        }

        if (isShopUpdate) {
            const shopId = Number(payload?.shop_id || 0);
            const operationId = Number(payload?.operation_id || 0);
            if (!Number.isFinite(shopId) || shopId <= 0) {
                logReject(req, 'invalid shop_id');
                respondJson(res, 422, { error: 'Invalid shop_id.' });
                return;
            }
            if (payload?.operation_id !== undefined && (!Number.isFinite(operationId) || operationId <= 0)) {
                logReject(req, 'invalid operation_id');
                respondJson(res, 422, { error: 'Invalid operation_id.' });
                return;
            }

            try {
                const result = await updateShopPost({
                    client,
                    shopId,
                    operationId: operationId > 0 ? operationId : null,
                });
                if (!result.ok) {
                    logReject(req, result.error || 'shop update failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Shop update failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'updated',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'shop update failed');
                respondJson(res, 500, { error: 'Shop update failed.' });
                return;
            }
        }

        if (isShopLineUpdate) {
            const shopItemId = Number(payload?.shop_item_id || 0);
            if (!Number.isFinite(shopItemId) || shopItemId <= 0) {
                logReject(req, 'invalid shop_item_id');
                respondJson(res, 422, { error: 'Invalid shop_item_id.' });
                return;
            }

            try {
                const result = await updateShopItemPost({
                    client,
                    shopItemId,
                });
                if (!result.ok) {
                    logReject(req, result.error || 'shop line update failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Shop line update failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'updated',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'shop line update failed');
                respondJson(res, 500, { error: 'Shop line update failed.' });
                return;
            }
        }

        if (isBackstockPost) {
            const channelId = String(payload?.channel_id || '').trim();
            const operationId = Number(payload?.operation_id || 0);

            if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
                logReject(req, 'invalid channel_id');
                respondJson(res, 422, { error: 'Invalid channel_id.' });
                return;
            }
            if (payload?.operation_id !== undefined && (!Number.isFinite(operationId) || operationId <= 0)) {
                logReject(req, 'invalid operation_id');
                respondJson(res, 422, { error: 'Invalid operation_id.' });
                return;
            }

            try {
                const result = await postBackstockToChannel({
                    client,
                    channelId,
                    operationId: operationId > 0 ? operationId : null,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'backstock post failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Backstock post failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'posted',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'backstock post failed');
                respondJson(res, 500, { error: 'Backstock post failed.' });
                return;
            }
        }

        if (isBackstockLineUpdate) {
            const backstockItemId = Number(payload?.backstock_item_id || 0);
            if (!Number.isFinite(backstockItemId) || backstockItemId <= 0) {
                logReject(req, 'invalid backstock_item_id');
                respondJson(res, 422, { error: 'Invalid backstock_item_id.' });
                return;
            }

            try {
                const result = await updateBackstockItemPost({
                    client,
                    backstockItemId,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'backstock line update failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Backstock line update failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'updated',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'backstock line update failed');
                respondJson(res, 500, { error: 'Backstock line update failed.' });
                return;
            }
        }

        if (isAuctionPost) {
            const channelId = String(payload?.channel_id || '').trim();
            const auctionId = Number(payload?.auction_id || 0);
            const operationId = Number(payload?.operation_id || 0);

            if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
                logReject(req, 'invalid channel_id');
                respondJson(res, 422, { error: 'Invalid channel_id.' });
                return;
            }

            if (!Number.isFinite(auctionId) || auctionId <= 0) {
                logReject(req, 'invalid auction_id');
                respondJson(res, 422, { error: 'Invalid auction_id.' });
                return;
            }
            if (payload?.operation_id !== undefined && (!Number.isFinite(operationId) || operationId <= 0)) {
                logReject(req, 'invalid operation_id');
                respondJson(res, 422, { error: 'Invalid operation_id.' });
                return;
            }

            try {
                const result = await postAuctionToChannel({
                    client,
                    channelId,
                    auctionId,
                    operationId: operationId > 0 ? operationId : null,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'auction post failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Auction post failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'posted',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'auction post failed');
                respondJson(res, 500, { error: 'Auction post failed.' });
                return;
            }
        }

        if (isAuctionLineUpdate) {
            const auctionItemId = Number(payload?.auction_item_id || 0);
            if (!Number.isFinite(auctionItemId) || auctionItemId <= 0) {
                logReject(req, 'invalid auction_item_id');
                respondJson(res, 422, { error: 'Invalid auction_item_id.' });
                return;
            }

            try {
                const result = await updateAuctionItemPost({
                    client,
                    auctionItemId,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'auction line update failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Auction line update failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: 'updated',
                    destination_id: result.destinationId,
                    destination_name: result.destinationName,
                });
                return;
            } catch {
                logReject(req, 'auction line update failed');
                respondJson(res, 500, { error: 'Auction line update failed.' });
                return;
            }
        }

        if (isAuctionVoiceBid) {
            const channelId = String(payload?.channel_id || '').trim();
            const auctionItemId = Number(payload?.auction_item_id || 0);
            const bidderDiscordId = payload?.bidder_discord_id ? String(payload.bidder_discord_id).trim() : '';
            const bidderName = typeof payload?.bidder_name === 'string' ? payload.bidder_name.trim() : '';
            const amount = Number(payload?.amount || 0);
            const clear = Boolean(payload?.clear);

            if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
                logReject(req, 'invalid channel_id');
                respondJson(res, 422, { error: 'Invalid channel_id.' });
                return;
            }

            if (!Number.isFinite(auctionItemId) || auctionItemId <= 0) {
                logReject(req, 'invalid auction_item_id');
                respondJson(res, 422, { error: 'Invalid auction_item_id.' });
                return;
            }

            if (!clear && (!Number.isFinite(amount) || amount <= 0)) {
                logReject(req, 'invalid amount');
                respondJson(res, 422, { error: 'Invalid amount.' });
                return;
            }

            try {
                const result = await postVoiceHighestBid({
                    client,
                    channelId,
                    auctionItemId,
                    bidderDiscordId,
                    bidderName,
                    amount,
                    clear,
                });

                if (!result.ok) {
                    logReject(req, result.error || 'auction voice bid failed');
                    respondJson(res, result.status || 500, { error: result.error || 'Auction voice bid failed.' });
                    return;
                }

                respondJson(res, 200, {
                    status: clear ? 'cleared' : 'posted',
                    message_id: result.message_id ?? null,
                });
                return;
            } catch {
                logReject(req, 'auction voice bid failed');
                respondJson(res, 500, { error: 'Auction voice bid failed.' });
                return;
            }
        }

        if (isAuctionItemSold) {
            const auctionItemId = Number(payload?.auction_item_id || 0);
            const winnerDiscordId = payload?.winner_discord_id ? String(payload.winner_discord_id).trim() : '';

            if (!Number.isFinite(auctionItemId) || auctionItemId <= 0) {
                logReject(req, 'invalid auction_item_id');
                respondJson(res, 422, { error: 'Invalid auction_item_id.' });
                return;
            }

            let postUpdated = false;
            let postError = null;
            const updateResult = await updateAuctionItemPost({
                client,
                auctionItemId,
            });
            if (!updateResult.ok) {
                postError = updateResult.error || 'Auction item update failed.';
                console.warn(`[bot] Auction item post update failed for ${auctionItemId}: ${postError}`);
            } else {
                postUpdated = true;
            }

            let voiceUpdated = false;
            let voiceError = null;
            let auctionItem = null;
            try {
                auctionItem = await fetchAuctionItemById(auctionItemId);
            } catch {
                auctionItem = null;
            }

            try {
                const voiceResult = await postVoiceHighestBid({
                    client,
                    channelId: '',
                    auctionItemId,
                    bidderDiscordId: winnerDiscordId || auctionItem?.sold_bidder_discord_id || '',
                    bidderName: auctionItem?.sold_bidder_name || '',
                    amount: auctionItem?.sold_amount ?? 0,
                    sold: true,
                });

                if (!voiceResult.ok) {
                    voiceError = voiceResult.error || 'Auction voice bid sold update failed.';
                    console.warn(`[bot] Auction voice bid sold update failed for ${auctionItemId}: ${voiceError}`);
                } else {
                    voiceUpdated = true;
                }
            } catch (error) {
                voiceError = error instanceof Error ? error.message : 'Auction voice bid sold update failed.';
                console.warn('[bot] Auction voice bid sold update failed.', error);
            }

            let dmSent = false;
            let dmError = null;
            try {
                const discordId = winnerDiscordId || auctionItem?.sold_bidder_discord_id;

                if (discordId && /^[0-9]{5,}$/.test(String(discordId))) {
                    const user = await client.users.fetch(String(discordId));
                    const amount = auctionItem?.sold_amount ?? null;
                    const currency = auctionItem?.auction_currency || 'GP';
                    const itemName = auctionItem?.name || 'item';
                    const auctionId = auctionItem?.auction_id || null;

                    let message = `You won **${itemName}**`;
                    if (amount) {
                        message += ` for **${amount} ${currency}**`;
                    }
                    if (auctionId) {
                        message += ` in Auction #${String(auctionId).padStart(3, '0')}.`;
                    } else {
                        message += '.';
                    }
                    await user.send(message);
                    dmSent = true;
                }
            } catch (error) {
                dmError = error instanceof Error ? error.message : 'DM failed';
                console.warn('[bot] Auction winner DM failed.', error);
            }

            respondJson(res, 200, {
                status: 'updated',
                post_updated: postUpdated,
                post_error: postError,
                voice_updated: voiceUpdated,
                voice_cleared: voiceUpdated,
                voice_error: voiceError,
                dm_sent: dmSent,
                dm_error: dmError,
            });
            return;
        }

        if (isGamesSync) {
            try {
                await runGameAnnouncementSync(client);
                respondJson(res, 200, { status: 'synced' });
                return;
            } catch {
                logReject(req, 'games sync failed');
                respondJson(res, 500, { error: 'Games sync failed.' });
                return;
            }
        }

        const channelId = String(payload?.channel_id || '').trim();
        if (!channelId || !/^[0-9]{5,}$/.test(channelId)) {
            logReject(req, 'invalid channel_id');
            respondJson(res, 422, { error: 'Invalid channel_id.' });
            return;
        }

        const { snapshot, error } = await getSnapshot(channelId, client);
        if (error) {
            logReject(req, `voice sync error: ${error}`);
            respondJson(res, 422, { error });
            return;
        }

        respondJson(res, 200, snapshot);
    });

    server.listen(port, host, () => {
        console.log(`[bot] HTTP control listening on http://${host}:${port}`);
    });

    return server;
}

module.exports = {
    startHttpServer,
};
