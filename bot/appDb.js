const db = require('./db');

function nowSql() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function pickDiscordDisplayName(discordUser) {
    return discordUser.globalName || discordUser.username || discordUser.tag || String(discordUser.id);
}

function pickDiscordAvatarUrl(discordUser) {
    if (typeof discordUser.displayAvatarURL === 'function') {
        return discordUser.displayAvatarURL();
    }
    return null;
}

class DiscordNotLinkedError extends Error {
    constructor() {
        super('DISCORD_NOT_LINKED');
        this.name = 'DiscordNotLinkedError';
    }
}

async function getLinkedUserIdForDiscord(discordUser) {
    const discordId = String(discordUser.id);
    const name = pickDiscordDisplayName(discordUser);
    const avatar = pickDiscordAvatarUrl(discordUser);

    const [existing] = await db.execute('SELECT id FROM users WHERE discord_id = ? LIMIT 1', [discordId]);
    if (existing.length > 0) {
        const userId = existing[0].id;
        await db.execute('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?', [name, avatar, nowSql(), userId]);
        return userId;
    }

    return null;
}

async function createUserForDiscord(discordUser) {
    const discordId = String(discordUser.id);
    const name = pickDiscordDisplayName(discordUser);
    const avatar = pickDiscordAvatarUrl(discordUser);

    const existingUserId = await getLinkedUserIdForDiscord(discordUser);
    if (existingUserId) return { created: false, userId: existingUserId };

    const createdAt = nowSql();
    const [result] = await db.execute(
        'INSERT INTO users (discord_id, name, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [discordId, name, avatar, createdAt, createdAt],
    );

    return { created: true, userId: result.insertId };
}

async function getDefaultCharacterClassId(connection) {
    const executor = connection ?? db;
    const [rows] = await executor.execute('SELECT id FROM character_classes ORDER BY id ASC LIMIT 1');
    return rows[0]?.id ?? null;
}

async function listCharactersForDiscord(discordUser) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const [rows] = await db.execute(
        `
            SELECT
                c.id,
                c.name,
                c.start_tier,
                c.version,
                c.faction,
                c.external_link,
                c.avatar,
                c.notes,
                c.dm_bubbles,
                c.dm_coins,
                c.bubble_shop_spend,
                c.is_filler,
                COALESCE(a.adventures_count, 0) AS adventures_count,
                COALESCE(a.adventure_bubbles, 0) AS adventure_bubbles,
                COALESCE(dt.total_downtime, 0) AS total_downtime,
                COALESCE(dt.faction_downtime, 0) AS faction_downtime,
                COALESCE(dt.other_downtime, 0) AS other_downtime,
                COALESCE(cls.class_names, '') AS class_names
            FROM characters c
            LEFT JOIN (
                SELECT
                    character_id,
                    COUNT(*) AS adventures_count,
                    SUM(FLOOR(duration / 10800) + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END) AS adventure_bubbles
                FROM adventures
                WHERE deleted_at IS NULL
                GROUP BY character_id
            ) a ON a.character_id = c.id
            LEFT JOIN (
                SELECT
                    character_id,
                    SUM(duration) AS total_downtime,
                    SUM(CASE WHEN type = 'faction' THEN duration ELSE 0 END) AS faction_downtime,
                    SUM(CASE WHEN type = 'other' THEN duration ELSE 0 END) AS other_downtime
                FROM downtimes
                WHERE deleted_at IS NULL
                GROUP BY character_id
            ) dt ON dt.character_id = c.id
            LEFT JOIN (
                SELECT
                    ccc.character_id,
                    GROUP_CONCAT(cc.name ORDER BY cc.id SEPARATOR '/ ') AS class_names
                FROM character_character_class ccc
                INNER JOIN character_classes cc ON cc.id = ccc.character_class_id
                GROUP BY ccc.character_id
            ) cls ON cls.character_id = c.id
            WHERE c.user_id = ?
              AND c.deleted_at IS NULL
            ORDER BY c.position ASC, c.id ASC
        `,
        [userId],
    );
    return rows;
}

async function findCharacterForDiscord(discordUser, characterId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const [rows] = await db.execute(
        `
            SELECT
                c.id,
                c.name,
                c.start_tier,
                c.version,
                c.faction,
                c.external_link,
                c.avatar,
                c.notes,
                c.dm_bubbles,
                c.dm_coins,
                c.bubble_shop_spend,
                c.is_filler,
                COALESCE(a.adventures_count, 0) AS adventures_count,
                COALESCE(a.adventure_bubbles, 0) AS adventure_bubbles,
                COALESCE(dt.total_downtime, 0) AS total_downtime,
                COALESCE(dt.faction_downtime, 0) AS faction_downtime,
                COALESCE(dt.other_downtime, 0) AS other_downtime,
                COALESCE(cls.class_names, '') AS class_names
            FROM characters c
            LEFT JOIN (
                SELECT
                    character_id,
                    COUNT(*) AS adventures_count,
                    SUM(FLOOR(duration / 10800) + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END) AS adventure_bubbles
                FROM adventures
                WHERE deleted_at IS NULL
                GROUP BY character_id
            ) a ON a.character_id = c.id
            LEFT JOIN (
                SELECT
                    character_id,
                    SUM(duration) AS total_downtime,
                    SUM(CASE WHEN type = 'faction' THEN duration ELSE 0 END) AS faction_downtime,
                    SUM(CASE WHEN type = 'other' THEN duration ELSE 0 END) AS other_downtime
                FROM downtimes
                WHERE deleted_at IS NULL
                GROUP BY character_id
            ) dt ON dt.character_id = c.id
            LEFT JOIN (
                SELECT
                    ccc.character_id,
                    GROUP_CONCAT(cc.name ORDER BY cc.id SEPARATOR '/ ') AS class_names
                FROM character_character_class ccc
                INNER JOIN character_classes cc ON cc.id = ccc.character_class_id
                GROUP BY ccc.character_id
            ) cls ON cls.character_id = c.id
            WHERE c.id = ?
              AND c.user_id = ?
            LIMIT 1
        `,
        [characterId, userId],
    );
    return rows[0] ?? null;
}

async function createCharacterForDiscord(discordUser, { name, startTier, externalLink, notes }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const createdAt = nowSql();

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [insertCharacter] = await connection.execute(
            `
                INSERT INTO characters
                    (name, start_tier, dm_bubbles, dm_coins, bubble_shop_spend, external_link, user_id, created_at, updated_at)
                VALUES
                    (?, ?, 0, 0, 0, ?, ?, ?, ?)
            `,
            [name, startTier, externalLink, userId, createdAt, createdAt],
        );

        const characterId = insertCharacter.insertId;
        const defaultClassId = await getDefaultCharacterClassId(connection);
        if (defaultClassId) {
            await connection.execute(
                'INSERT INTO character_character_class (character_id, character_class_id) VALUES (?, ?)',
                [characterId, defaultClassId],
            );
        }

        if (typeof notes === 'string' && notes.trim().length > 0) {
            await connection.execute(
                'UPDATE characters SET notes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
                [notes, createdAt, characterId, userId],
            );
        }

        await connection.commit();
        return characterId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateCharacterForDiscord(discordUser, characterId, { name, startTier, externalLink, notes }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const existing = await findCharacterForDiscord(discordUser, characterId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const updatedAt = nowSql();
    const newName = typeof name === 'string' ? name : existing.name;
    const newStartTier = typeof startTier === 'string' ? startTier : existing.start_tier;
    const newExternalLink = typeof externalLink === 'string' ? externalLink : existing.external_link;
    const newNotes = typeof notes === 'string' ? notes : existing.notes;

    await db.execute(
        `
            UPDATE characters
            SET name = ?, start_tier = ?, external_link = ?, notes = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `,
        [newName, newStartTier, newExternalLink, newNotes, updatedAt, characterId, userId],
    );

    return { ok: true };
}

async function softDeleteCharacterForDiscord(discordUser, characterId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const updatedAt = nowSql();

    const [rows] = await db.execute(
        'SELECT id FROM characters WHERE id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1',
        [characterId, userId],
    );
    if (rows.length === 0) return { ok: false, reason: 'not_found' };

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            'DELETE FROM adventures WHERE character_id = ? AND deleted_at IS NOT NULL',
            [characterId],
        );
        await connection.execute(
            'DELETE FROM downtimes WHERE character_id = ? AND deleted_at IS NOT NULL',
            [characterId],
        );

        await connection.execute(
            'UPDATE adventures SET deleted_at = ?, updated_at = ? WHERE character_id = ? AND deleted_at IS NULL',
            [updatedAt, updatedAt, characterId],
        );
        await connection.execute(
            'UPDATE downtimes SET deleted_at = ?, updated_at = ? WHERE character_id = ? AND deleted_at IS NULL',
            [updatedAt, updatedAt, characterId],
        );

        await connection.execute(
            'UPDATE characters SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
            [updatedAt, updatedAt, characterId, userId],
        );

        await connection.commit();
        return { ok: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

function formatSqlDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    return raw;
}

async function listAdventuresForDiscord(discordUser, characterId, limit = 25) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25));
    const [rows] = await db.execute(
        `
            SELECT a.id, a.duration, a.start_date, a.has_additional_bubble, a.notes, a.title, a.game_master, a.character_id
            FROM adventures a
            INNER JOIN characters c ON c.id = a.character_id
            WHERE a.character_id = ?
              AND c.user_id = ?
              AND a.deleted_at IS NULL
            ORDER BY a.start_date DESC, a.id DESC
            LIMIT ${safeLimit}
        `,
        [characterId, userId],
    );
    return rows;
}

async function findAdventureForDiscord(discordUser, adventureId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const [rows] = await db.execute(
        `
            SELECT a.id, a.duration, a.start_date, a.has_additional_bubble, a.notes, a.title, a.game_master, a.character_id
            FROM adventures a
            INNER JOIN characters c ON c.id = a.character_id
            WHERE a.id = ?
              AND c.user_id = ?
            LIMIT 1
        `,
        [adventureId, userId],
    );

    return rows[0] ?? null;
}

async function createAdventureForDiscord(discordUser, { characterId, duration, startDate, hasAdditionalBubble, notes, title, gameMaster }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const character = await findCharacterForDiscord(discordUser, characterId);
    if (!character) return { ok: false, reason: 'character_not_found' };

    const date = formatSqlDate(startDate);
    if (!date) return { ok: false, reason: 'invalid_date' };

    const safeDuration = Number(duration);
    if (!Number.isFinite(safeDuration) || safeDuration < 0) return { ok: false, reason: 'invalid_duration' };

    const createdAt = nowSql();
    const [result] = await db.execute(
        `
            INSERT INTO adventures (duration, start_date, has_additional_bubble, notes, title, game_master, character_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            Math.floor(safeDuration),
            date,
            hasAdditionalBubble ? 1 : 0,
            notes ?? null,
            title ?? null,
            gameMaster ?? null,
            characterId,
            createdAt,
            createdAt,
        ],
    );

    return { ok: true, id: result.insertId };
}

async function updateAdventureForDiscord(discordUser, adventureId, { duration, startDate, notes, title, gameMaster }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findAdventureForDiscord(discordUser, adventureId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const date = formatSqlDate(startDate) || existing.start_date;
    const safeDuration = Number.isFinite(Number(duration)) ? Math.floor(Number(duration)) : existing.duration;
    const newNotes = typeof notes === 'string' ? notes : existing.notes;
    const newTitle = typeof title === 'string' ? title : existing.title;
    const newGameMaster = typeof gameMaster === 'string' ? gameMaster : existing.game_master;

    await db.execute(
        `
            UPDATE adventures
            SET duration = ?, start_date = ?, notes = ?, title = ?, game_master = ?, updated_at = ?
            WHERE id = ?
        `,
        [safeDuration, date, newNotes ?? null, newTitle ?? null, newGameMaster ?? null, nowSql(), adventureId],
    );

    return { ok: true };
}

async function softDeleteAdventureForDiscord(discordUser, adventureId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findAdventureForDiscord(discordUser, adventureId);
    if (!existing) return { ok: false, reason: 'not_found' };

    await db.execute(
        `
            UPDATE adventures a
            INNER JOIN characters c ON c.id = a.character_id
            SET a.deleted_at = ?, a.updated_at = ?
            WHERE a.id = ? AND c.user_id = ? AND a.deleted_at IS NULL
        `,
        [nowSql(), nowSql(), adventureId, userId],
    );

    return { ok: true };
}

async function listDowntimesForDiscord(discordUser, characterId, limit = 25) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const safeLimit = Math.max(1, Math.min(25, Number(limit) || 25));
    const [rows] = await db.execute(
        `
            SELECT d.id, d.duration, d.start_date, d.type, d.notes, d.character_id
            FROM downtimes d
            INNER JOIN characters c ON c.id = d.character_id
            WHERE d.character_id = ?
              AND c.user_id = ?
              AND d.deleted_at IS NULL
            ORDER BY d.start_date DESC, d.id DESC
            LIMIT ${safeLimit}
        `,
        [characterId, userId],
    );
    return rows;
}

async function findDowntimeForDiscord(discordUser, downtimeId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const [rows] = await db.execute(
        `
            SELECT d.id, d.duration, d.start_date, d.type, d.notes, d.character_id
            FROM downtimes d
            INNER JOIN characters c ON c.id = d.character_id
            WHERE d.id = ?
              AND c.user_id = ?
            LIMIT 1
        `,
        [downtimeId, userId],
    );

    return rows[0] ?? null;
}

async function createDowntimeForDiscord(discordUser, { characterId, duration, startDate, type, notes }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const character = await findCharacterForDiscord(discordUser, characterId);
    if (!character) return { ok: false, reason: 'character_not_found' };

    const date = formatSqlDate(startDate);
    if (!date) return { ok: false, reason: 'invalid_date' };

    const safeDuration = Number(duration);
    if (!Number.isFinite(safeDuration) || safeDuration < 0) return { ok: false, reason: 'invalid_duration' };

    const safeType = String(type || '').trim().toLowerCase();
    if (safeType !== 'faction' && safeType !== 'other') return { ok: false, reason: 'invalid_type' };

    const createdAt = nowSql();
    const [result] = await db.execute(
        `
            INSERT INTO downtimes (duration, start_date, type, notes, character_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [Math.floor(safeDuration), date, safeType, notes ?? null, characterId, createdAt, createdAt],
    );

    return { ok: true, id: result.insertId };
}

async function updateDowntimeForDiscord(discordUser, downtimeId, { duration, startDate, type, notes }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findDowntimeForDiscord(discordUser, downtimeId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const date = formatSqlDate(startDate) || existing.start_date;
    const safeDuration = Number.isFinite(Number(duration)) ? Math.floor(Number(duration)) : existing.duration;
    const safeType = String(type || existing.type || '').trim().toLowerCase();
    if (safeType !== 'faction' && safeType !== 'other') return { ok: false, reason: 'invalid_type' };
    const newNotes = typeof notes === 'string' ? notes : existing.notes;

    await db.execute(
        `
            UPDATE downtimes
            SET duration = ?, start_date = ?, type = ?, notes = ?, updated_at = ?
            WHERE id = ?
        `,
        [safeDuration, date, safeType, newNotes ?? null, nowSql(), downtimeId],
    );

    return { ok: true };
}

async function softDeleteDowntimeForDiscord(discordUser, downtimeId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findDowntimeForDiscord(discordUser, downtimeId);
    if (!existing) return { ok: false, reason: 'not_found' };

    await db.execute(
        `
            UPDATE downtimes d
            INNER JOIN characters c ON c.id = d.character_id
            SET d.deleted_at = ?, d.updated_at = ?
            WHERE d.id = ? AND c.user_id = ? AND d.deleted_at IS NULL
        `,
        [nowSql(), nowSql(), downtimeId, userId],
    );

    return { ok: true };
}

module.exports = {
    DiscordNotLinkedError,
    getLinkedUserIdForDiscord,
    createUserForDiscord,
    listCharactersForDiscord,
    findCharacterForDiscord,
    createCharacterForDiscord,
    updateCharacterForDiscord,
    softDeleteCharacterForDiscord,
    listAdventuresForDiscord,
    findAdventureForDiscord,
    createAdventureForDiscord,
    updateAdventureForDiscord,
    softDeleteAdventureForDiscord,
    listDowntimesForDiscord,
    findDowntimeForDiscord,
    createDowntimeForDiscord,
    updateDowntimeForDiscord,
    softDeleteDowntimeForDiscord,
};
