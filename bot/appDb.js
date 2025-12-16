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

async function ensureUserForDiscord(discordUser) {
    const discordId = String(discordUser.id);
    const name = pickDiscordDisplayName(discordUser);
    const avatar = pickDiscordAvatarUrl(discordUser);

    const [existing] = await db.execute('SELECT id FROM users WHERE discord_id = ? LIMIT 1', [discordId]);
    if (existing.length > 0) {
        const userId = existing[0].id;
        await db.execute('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?', [name, avatar, nowSql(), userId]);
        return userId;
    }

    const [result] = await db.execute(
        'INSERT INTO users (discord_id, name, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [discordId, name, avatar, nowSql(), nowSql()],
    );
    return result.insertId;
}

async function getDefaultCharacterClassId(connection) {
    const executor = connection ?? db;
    const [rows] = await executor.execute('SELECT id FROM character_classes ORDER BY id ASC LIMIT 1');
    return rows[0]?.id ?? null;
}

async function listCharactersForDiscord(discordUser) {
    const userId = await ensureUserForDiscord(discordUser);
    const [rows] = await db.execute(
        `
            SELECT id, name, start_tier, version, faction, external_link
            FROM characters
            WHERE user_id = ?
              AND deleted_at IS NULL
            ORDER BY position ASC, id ASC
        `,
        [userId],
    );
    return rows;
}

async function findCharacterForDiscord(discordUser, characterId) {
    const userId = await ensureUserForDiscord(discordUser);
    const [rows] = await db.execute(
        `
            SELECT id, name, start_tier, version, faction, external_link, notes
            FROM characters
            WHERE id = ?
              AND user_id = ?
            LIMIT 1
        `,
        [characterId, userId],
    );
    return rows[0] ?? null;
}

async function createCharacterForDiscord(discordUser, { name, startTier, externalLink, notes }) {
    const userId = await ensureUserForDiscord(discordUser);
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
    const userId = await ensureUserForDiscord(discordUser);
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
    const userId = await ensureUserForDiscord(discordUser);
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

module.exports = {
    listCharactersForDiscord,
    findCharacterForDiscord,
    createCharacterForDiscord,
    updateCharacterForDiscord,
    softDeleteCharacterForDiscord,
};

