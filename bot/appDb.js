const db = require('./db');
const { additionalBubblesForStartTier, calculateLevel, calculateTierFromLevel } = require('./utils/characterTier');
const { getBidStepForItem, getStartingBidFromRepair, getMinimumBid } = require('./utils/auctionBidding');
const {
    calculateMinAllowedLevel,
    calculateRequiredAdventureBubbles,
} = require('./utils/quickMode');
const { activeLevelProgressionVersionId, bubblesRequiredForLevel, ensureLevelProgressionLoaded } = require('./utils/levelProgression');

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

function uniqueNumberList(values) {
    if (!Array.isArray(values)) return [];
    const numbers = values
        .map(value => Number(value))
        .filter(value => Number.isFinite(value) && value > 0)
        .map(value => Math.floor(value));
    return Array.from(new Set(numbers));
}

const allowedTiers = new Set(['bt', 'lt', 'ht', 'et']);
const allowedVersions = new Set(['2014', '2024']);
const allowedFactions = new Set([
    'none',
    'heiler',
    'handwerker',
    'feldforscher',
    'bibliothekare',
    'diplomaten',
    'gardisten',
    'unterhalter',
    'logistiker',
    'flora & fauna',
    'agenten',
    'waffenmeister',
    'arkanisten',
]);
const allowedGuildStatuses = new Set(['pending', 'approved', 'declined', 'needs_changes', 'retired', 'draft']);
const allowedUserGuildStatuses = new Set(['pending', 'draft']);
const allowedBotLocales = new Set(['de', 'en']);
const isCharacterStatusSwitchEnabled = String(process.env.FEATURE_CHARACTER_STATUS_SWITCH ?? 'true').trim().toLowerCase() !== 'false';
const maxActiveCharacters = 8;
const exemptHighTierCharacters = 2;

function guildCharacterStatusesForAllies() {
    const statuses = ['pending', 'approved', 'needs_changes'];
    if (!isCharacterStatusSwitchEnabled) {
        statuses.push('draft');
    }
    return statuses;
}

function normalizeTier(value, fallback = 'bt') {
    const tier = String(value || '').trim().toLowerCase();
    return allowedTiers.has(tier) ? tier : fallback;
}

function normalizeVersion(value, fallback = '2024') {
    const version = String(value || '').trim();
    return allowedVersions.has(version) ? version : fallback;
}

function normalizeFaction(value, fallback = 'none') {
    const faction = String(value || '').trim().toLowerCase();
    return allowedFactions.has(faction) ? faction : fallback;
}

function normalizeGuildStatus(value, fallback = 'pending') {
    const status = String(value || '').trim().toLowerCase();
    return allowedGuildStatuses.has(status) ? status : fallback;
}

function normalizeUserGuildStatus(value, fallback = 'draft') {
    const status = normalizeGuildStatus(value, fallback);
    return allowedUserGuildStatuses.has(status) ? status : fallback;
}

function normalizeBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    const text = String(value || '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'ja', 'j'].includes(text)) return true;
    if (['0', 'false', 'no', 'n', 'nein'].includes(text)) return false;
    return fallback;
}

function normalizeBotLocale(value, fallback = null) {
    const locale = String(value || '').trim().toLowerCase();
    if (allowedBotLocales.has(locale)) {
        return locale;
    }

    return fallback;
}

function normalizeNumber(value, fallback = 0, max = 1024) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(max, Math.floor(number)));
}

function normalizeLevel(value, fallback = null) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    const normalized = Math.floor(number);
    if (normalized < 1 || normalized > 20) return fallback;
    return normalized;
}

function safeInt(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function todaySqlDate() {
    return new Date().toISOString().slice(0, 10);
}

function bubblesForDuration(duration, hasAdditionalBubble) {
    const normalizedDuration = safeInt(duration);
    const bubbleCount = Math.floor(normalizedDuration / 10800);
    return bubbleCount + (hasAdditionalBubble ? 1 : 0);
}

function normalizeAvatar(value) {
    const text = String(value || '').trim();
    if (isDiscordAttachmentUrl(text)) {
        return null;
    }
    return text.length > 0 ? text : null;
}

function isDiscordAttachmentUrl(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }

    try {
        const parsed = new URL(value);
        const host = normalizeHost(parsed.hostname);

        return (host === 'cdn.discordapp.com' || host === 'media.discordapp.net')
            && parsed.pathname.startsWith('/attachments/');
    } catch {
        return false;
    }
}

function normalizeHost(rawHost) {
    const host = String(rawHost || '').trim().toLowerCase();
    if (!host) return '';
    return host.startsWith('www.') ? host.slice(4) : host;
}

function isDnDBeyondCharacterUrl(urlString) {
    const raw = String(urlString || '').trim();
    if (!raw) return false;

    let parsed;
    try {
        parsed = new URL(raw);
    } catch {
        return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
    }

    const host = normalizeHost(parsed.hostname);
    if (!(host === 'dndbeyond.com' || host.endsWith('.dndbeyond.com'))) {
        return false;
    }

    const path = String(parsed.pathname || '').toLowerCase();
    return path === '/characters' || path.startsWith('/characters/');
}

class DiscordNotLinkedError extends Error {
    constructor() {
        super('DISCORD_NOT_LINKED');
        this.name = 'DiscordNotLinkedError';
    }
}

async function getLinkedUserIdForDiscord(discordUser) {
    const linkedUser = await getLinkedUserForDiscord(discordUser);
    return linkedUser?.id ?? null;
}

async function getLinkedUserForDiscord(discordUser) {
    const discordId = String(discordUser.id);
    const name = pickDiscordDisplayName(discordUser);
    const avatar = pickDiscordAvatarUrl(discordUser);

    const [existing] = await db.execute('SELECT id, deleted_at, locale, simplified_tracking FROM users WHERE discord_id = ? LIMIT 1', [discordId]);
    if (existing.length > 0) {
        const userId = existing[0].id;
        const deletedAt = existing[0].deleted_at;
        if (deletedAt) {
            await db.execute('UPDATE users SET deleted_at = NULL, name = ?, avatar = ?, updated_at = ? WHERE id = ?', [name, avatar, nowSql(), userId]);
        } else {
            await db.execute('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?', [name, avatar, nowSql(), userId]);
        }
        return {
            id: userId,
            locale: normalizeBotLocale(existing[0].locale),
            simplifiedTracking: existing[0].simplified_tracking === null || existing[0].simplified_tracking === undefined
                ? null
                : Boolean(existing[0].simplified_tracking),
        };
    }

    return null;
}

async function getLinkedUserLocaleForDiscord(discordUser) {
    const linkedUser = await getLinkedUserForDiscord(discordUser);
    return linkedUser?.locale ?? null;
}

async function getLinkedUserTrackingDefaultForDiscord(discordUser) {
    const linkedUser = await getLinkedUserForDiscord(discordUser);
    return linkedUser?.simplifiedTracking ?? null;
}

async function getUserLocaleByDiscordId(discordUserId) {
    if (!discordUserId) {
        return null;
    }

    const [rows] = await db.execute('SELECT locale FROM users WHERE discord_id = ? LIMIT 1', [String(discordUserId)]);
    return normalizeBotLocale(rows[0]?.locale);
}

async function updateLinkedUserLocaleForDiscord(discordUser, locale) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) {
        throw new DiscordNotLinkedError();
    }

    const normalizedLocale = normalizeBotLocale(locale, 'de');
    await db.execute('UPDATE users SET locale = ?, updated_at = ? WHERE id = ?', [normalizedLocale, nowSql(), userId]);
    return normalizedLocale;
}

async function updateLinkedUserTrackingDefaultForDiscord(discordUser, simplifiedTracking) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) {
        throw new DiscordNotLinkedError();
    }

    const normalizedValue = simplifiedTracking === null || simplifiedTracking === undefined
        ? null
        : (normalizeBoolean(simplifiedTracking, false) ? 1 : 0);

    await db.execute('UPDATE users SET simplified_tracking = ?, updated_at = ? WHERE id = ?', [normalizedValue, nowSql(), userId]);

    return normalizedValue === null ? null : Boolean(normalizedValue);
}

async function createUserForDiscord(discordUser) {
    const discordId = String(discordUser.id);
    const name = pickDiscordDisplayName(discordUser);
    const avatar = pickDiscordAvatarUrl(discordUser);

    const existingUserId = await getLinkedUserIdForDiscord(discordUser);
    if (existingUserId) return { created: false, userId: existingUserId };

    const createdAt = nowSql();
    try {
        const [result] = await db.execute(
            'INSERT INTO users (discord_id, name, avatar, simplified_tracking, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [discordId, name, avatar, null, createdAt, createdAt],
        );

        return { created: true, userId: result.insertId };
    } catch (error) {
        if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
            const linkedUserId = await getLinkedUserIdForDiscord(discordUser);
            if (linkedUserId) {
                return { created: false, userId: linkedUserId };
            }
        }

        throw error;
    }
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
                c.manual_adventures_count,
                c.manual_faction_rank,
                c.manual_total_downtime_seconds,
                c.is_filler,
                c.guild_status,
                c.registration_note,
                c.simplified_tracking,
                c.avatar_masked,
                c.private_mode,
                CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_room,
                COALESCE(a.adventures_count, 0) AS adventures_count,
                COALESCE(a.adventure_bubbles, 0) AS adventure_bubbles,
                COALESCE(a.has_pseudo_adventure, 0) AS has_pseudo_adventure,
                COALESCE(dt.total_downtime, 0) AS total_downtime,
                COALESCE(dt.faction_downtime, 0) AS faction_downtime,
                COALESCE(dt.other_downtime, 0) AS other_downtime,
                COALESCE(cls.class_names, '') AS class_names
            FROM characters c
            LEFT JOIN rooms r ON r.character_id = c.id
            LEFT JOIN (
                SELECT
                    a.character_id,
                    COUNT(*) AS adventures_count,
                    SUM(
                        CASE
                            WHEN lp.id IS NULL THEN
                                FLOOR(a.duration / 10800) + CASE WHEN a.has_additional_bubble = 1 THEN 1 ELSE 0 END
                            WHEN a.id = lp.id THEN
                                -- target_bubbles stores the exact available-bubble count at pseudo-creation
                                -- time (preserving fractional progress).  Fall back to the level-floor via
                                -- level_progressions for rows that pre-date the column.
                                COALESCE(lp.target_bubbles, lprog.required_bubbles, 0)
                            WHEN a.is_pseudo = 0 AND (a.start_date > lp.start_date OR (a.start_date = lp.start_date AND a.id > lp.id)) THEN
                                FLOOR(a.duration / 10800) + CASE WHEN a.has_additional_bubble = 1 THEN 1 ELSE 0 END
                            ELSE 0
                        END
                    ) AS adventure_bubbles,
                    MAX(CASE WHEN a.is_pseudo = 1 THEN 1 ELSE 0 END) AS has_pseudo_adventure
                FROM adventures a
                LEFT JOIN (
                    SELECT character_id, id, start_date, target_level, target_bubbles,
                           ROW_NUMBER() OVER (PARTITION BY character_id ORDER BY start_date DESC, id DESC) AS rn
                    FROM adventures
                    WHERE deleted_at IS NULL AND is_pseudo = 1
                ) lp ON lp.character_id = a.character_id AND lp.rn = 1
                LEFT JOIN level_progressions lprog
                    ON lprog.level = lp.target_level
                    AND lprog.version_id = (SELECT id FROM level_progression_versions WHERE is_active = 1 LIMIT 1)
                WHERE a.deleted_at IS NULL
                GROUP BY a.character_id
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

function submittedCharacterCounts(characters, excludeCharacterId = null) {
    const submittedCharacters = (characters || []).filter(character => {
        if (excludeCharacterId !== null && Number(character.id) === Number(excludeCharacterId)) {
            return false;
        }

        const status = String(character.guild_status || '').trim().toLowerCase();
        return status === 'approved' || status === 'pending';
    });

    const submittedFillerCount = submittedCharacters.filter(character => Boolean(character.is_filler)).length;
    const submittedHighTierCount = submittedCharacters.filter(character => {
        if (character.is_filler) {
            return false;
        }

        return calculateTierFromLevel(calculateLevel(character)) === 'HT';
    }).length;
    const submittedLowAndBaseTierCount = submittedCharacters.filter(character => {
        if (character.is_filler) {
            return false;
        }

        const tier = calculateTierFromLevel(calculateLevel(character));
        return tier === 'BT' || tier === 'LT';
    }).length;

    return {
        submittedFillerCount,
        submittedHighTierCount,
        consumedGeneralSlots: submittedLowAndBaseTierCount + Math.max(0, submittedHighTierCount - exemptHighTierCharacters),
    };
}

async function getCharacterSubmissionStateForDiscord(discordUser, characterId) {
    const character = await findCharacterForDiscord(discordUser, characterId);
    if (!character) {
        return { ok: false, reason: 'not_found' };
    }

    const characters = await listCharactersForDiscord(discordUser);
    const counts = submittedCharacterCounts(characters, characterId);
    const tier = character.is_filler ? 'FILLER' : calculateTierFromLevel(calculateLevel(character));
    const candidateGeneralSlotCost = character.is_filler
        ? 0
        : (tier === 'BT' || tier === 'LT'
            ? 1
            : (tier === 'HT' && counts.submittedHighTierCount >= exemptHighTierCharacters ? 1 : 0));

    if (character.is_filler && counts.submittedFillerCount >= 1) {
        return {
            ok: true,
            character,
            blockedReason: 'filler_limit',
            counts,
        };
    }

    if (candidateGeneralSlotCost > 0 && (counts.consumedGeneralSlots + candidateGeneralSlotCost) > maxActiveCharacters) {
        return {
            ok: true,
            character,
            blockedReason: 'active_limit',
            counts,
        };
    }

    return {
        ok: true,
        character,
        blockedReason: null,
        counts,
    };
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
                c.manual_adventures_count,
                c.manual_faction_rank,
                c.manual_total_downtime_seconds,
                c.is_filler,
                c.guild_status,
                c.registration_note,
                c.simplified_tracking,
                c.avatar_masked,
                c.private_mode,
                CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS has_room,
                COALESCE(a.adventures_count, 0) AS adventures_count,
                COALESCE(a.adventure_bubbles, 0) AS adventure_bubbles,
                COALESCE(a.has_pseudo_adventure, 0) AS has_pseudo_adventure,
                COALESCE(dt.total_downtime, 0) AS total_downtime,
                COALESCE(dt.faction_downtime, 0) AS faction_downtime,
                COALESCE(dt.other_downtime, 0) AS other_downtime,
                COALESCE(cls.class_names, '') AS class_names
            FROM characters c
            LEFT JOIN rooms r ON r.character_id = c.id
            LEFT JOIN (
                SELECT
                    a.character_id,
                    COUNT(*) AS adventures_count,
                    SUM(
                        CASE
                            WHEN lp.id IS NULL THEN
                                FLOOR(a.duration / 10800) + CASE WHEN a.has_additional_bubble = 1 THEN 1 ELSE 0 END
                            WHEN a.id = lp.id THEN
                                -- target_bubbles stores the exact available-bubble count at pseudo-creation
                                -- time (preserving fractional progress).  Fall back to the level-floor via
                                -- level_progressions for rows that pre-date the column.
                                COALESCE(lp.target_bubbles, lprog.required_bubbles, 0)
                            WHEN a.is_pseudo = 0 AND (a.start_date > lp.start_date OR (a.start_date = lp.start_date AND a.id > lp.id)) THEN
                                FLOOR(a.duration / 10800) + CASE WHEN a.has_additional_bubble = 1 THEN 1 ELSE 0 END
                            ELSE 0
                        END
                    ) AS adventure_bubbles,
                    MAX(CASE WHEN a.is_pseudo = 1 THEN 1 ELSE 0 END) AS has_pseudo_adventure
                FROM adventures a
                LEFT JOIN (
                    SELECT character_id, id, start_date, target_level, target_bubbles,
                           ROW_NUMBER() OVER (PARTITION BY character_id ORDER BY start_date DESC, id DESC) AS rn
                    FROM adventures
                    WHERE deleted_at IS NULL AND is_pseudo = 1
                ) lp ON lp.character_id = a.character_id AND lp.rn = 1
                LEFT JOIN level_progressions lprog
                    ON lprog.level = lp.target_level
                    AND lprog.version_id = (SELECT id FROM level_progression_versions WHERE is_active = 1 LIMIT 1)
                WHERE a.deleted_at IS NULL
                GROUP BY a.character_id
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

async function updateCharacterManualLevelForDiscord(discordUser, characterId, manualLevel, bubblesInLevel = 0) {
    await ensureLevelProgressionLoaded();

    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findCharacterForDiscord(discordUser, characterId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const level = normalizeLevel(manualLevel, null);
    if (!level) return { ok: false, reason: 'invalid_level' };

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const activeVersionId = activeLevelProgressionVersionId();

        const [[character]] = await connection.execute(
            `
                SELECT id, start_tier, dm_bubbles, bubble_shop_spend, is_filler, simplified_tracking
                FROM characters
                WHERE id = ? AND user_id = ?
                LIMIT 1
            `,
            [characterId, userId],
        );

        if (!character) {
            await connection.rollback();
            return { ok: false, reason: 'not_found' };
        }

        const additional = additionalBubblesForStartTier(character.start_tier);

        // Find the latest pseudo-adventure (regardless of whether it's the latest overall)
        const [[latestPseudoRow]] = await connection.execute(
            `
                SELECT id, start_date, target_level
                FROM adventures
                WHERE character_id = ?
                  AND deleted_at IS NULL
                  AND is_pseudo = 1
                ORDER BY start_date DESC, id DESC
                LIMIT 1
            `,
            [characterId],
        );

        const [[latestAdventure]] = await connection.execute(
            `
                SELECT id, is_pseudo
                FROM adventures
                WHERE character_id = ?
                  AND deleted_at IS NULL
                ORDER BY start_date DESC, id DESC
                LIMIT 1
            `,
            [characterId],
        );

        const latestPseudoIsLast = latestPseudoRow && latestAdventure && latestPseudoRow.id === latestAdventure.id;

        // Manual level tracking is active when character has simplified_tracking
        // or already has pseudo-adventures — in that case DM bubbles and shop
        // spend are excluded from the minimum-level floor (matching PHP logic).
        const usesManualTracking = Boolean(character.simplified_tracking) || Boolean(latestPseudoRow);
        const dmBubbles = usesManualTracking ? 0 : safeInt(character.dm_bubbles);
        const bubbleSpend = usesManualTracking ? 0 : safeInt(character.bubble_shop_spend);

        let immutableAdventureBubbles;
        if (latestPseudoRow) {
            // Only real adventures AFTER the last pseudo count towards the
            // immutable floor — earlier ones are superseded by the pseudo.
            const [[afterPseudo]] = await connection.execute(
                `
                    SELECT COALESCE(SUM(FLOOR(duration / 10800) + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles
                    FROM adventures
                    WHERE character_id = ?
                      AND deleted_at IS NULL
                      AND is_pseudo = 0
                      AND (start_date > ? OR (start_date = ? AND id > ?))
                `,
                [characterId, latestPseudoRow.start_date, latestPseudoRow.start_date, latestPseudoRow.id],
            );
            immutableAdventureBubbles = Math.max(0, safeInt(afterPseudo?.bubbles));
        } else {
            const [[allBubbles]] = await connection.execute(
                `
                    SELECT COALESCE(SUM(FLOOR(duration / 10800) + CASE WHEN has_additional_bubble = 1 THEN 1 ELSE 0 END), 0) AS bubbles
                    FROM adventures
                    WHERE character_id = ?
                      AND deleted_at IS NULL
                      AND is_pseudo = 0
                `,
                [characterId],
            );
            immutableAdventureBubbles = Math.max(0, safeInt(allBubbles?.bubbles));
        }

        const minAllowedLevel = calculateMinAllowedLevel({
            immutableAdventureBubbles,
            dmBubbles,
            additionalBubbles: additional,
            bubbleSpend,
        });

        if (!character.is_filler && level < minAllowedLevel) {
            await connection.rollback();
            return { ok: false, reason: 'below_real', minLevel: minAllowedLevel };
        }

        // Pseudo-adventures use target_level directly — no duration needed.
        const maxBubblesInLevel = Math.max(0, bubblesRequiredForLevel(Math.min(20, level + 1)) - bubblesRequiredForLevel(level));
        const clampedBubblesInLevel = Math.max(0, Math.min(safeInt(bubblesInLevel), maxBubblesInLevel - 1));
        const targetBubbles = bubblesRequiredForLevel(level) + clampedBubblesInLevel;
        const editablePseudo = latestPseudoIsLast ? latestPseudoRow : null;
        const needsPseudo = level > minAllowedLevel || latestPseudoRow;

        if (needsPseudo && level <= minAllowedLevel) {
            if (editablePseudo) {
                const now = nowSql();
                await connection.execute(
                    'UPDATE adventures SET deleted_at = ?, updated_at = ? WHERE id = ?',
                    [now, now, editablePseudo.id],
                );
            }
        } else if (needsPseudo) {
            if (editablePseudo) {
                const now = nowSql();
                await connection.execute(
                    'UPDATE adventures SET duration = 0, has_additional_bubble = 0, target_level = ?, target_bubbles = ?, progression_version_id = ?, updated_at = ? WHERE id = ?',
                    [level, targetBubbles, activeVersionId, now, editablePseudo.id],
                );
            } else {
                const now = nowSql();
                await connection.execute(
                `
                    INSERT INTO adventures (
                        duration,
                        start_date,
                        has_additional_bubble,
                        is_pseudo,
                        target_level,
                        target_bubbles,
                        progression_version_id,
                        character_id,
                        title,
                        game_master,
                        notes,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                    [
                        0,
                        todaySqlDate(),
                        0,
                        1,
                        level,
                        targetBubbles,
                        activeVersionId,
                        characterId,
                        'Level tracking adjustment',
                        'Level tracking',
                        'Auto-generated to align the level tracking value.',
                        now,
                        now,
                    ],
                );
            }
        }

        await connection.commit();

        return { ok: true };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function createCharacterForDiscord(
    discordUser,
    {
        name,
        startTier,
        externalLink,
        notes,
        faction,
        version,
        avatar,
        dmBubbles,
        dmCoins,
        bubbleShopSpend,
        isFiller,
        guildStatus,
        classIds = [],
    },
) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const createdAt = nowSql();

    const safeName = String(name || '').trim();
    if (!safeName) return { ok: false, reason: 'invalid_name' };
    const safeTier = normalizeTier(startTier, 'bt');
    const safeVersion = normalizeVersion(version, '2024');
    const safeFaction = normalizeFaction(faction, 'none');
    const safeExternal = String(externalLink || '').trim();
    if (!safeExternal || !isDnDBeyondCharacterUrl(safeExternal)) return { ok: false, reason: 'invalid_link' };
    const safeAvatar = normalizeAvatar(avatar);
    const safeDmBubbles = normalizeNumber(dmBubbles, 0);
    const safeDmCoins = normalizeNumber(dmCoins, 0);
    const safeBubbleShop = normalizeNumber(bubbleShopSpend, 0);
    const safeIsFiller = normalizeBoolean(isFiller, false);
    const safeGuildStatus = isCharacterStatusSwitchEnabled
        ? normalizeUserGuildStatus(guildStatus, 'draft')
        : 'draft';

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [userRows] = await connection.execute(
            'SELECT simplified_tracking FROM users WHERE id = ? LIMIT 1',
            [userId],
        );
        const accountSimplifiedTracking = Boolean(userRows[0]?.simplified_tracking);

        const [insertCharacter] = await connection.execute(
            `
            INSERT INTO characters
                    (name, start_tier, dm_bubbles, dm_coins, bubble_shop_spend, external_link, avatar, faction, version, is_filler, user_id, guild_status, registration_note, simplified_tracking, created_at, updated_at)
            VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                safeName,
                safeTier,
                safeDmBubbles,
                safeDmCoins,
                safeBubbleShop,
                safeExternal,
                safeAvatar,
                safeFaction,
                safeVersion,
                safeIsFiller ? 1 : 0,
                userId,
                safeGuildStatus,
                null,
                accountSimplifiedTracking ? 1 : 0,
                createdAt,
                createdAt,
            ],
        );

        const characterId = insertCharacter.insertId;
        const safeClassIds = uniqueNumberList(classIds);
        if (safeClassIds.length > 0) {
            const placeholders = safeClassIds.map(() => '?').join(', ');
            const [validRows] = await connection.execute(
                `SELECT id FROM character_classes WHERE id IN (${placeholders})`,
                safeClassIds,
            );
            const validIds = validRows.map(row => row.id);
            if (validIds.length > 0) {
                const values = validIds.map(() => '(?, ?)').join(', ');
                const params = validIds.flatMap(id => [characterId, id]);
                await connection.execute(
                    `INSERT IGNORE INTO character_character_class (character_id, character_class_id) VALUES ${values}`,
                    params,
                );
            }
        } else {
            const defaultClassId = await getDefaultCharacterClassId(connection);
            if (defaultClassId) {
                await connection.execute(
                    'INSERT IGNORE INTO character_character_class (character_id, character_class_id) VALUES (?, ?)',
                    [characterId, defaultClassId],
                );
            }
        }

        if (typeof notes === 'string' && notes.trim().length > 0) {
            await connection.execute(
                'UPDATE characters SET notes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
                [notes, createdAt, characterId, userId],
            );
        }

        await connection.commit();
        return { ok: true, id: characterId };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function updateCharacterForDiscord(
    discordUser,
    characterId,
    { name, startTier, externalLink, notes, faction, version, avatar, dmBubbles, dmCoins, bubbleShopSpend, isFiller, guildStatus, registrationNote, simplifiedTracking, avatarMasked, privateMode },
) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const existing = await findCharacterForDiscord(discordUser, characterId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const newGuildStatus = !isCharacterStatusSwitchEnabled
        ? 'draft'
        : typeof guildStatus !== 'undefined'
            ? normalizeUserGuildStatus(guildStatus, existing.guild_status)
            : existing.guild_status;

    if (
        newGuildStatus === 'pending'
        && ['draft', 'needs_changes'].includes(String(existing.guild_status || '').trim().toLowerCase())
    ) {
        const submissionState = await getCharacterSubmissionStateForDiscord(discordUser, characterId);
        if (!submissionState.ok) {
            return { ok: false, reason: 'register_failed' };
        }

        if (submissionState.blockedReason) {
            return {
                ok: false,
                reason: submissionState.blockedReason,
                counts: submissionState.counts,
            };
        }
    }

    const updatedAt = nowSql();
    const newName = typeof name === 'string' ? name : existing.name;
    const newStartTier = typeof startTier === 'string' ? normalizeTier(startTier, existing.start_tier) : existing.start_tier;
    let newExternalLink = existing.external_link;
    if (typeof externalLink === 'string') {
        const candidateExternalLink = externalLink.trim();
        if (!candidateExternalLink || !isDnDBeyondCharacterUrl(candidateExternalLink)) {
            return { ok: false, reason: 'invalid_link' };
        }
        newExternalLink = candidateExternalLink;
    }
    const newNotes = typeof notes === 'string' ? notes : existing.notes;
    const newFaction = typeof faction === 'string' ? normalizeFaction(faction, existing.faction) : existing.faction;
    const newVersion = typeof version === 'string' ? normalizeVersion(version, existing.version) : existing.version;
    const newAvatar = typeof avatar === 'string' ? normalizeAvatar(avatar) : existing.avatar;
    const newDmBubbles = typeof dmBubbles !== 'undefined' ? normalizeNumber(dmBubbles, existing.dm_bubbles) : existing.dm_bubbles;
    const newDmCoins = typeof dmCoins !== 'undefined' ? normalizeNumber(dmCoins, existing.dm_coins) : existing.dm_coins;
    const newBubbleShopSpend = typeof bubbleShopSpend !== 'undefined'
        ? normalizeNumber(bubbleShopSpend, existing.bubble_shop_spend)
        : existing.bubble_shop_spend;
    const newIsFiller = typeof isFiller !== 'undefined' ? normalizeBoolean(isFiller, existing.is_filler) : existing.is_filler;
    const newRegistrationNote = typeof registrationNote === 'string'
        ? registrationNote.trim()
        : existing.registration_note;
    const newSimplifiedTracking = typeof simplifiedTracking !== 'undefined'
        ? normalizeBoolean(simplifiedTracking, Boolean(existing.simplified_tracking))
        : Boolean(existing.simplified_tracking);
    const existingAvatarMasked = existing.avatar_masked === null || existing.avatar_masked === undefined
        ? true
        : Boolean(existing.avatar_masked);
    const newAvatarMasked = typeof avatarMasked !== 'undefined'
        ? normalizeBoolean(avatarMasked, existingAvatarMasked)
        : existingAvatarMasked;
    const existingPrivateMode = existing.private_mode === null || existing.private_mode === undefined
        ? false
        : Boolean(existing.private_mode);
    const newPrivateMode = typeof privateMode !== 'undefined'
        ? normalizeBoolean(privateMode, existingPrivateMode)
        : existingPrivateMode;

    await db.execute(
        `
            UPDATE characters
            SET name = ?, start_tier = ?, external_link = ?, notes = ?, faction = ?, version = ?, avatar = ?, dm_bubbles = ?, dm_coins = ?, bubble_shop_spend = ?, is_filler = ?, guild_status = ?, registration_note = ?, simplified_tracking = ?, avatar_masked = ?, private_mode = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
        `,
        [
            newName,
            newStartTier,
            newExternalLink,
            newNotes,
            newFaction,
            newVersion,
            newAvatar,
            newDmBubbles,
            newDmCoins,
            newBubbleShopSpend,
            newIsFiller ? 1 : 0,
            newGuildStatus,
            newRegistrationNote || null,
            newSimplifiedTracking ? 1 : 0,
            newAvatarMasked ? 1 : 0,
            newPrivateMode ? 1 : 0,
            updatedAt,
            characterId,
            userId,
        ],
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
            'UPDATE characters SET deleted_at = ?, updated_at = ?, guild_status = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
            [updatedAt, updatedAt, 'declined', characterId, userId],
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
            SELECT a.id, a.duration, a.start_date, a.has_additional_bubble, a.notes, a.title, a.game_master, a.character_id, a.is_pseudo, a.target_level, a.progression_version_id
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
            SELECT a.id, a.duration, a.start_date, a.has_additional_bubble, a.notes, a.title, a.game_master, a.character_id, a.is_pseudo, a.target_level, a.progression_version_id
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

async function createAdventureForDiscord(
    discordUser,
    { characterId, duration, startDate, hasAdditionalBubble, notes, title, gameMaster, allyIds = [], guildCharacterIds = [] },
) {
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

    let participantsOk = true;
    try {
        const participantResult = await syncAdventureParticipantsForDiscord(discordUser, result.insertId, {
            characterId,
            allyIds,
            guildCharacterIds,
        });
        participantsOk = participantResult.ok;
    } catch {
        participantsOk = false;
    }

    return { ok: true, id: result.insertId, participantsOk };
}

async function updateAdventureForDiscord(
    discordUser,
    adventureId,
    { duration, startDate, notes, title, gameMaster, hasAdditionalBubble, allyIds = [], guildCharacterIds = [] },
) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findAdventureForDiscord(discordUser, adventureId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const date = formatSqlDate(startDate) || existing.start_date;
    const safeDuration = Number.isFinite(Number(duration)) ? Math.floor(Number(duration)) : existing.duration;
    const newNotes = typeof notes === 'string' ? notes : existing.notes;
    const newTitle = typeof title === 'string' ? title : existing.title;
    const newGameMaster = typeof gameMaster === 'string' ? gameMaster : existing.game_master;
    const newHasAdditionalBubble = typeof hasAdditionalBubble === 'boolean'
        ? (hasAdditionalBubble ? 1 : 0)
        : existing.has_additional_bubble;

    await db.execute(
        `
            UPDATE adventures
            SET duration = ?, start_date = ?, notes = ?, title = ?, game_master = ?, has_additional_bubble = ?, updated_at = ?
            WHERE id = ?
        `,
        [safeDuration, date, newNotes ?? null, newTitle ?? null, newGameMaster ?? null, newHasAdditionalBubble, nowSql(), adventureId],
    );

    let participantsOk = true;
    try {
        const participantResult = await syncAdventureParticipantsForDiscord(discordUser, adventureId, {
            characterId: existing.character_id,
            allyIds,
            guildCharacterIds,
        });
        participantsOk = participantResult.ok;
    } catch {
        participantsOk = false;
    }

    return { ok: true, participantsOk };
}

async function listCharacterClassesForDiscord() {
    const [rows] = await db.execute('SELECT id, name FROM character_classes ORDER BY name ASC');
    return rows;
}

async function listCharacterClassIdsForDiscord(discordUser, characterId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const [rows] = await db.execute(
        `
            SELECT ccc.character_class_id
            FROM character_character_class ccc
            INNER JOIN characters c ON c.id = ccc.character_id
            WHERE ccc.character_id = ? AND c.user_id = ?
        `,
        [characterId, userId],
    );

    return rows.map(row => Number(row.character_class_id)).filter(id => Number.isFinite(id));
}

async function syncCharacterClassesForDiscord(discordUser, characterId, classIds) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const existing = await findCharacterForDiscord(discordUser, characterId);
    if (!existing) return { ok: false, reason: 'not_found' };

    const safeIds = uniqueNumberList(classIds);
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        if (safeIds.length === 0) {
            await connection.execute('DELETE FROM character_character_class WHERE character_id = ?', [characterId]);
            await connection.commit();
            return { ok: true };
        }

        const placeholders = safeIds.map(() => '?').join(', ');
        const [validRows] = await connection.execute(
            `SELECT id FROM character_classes WHERE id IN (${placeholders})`,
            safeIds,
        );
        const validIds = validRows.map(row => Number(row.id));

        if (validIds.length === 0) {
            await connection.execute('DELETE FROM character_character_class WHERE character_id = ?', [characterId]);
            await connection.commit();
            return { ok: true };
        }

        const validPlaceholders = validIds.map(() => '?').join(', ');
        await connection.execute(
            `DELETE FROM character_character_class WHERE character_id = ? AND character_class_id NOT IN (${validPlaceholders})`,
            [characterId, ...validIds],
        );

        const values = validIds.map(() => '(?, ?)').join(', ');
        const params = validIds.flatMap(id => [characterId, id]);
        await connection.execute(
            `INSERT IGNORE INTO character_character_class (character_id, character_class_id) VALUES ${values}`,
            params,
        );

        await connection.commit();
        return { ok: true };
    } catch {
        await connection.rollback();
        return { ok: false, reason: 'error' };
    } finally {
        connection.release();
    }
}

async function listAlliesForDiscord(discordUser, characterId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const [rows] = await db.execute(
        `
            SELECT
                a.id,
                a.name,
                a.linked_character_id,
                COALESCE(NULLIF(u.discord_display_name, ''), NULLIF(u.discord_username, ''), u.name, '') AS owner_name
            FROM allies a
            INNER JOIN characters c ON c.id = a.character_id
            LEFT JOIN characters lc ON lc.id = a.linked_character_id
            LEFT JOIN users u ON u.id = lc.user_id
            WHERE a.character_id = ? AND c.user_id = ?
            ORDER BY a.name ASC, a.id ASC
        `,
        [characterId, userId],
    );

    return rows;
}

async function listGuildCharactersForDiscord(discordUser, characterId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();
    const statuses = guildCharacterStatusesForAllies();
    const statusPlaceholders = statuses.map(() => '?').join(', ');

    const [rows] = await db.execute(
        `
            SELECT
                c.id,
                c.name,
                COALESCE(NULLIF(u.discord_display_name, ''), NULLIF(u.discord_username, ''), u.name, '') AS owner_name
            FROM characters c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE c.guild_status IN (${statusPlaceholders})
              AND c.deleted_at IS NULL
              AND c.id <> ?
            ORDER BY c.name ASC, c.id ASC
        `,
        [...statuses, characterId],
    );

    return rows;
}

async function listAdventureParticipantsForDiscord(discordUser, adventureId) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const [rows] = await db.execute(
        `
            SELECT a.id, a.name, a.linked_character_id, c.name AS linked_name
            FROM adventure_ally aa
            INNER JOIN allies a ON a.id = aa.ally_id
            INNER JOIN adventures adv ON adv.id = aa.adventure_id
            INNER JOIN characters ch ON ch.id = adv.character_id
            LEFT JOIN characters c ON c.id = a.linked_character_id
            WHERE aa.adventure_id = ? AND ch.user_id = ?
            ORDER BY a.name ASC, a.id ASC
        `,
        [adventureId, userId],
    );

    return rows;
}

async function resolveGuildAlliesForDiscord(discordUser, characterId, guildCharacterIds, connection = null) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const executor = connection ?? db;
    const safeIds = uniqueNumberList(guildCharacterIds).filter(id => id !== Number(characterId));
    if (safeIds.length === 0) return [];

    const [ownRows] = await executor.execute(
        'SELECT id FROM characters WHERE id = ? AND user_id = ? LIMIT 1',
        [characterId, userId],
    );
    if (ownRows.length === 0) return [];

    const placeholders = safeIds.map(() => '?').join(', ');
    const [existingRows] = await executor.execute(
        `
            SELECT id, linked_character_id
            FROM allies
            WHERE character_id = ? AND linked_character_id IN (${placeholders})
        `,
        [characterId, ...safeIds],
    );
    const existingByLinked = new Map(existingRows.map(row => [Number(row.linked_character_id), Number(row.id)]));

    const statuses = guildCharacterStatusesForAllies();
    const statusPlaceholders = statuses.map(() => '?').join(', ');

    const [characters] = await executor.execute(
        `
            SELECT id, name
            FROM characters
            WHERE id IN (${placeholders})
              AND guild_status IN (${statusPlaceholders})
              AND deleted_at IS NULL
        `,
        [...safeIds, ...statuses],
    );

    const createdAt = nowSql();
    const allyIds = [];

    for (const character of characters) {
        const linkedId = Number(character.id);
        const existingId = existingByLinked.get(linkedId);
        if (existingId) {
            allyIds.push(existingId);
            continue;
        }

        const [insertResult] = await executor.execute(
            `
                INSERT INTO allies (name, rating, linked_character_id, character_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [character.name, 3, linkedId, characterId, createdAt, createdAt],
        );
        allyIds.push(insertResult.insertId);
    }

    return allyIds;
}

async function syncAdventureParticipantsForDiscord(discordUser, adventureId, { characterId = null, allyIds = [], guildCharacterIds = [] }) {
    const userId = await getLinkedUserIdForDiscord(discordUser);
    if (!userId) throw new DiscordNotLinkedError();

    const adventure = await findAdventureForDiscord(discordUser, adventureId);
    if (!adventure) return { ok: false, reason: 'not_found' };

    const targetCharacterId = Number(characterId || adventure.character_id);
    const safeAllyIds = uniqueNumberList(allyIds);
    const safeGuildIds = uniqueNumberList(guildCharacterIds).filter(id => id !== targetCharacterId);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const guildAllyIds = await resolveGuildAlliesForDiscord(discordUser, targetCharacterId, safeGuildIds, connection);
        const combined = Array.from(new Set([...safeAllyIds, ...guildAllyIds]));

        if (combined.length === 0) {
            await connection.execute('DELETE FROM adventure_ally WHERE adventure_id = ?', [adventureId]);
        } else {
            const placeholders = combined.map(() => '?').join(', ');
            await connection.execute(
                `
                    DELETE FROM adventure_ally
                    WHERE adventure_id = ? AND ally_id NOT IN (${placeholders})
                `,
                [adventureId, ...combined],
            );

            const values = combined.map(() => '(?, ?)').join(', ');
            const flatValues = combined.flatMap(id => [adventureId, id]);
            await connection.execute(
                `INSERT IGNORE INTO adventure_ally (adventure_id, ally_id) VALUES ${values}`,
                flatValues,
            );
        }

        await connection.commit();
        return { ok: true };
    } catch {
        await connection.rollback();
        return { ok: false, reason: 'error' };
    } finally {
        connection.release();
    }
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

function normalizeDiscordIdentity(discordIdentity) {
    const id = String(discordIdentity?.id || '').trim();
    if (!/^[0-9]{5,}$/.test(id)) {
        return { id: null, name: null };
    }

    const preferredName = [
        discordIdentity?.displayName,
        discordIdentity?.globalName,
        discordIdentity?.username,
        discordIdentity?.tag,
    ]
        .map(value => String(value || '').trim())
        .find(value => value.length > 0);

    return {
        id,
        name: preferredName || id,
    };
}

function mapAuctionHiddenBidRow(row) {
    const step = getBidStepForItem({
        rarity: row.item_rarity,
        type: row.item_type,
    });
    const startingBid = getStartingBidFromRepair({
        repairCurrent: row.repair_current,
        step,
    });
    const highestBid = Math.max(0, Number(row.highest_bid) || 0);
    const minBid = getMinimumBid({
        startingBid,
        highestBid,
        step,
    });

    return {
        auction_item_id: Number(row.auction_item_id),
        auction_id: Number(row.auction_id),
        auction_title: String(row.auction_title || '').trim(),
        auction_currency: String(row.auction_currency || 'GP').trim() || 'GP',
        auction_created_at: row.auction_created_at,
        item_name: String(row.item_name || '').trim(),
        item_rarity: String(row.item_rarity || 'common').trim(),
        item_type: String(row.item_type || 'item').trim(),
        notes: row.notes == null ? null : String(row.notes),
        sold_at: row.sold_at,
        user_hidden_max: row.user_hidden_max == null ? null : Number(row.user_hidden_max),
        highest_bid: highestBid,
        step,
        starting_bid: startingBid,
        min_bid: minBid,
    };
}

async function listOpenAuctionItemsForHiddenBids(discordIdentity, limit = 100) {
    const identity = normalizeDiscordIdentity(discordIdentity);
    if (!identity.id) return [];

    const safeLimit = Math.max(1, Math.min(250, Number(limit) || 100));
    const [rows] = await db.execute(
        `
            SELECT
                ai.id AS auction_item_id,
                ai.auction_id,
                ai.notes,
                ai.repair_current,
                ai.repair_max,
                ai.sold_at,
                ai.item_name AS item_name,
                ai.item_rarity AS item_rarity,
                ai.item_type AS item_type,
                a.title AS auction_title,
                a.currency AS auction_currency,
                a.created_at AS auction_created_at,
                (
                    SELECT MAX(ab.amount)
                    FROM auction_bids ab
                    WHERE ab.auction_item_id = ai.id
                ) AS highest_bid,
                hb.max_amount AS user_hidden_max
            FROM auction_items ai
            INNER JOIN auctions a ON a.id = ai.auction_id
            LEFT JOIN auction_hidden_bids hb
                ON hb.auction_item_id = ai.id
               AND hb.bidder_discord_id = ?
            WHERE a.status = 'open'
              AND ai.sold_at IS NULL
            ORDER BY a.created_at DESC, ai.id ASC
            LIMIT ${safeLimit}
        `,
        [identity.id],
    );

    return rows.map(mapAuctionHiddenBidRow);
}

async function findOpenAuctionItemForHiddenBid(discordIdentity, auctionItemId, connection = null) {
    const identity = normalizeDiscordIdentity(discordIdentity);
    if (!identity.id) return null;

    const safeAuctionItemId = Number(auctionItemId);
    if (!Number.isFinite(safeAuctionItemId) || safeAuctionItemId <= 0) {
        return null;
    }

    const executor = connection ?? db;
    const [rows] = await executor.execute(
        `
            SELECT
                ai.id AS auction_item_id,
                ai.auction_id,
                ai.notes,
                ai.repair_current,
                ai.repair_max,
                ai.sold_at,
                ai.item_name AS item_name,
                ai.item_rarity AS item_rarity,
                ai.item_type AS item_type,
                a.status AS auction_status,
                a.title AS auction_title,
                a.currency AS auction_currency,
                a.created_at AS auction_created_at,
                (
                    SELECT MAX(ab.amount)
                    FROM auction_bids ab
                    WHERE ab.auction_item_id = ai.id
                ) AS highest_bid,
                hb.id AS hidden_bid_id,
                hb.max_amount AS user_hidden_max
            FROM auction_items ai
            INNER JOIN auctions a ON a.id = ai.auction_id
            LEFT JOIN auction_hidden_bids hb
                ON hb.auction_item_id = ai.id
               AND hb.bidder_discord_id = ?
            WHERE ai.id = ?
            LIMIT 1
        `,
        [identity.id, Math.floor(safeAuctionItemId)],
    );

    if (!rows[0]) return null;

    const mapped = mapAuctionHiddenBidRow(rows[0]);
    mapped.auction_status = String(rows[0].auction_status || '').trim().toLowerCase();
    mapped.hidden_bid_id = rows[0].hidden_bid_id == null ? null : Number(rows[0].hidden_bid_id);
    return mapped;
}

async function upsertHiddenBidForDiscord(discordIdentity, auctionItemId, maxAmountRaw) {
    const identity = normalizeDiscordIdentity(discordIdentity);
    if (!identity.id) {
        return { ok: false, reason: 'invalid_discord_user' };
    }

    const safeAuctionItemId = Number(auctionItemId);
    if (!Number.isFinite(safeAuctionItemId) || safeAuctionItemId <= 0) {
        return { ok: false, reason: 'invalid_item' };
    }

    const maxAmount = Number(maxAmountRaw);
    if (!Number.isFinite(maxAmount) || maxAmount <= 0 || !Number.isInteger(maxAmount)) {
        return { ok: false, reason: 'invalid_amount' };
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const item = await findOpenAuctionItemForHiddenBid(identity, Math.floor(safeAuctionItemId), connection);
        if (!item) {
            await connection.rollback();
            return { ok: false, reason: 'not_found' };
        }

        if (item.auction_status !== 'open') {
            await connection.rollback();
            return { ok: false, reason: 'auction_closed' };
        }

        if (item.sold_at) {
            await connection.rollback();
            return { ok: false, reason: 'item_sold' };
        }

        if (maxAmount < item.min_bid) {
            await connection.rollback();
            return {
                ok: false,
                reason: 'below_minimum',
                minBid: item.min_bid,
                step: item.step,
                startingBid: item.starting_bid,
            };
        }

        if ((maxAmount - item.starting_bid) % item.step !== 0) {
            await connection.rollback();
            return {
                ok: false,
                reason: 'invalid_step',
                minBid: item.min_bid,
                step: item.step,
                startingBid: item.starting_bid,
            };
        }

        const timestamp = nowSql();
        const [existingRows] = await connection.execute(
            `
                SELECT id, max_amount
                FROM auction_hidden_bids
                WHERE auction_item_id = ?
                  AND bidder_discord_id = ?
                LIMIT 1
                FOR UPDATE
            `,
            [item.auction_item_id, identity.id],
        );

        const previousMax = existingRows[0] ? Number(existingRows[0].max_amount) : null;

        if (existingRows[0]) {
            await connection.execute(
                `
                    UPDATE auction_hidden_bids
                    SET bidder_name = ?, max_amount = ?, updated_at = ?
                    WHERE id = ?
                `,
                [identity.name, maxAmount, timestamp, existingRows[0].id],
            );
        } else {
            await connection.execute(
                `
                    INSERT INTO auction_hidden_bids (
                        auction_item_id,
                        bidder_discord_id,
                        bidder_name,
                        max_amount,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `,
                [item.auction_item_id, identity.id, identity.name, maxAmount, timestamp, timestamp],
            );
        }

        await connection.commit();

        return {
            ok: true,
            auctionItemId: item.auction_item_id,
            previousMax,
            maxAmount,
            minBid: item.min_bid,
            step: item.step,
            startingBid: item.starting_bid,
            auctionCurrency: item.auction_currency,
            itemName: item.item_name || `Item #${item.auction_item_id}`,
        };
    } catch {
        await connection.rollback();
        return { ok: false, reason: 'error' };
    } finally {
        connection.release();
    }
}

async function removeHiddenBidForDiscord(discordIdentity, auctionItemId) {
    const identity = normalizeDiscordIdentity(discordIdentity);
    if (!identity.id) {
        return { ok: false, reason: 'invalid_discord_user' };
    }

    const safeAuctionItemId = Number(auctionItemId);
    if (!Number.isFinite(safeAuctionItemId) || safeAuctionItemId <= 0) {
        return { ok: false, reason: 'invalid_item' };
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const item = await findOpenAuctionItemForHiddenBid(identity, Math.floor(safeAuctionItemId), connection);
        if (!item) {
            await connection.rollback();
            return { ok: false, reason: 'not_found' };
        }

        if (item.auction_status !== 'open') {
            await connection.rollback();
            return { ok: false, reason: 'auction_closed' };
        }

        if (item.sold_at) {
            await connection.rollback();
            return { ok: false, reason: 'item_sold' };
        }

        const [existingRows] = await connection.execute(
            `
                SELECT id, max_amount
                FROM auction_hidden_bids
                WHERE auction_item_id = ?
                  AND bidder_discord_id = ?
                LIMIT 1
                FOR UPDATE
            `,
            [item.auction_item_id, identity.id],
        );

        if (!existingRows[0]) {
            await connection.rollback();
            return { ok: false, reason: 'hidden_bid_not_found' };
        }

        const previousMax = Number(existingRows[0].max_amount);
        await connection.execute(
            'DELETE FROM auction_hidden_bids WHERE id = ?',
            [existingRows[0].id],
        );

        await connection.commit();

        return {
            ok: true,
            auctionItemId: item.auction_item_id,
            previousMax,
            auctionCurrency: item.auction_currency,
            itemName: item.item_name || `Item #${item.auction_item_id}`,
        };
    } catch {
        await connection.rollback();
        return { ok: false, reason: 'error' };
    } finally {
        connection.release();
    }
}

module.exports = {
    DiscordNotLinkedError,
    getLinkedUserForDiscord,
    getLinkedUserIdForDiscord,
    getLinkedUserLocaleForDiscord,
    getLinkedUserTrackingDefaultForDiscord,
    getUserLocaleByDiscordId,
    updateLinkedUserLocaleForDiscord,
    updateLinkedUserTrackingDefaultForDiscord,
    createUserForDiscord,
    listCharactersForDiscord,
    getCharacterSubmissionStateForDiscord,
    findCharacterForDiscord,
    updateCharacterManualLevelForDiscord,
    createCharacterForDiscord,
    updateCharacterForDiscord,
    softDeleteCharacterForDiscord,
    listCharacterClassesForDiscord,
    listCharacterClassIdsForDiscord,
    syncCharacterClassesForDiscord,
    listAdventuresForDiscord,
    findAdventureForDiscord,
    createAdventureForDiscord,
    updateAdventureForDiscord,
    softDeleteAdventureForDiscord,
    listAlliesForDiscord,
    listGuildCharactersForDiscord,
    listAdventureParticipantsForDiscord,
    syncAdventureParticipantsForDiscord,
    listDowntimesForDiscord,
    findDowntimeForDiscord,
    createDowntimeForDiscord,
    updateDowntimeForDiscord,
    softDeleteDowntimeForDiscord,
    listOpenAuctionItemsForHiddenBids,
    findOpenAuctionItemForHiddenBid,
    upsertHiddenBidForDiscord,
    removeHiddenBidForDiscord,
};
