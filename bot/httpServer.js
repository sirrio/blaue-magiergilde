const http = require('node:http');

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

function buildCandidate(member) {
    const name = String(member.displayName || member.user?.username || '').trim();
    if (!name) return null;
    if (member.user?.bot) return null;

    const avatar = typeof member.displayAvatarURL === 'function'
        ? member.displayAvatarURL({ extension: 'png', size: 128 })
        : null;

    return {
        id: String(member.id),
        name,
        avatar: avatar || null,
    };
}

function startHttpServer(client) {
    const token = String(process.env.BOT_HTTP_TOKEN || '').trim();
    if (!token) {
        console.warn('[bot] BOT_HTTP_TOKEN missing; HTTP control is disabled.');
        return null;
    }

    const { host, port } = resolveListenConfig();

    const server = http.createServer(async (req, res) => {
        if (req.method !== 'POST' || req.url?.split('?')[0] !== '/voice-sync') {
            respondJson(res, 404, { error: 'Not found.' });
            return;
        }

        const providedToken = req.headers['x-bot-token'];
        if (typeof providedToken !== 'string' || providedToken !== token) {
            respondJson(res, 401, { error: 'Unauthorized.' });
            return;
        }

        let payload;
        try {
            payload = await readJson(req);
        } catch (error) {
            respondJson(res, 400, { error: 'Invalid JSON.' });
            return;
        }

        const channelId = String(payload?.channel_id || '').trim();
        if (!channelId) {
            respondJson(res, 422, { error: 'Missing channel_id.' });
            return;
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || typeof channel.isVoiceBased !== 'function' || !channel.isVoiceBased()) {
                respondJson(res, 422, { error: 'Channel is not voice-based.' });
                return;
            }

            const members = Array.from(channel.members?.values() || [])
                .map(buildCandidate)
                .filter(Boolean);

            respondJson(res, 200, { channel_id: channelId, members });
        } catch (error) {
            respondJson(res, 500, { error: error.message });
        }
    });

    server.listen(port, host, () => {
        console.log(`[bot] HTTP control listening on http://${host}:${port}`);
    });

    return server;
}

module.exports = {
    startHttpServer,
};
