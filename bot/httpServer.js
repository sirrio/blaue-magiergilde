const http = require('node:http');
const { startDiscordBackup } = require('./discordBackup');
const { getSnapshot } = require('./voiceStateCache');

const RATE_LIMIT_WINDOW_MS = Number(process.env.BOT_HTTP_RATE_LIMIT_MS || 15000);
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

function isRateLimited(req) {
    if (!Number.isFinite(RATE_LIMIT_WINDOW_MS) || RATE_LIMIT_WINDOW_MS <= 0) {
        return false;
    }

    const ip = getClientIp(req);
    const now = Date.now();
    const lastSeen = rateLimit.get(ip) || 0;
    if (now - lastSeen < RATE_LIMIT_WINDOW_MS) {
        return true;
    }

    rateLimit.set(ip, now);
    return false;
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

        if (req.method !== 'POST' || (!isVoiceSync && !isDiscordBackup)) {
            respondJson(res, 404, { error: 'Not found.' });
            return;
        }

        if (isRateLimited(req)) {
            logReject(req, 'rate limited');
            respondJson(res, 429, { error: 'Too many requests.' });
            return;
        }

        const providedToken = req.headers['x-bot-token'];
        if (typeof providedToken !== 'string' || providedToken !== token) {
            logReject(req, 'unauthorized');
            respondJson(res, 401, { error: 'Unauthorized.' });
            return;
        }

        let payload;
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

        if (isDiscordBackup) {
            const appUrl = String(payload?.app_url || '').trim();
            const result = startDiscordBackup(client, appUrl);
            if (!result.started) {
                logReject(req, result.error || 'backup rejected');
                const status = result.error === 'App URL is missing.' ? 422 : 409;
                respondJson(res, status, { error: result.error || 'Backup already running.' });
                return;
            }

            respondJson(res, 202, { status: 'started' });
            return;
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
