const db = require('./db');
const { scanGameAnnouncements } = require('./discordGameScanner');
const { getGamesScanSinceDate } = require('./gameScanWindow');
const { resolveChannelId } = require('./channelOverride');

function nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function toSqlDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function fetchGameSyncSettings() {
    try {
        const [rows] = await db.execute(
            'SELECT games_channel_id, games_scan_years, games_scan_interval_minutes FROM discord_bot_settings ORDER BY id LIMIT 1',
        );
        const row = rows?.[0] ?? {};
        const channelId = resolveChannelId(row.games_channel_id);
        const rawYears = Number(row.games_scan_years);
        const scanYears = Number.isFinite(rawYears) && rawYears > 0 ? rawYears : 10;
        const rawMinutes = Number(row.games_scan_interval_minutes);
        const scanIntervalMinutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : 60;
        return { channelId, scanYears, scanIntervalMinutes };
    } catch {
        return { channelId: '', scanYears: 10, scanIntervalMinutes: 60 };
    }
}

async function syncGameAnnouncements(client) {
    const { channelId, scanYears } = await fetchGameSyncSettings();
    if (!channelId) {
        console.warn('[bot] Game sync skipped: games channel not configured.');
        return;
    }

    const since = getGamesScanSinceDate({ years: scanYears });

    const result = await scanGameAnnouncements(client, {
        channelId,
        since: since.toISOString(),
    });

    if (!result.ok) {
        console.warn(`[bot] Game sync failed: ${result.error || 'Unknown error'}`);
        return;
    }

    if (!result.games.length) {
        return;
    }

    const timestamp = nowSql();
    const rows = result.games
        .filter(game => game && game.discord_message_id)
        .map(game => ({
            discord_channel_id: String(game.discord_channel_id || channelId),
            discord_guild_id: game.discord_guild_id || null,
            discord_message_id: String(game.discord_message_id),
            discord_author_id: game.discord_author_id || null,
            discord_author_name: game.discord_author_name || null,
            discord_author_avatar_url: game.discord_author_avatar_url || null,
            title: game.title || null,
            content: game.content || null,
            tier: game.tier || null,
            starts_at: game.starts_at || null,
            posted_at: toSqlDateTime(game.posted_at),
            confidence: Number(game.confidence || 0),
            cancelled: game.cancelled ? 1 : 0,
            created_at: timestamp,
            updated_at: timestamp,
        }));

    if (!rows.length) {
        return;
    }

    const placeholders = rows
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ');
    const values = rows.flatMap(row => [
        row.discord_channel_id,
        row.discord_guild_id,
        row.discord_message_id,
        row.discord_author_id,
        row.discord_author_name,
        row.discord_author_avatar_url,
        row.title,
        row.content,
        row.tier,
        row.starts_at,
        row.posted_at,
        row.confidence,
        row.cancelled,
        row.created_at,
        row.updated_at,
    ]);

    const sql = `
        INSERT INTO game_announcements (
            discord_channel_id,
            discord_guild_id,
            discord_message_id,
            discord_author_id,
            discord_author_name,
            discord_author_avatar_url,
            title,
            content,
            tier,
            starts_at,
            posted_at,
            confidence,
            cancelled,
            created_at,
            updated_at
        )
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
            discord_channel_id = VALUES(discord_channel_id),
            discord_guild_id = VALUES(discord_guild_id),
            discord_author_id = VALUES(discord_author_id),
            discord_author_name = VALUES(discord_author_name),
            discord_author_avatar_url = VALUES(discord_author_avatar_url),
            title = VALUES(title),
            content = VALUES(content),
            tier = VALUES(tier),
            starts_at = VALUES(starts_at),
            posted_at = VALUES(posted_at),
            confidence = VALUES(confidence),
            cancelled = VALUES(cancelled),
            updated_at = VALUES(updated_at)
    `;

    await db.execute(sql, values);
}

function startGameAnnouncementSync(client) {
    let inFlight = false;

    const runSync = async () => {
        if (inFlight) return;
        inFlight = true;
        try {
            await syncGameAnnouncements(client);
        } catch (error) {
            console.warn('[bot] Game sync error:', error);
        } finally {
            inFlight = false;
            scheduleNext();
        }
    };

    let scheduled = null;
    const scheduleNext = async () => {
        if (scheduled) {
            clearTimeout(scheduled);
        }
        const { scanIntervalMinutes } = await fetchGameSyncSettings();
        const intervalMs = Math.max(10_000, scanIntervalMinutes * 60_000);
        scheduled = setTimeout(runSync, intervalMs);
        scheduled.unref();
    };

    void runSync();
}

module.exports = {
    startGameAnnouncementSync,
    runGameAnnouncementSync: syncGameAnnouncements,
};
