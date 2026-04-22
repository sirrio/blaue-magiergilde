const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');
const levelProgressionPath = require.resolve('../utils/levelProgression');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];
const originalLevelProgressionModule = require.cache[levelProgressionPath];

const progressionTotals = {
    1: { 1: 0, 2: 5, 3: 10, 4: 15, 5: 20, 6: 25, 7: 30, 8: 35, 9: 40, 10: 45, 11: 50, 12: 55, 13: 60, 14: 65, 15: 70, 16: 75, 17: 80, 18: 85, 19: 90, 20: 95 },
};

function floorFor(level, versionId = 1) {
    return progressionTotals[versionId][level];
}

function nextDeltaFor(level, versionId = 1) {
    if (level >= 20) {
        return 0;
    }

    return floorFor(level + 1, versionId) - floorFor(level, versionId);
}

function levelFromAvailableBubbles(availableBubbles, versionId = 1) {
    let remaining = Math.max(0, Number(availableBubbles) || 0);
    let level = 1;

    while (level < 20) {
        const nextDelta = nextDeltaFor(level, versionId);
        if (remaining < nextDelta) {
            break;
        }

        remaining -= nextDelta;
        level += 1;
    }

    return level;
}

require.cache[levelProgressionPath] = {
    id: levelProgressionPath,
    filename: levelProgressionPath,
    loaded: true,
    exports: {
        activeLevelProgressionVersionId: () => 1,
        bubblesRequiredForLevel: floorFor,
        ensureLevelProgressionLoaded: async () => progressionTotals,
        levelFromAvailableBubbles,
    },
};

const characterState = {
    id: 42,
    name: 'Tracking Character',
    start_tier: 'bt',
    version: '2024',
    faction: 'none',
    external_link: '',
    avatar: null,
    notes: null,
    dm_bubbles: 0,
    dm_coins: 0,
    bubble_shop_spend: 15,
    bubble_shop_legacy_spend: 15,
    progression_version_id: 1,
    manual_adventures_count: null,
    manual_faction_rank: null,
    is_filler: 0,
    guild_status: 'approved',
    registration_note: null,
    review_note: null,
    simplified_tracking: 0,
    avatar_masked: 1,
    private_mode: 0,
    has_room: 0,
    adventures_count: 30,
    adventure_bubbles: 30,
    has_pseudo_adventure: 0,
    has_real_adventure: 1,
    total_downtime: 0,
    faction_downtime: 0,
    other_downtime: 0,
    bubble_shop_skill_proficiency: 0,
    bubble_shop_rare_language: 0,
    bubble_shop_tool_or_language: 0,
    bubble_shop_downtime: 0,
    class_names: 'Wizard',
};

let pseudoRows = [];

function currentCharacterRow() {
    return {
        ...characterState,
        has_pseudo_adventure: pseudoRows.length > 0 ? 1 : 0,
        simplified_tracking: characterState.simplified_tracking,
    };
}

const fakeConnection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, bindings = []) {
        return fakeDb.execute(sql, bindings);
    },
};

const fakeDb = {
    async execute(sql, bindings = []) {
        if (sql.includes('FROM users WHERE discord_id = ? LIMIT 1')) {
            return [[{ id: 7, deleted_at: null, locale: 'de', simplified_tracking: 0, privacy_policy_accepted_version: 20260214 }]];
        }

        if (sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('WHERE c.id = ?') && sql.includes('LIMIT 1')) {
            return [[currentCharacterRow()]];
        }

        if (sql.includes('SELECT id, start_date, target_level') && sql.includes('is_pseudo = 1')) {
            return [pseudoRows.length > 0 ? [pseudoRows[pseudoRows.length - 1]] : []];
        }

        if (sql.includes('SELECT id, is_pseudo') && sql.includes('FROM adventures')) {
            if (pseudoRows.length === 0) {
                return [[]];
            }

            const latestPseudo = pseudoRows[pseudoRows.length - 1];
            return [[{ id: latestPseudo.id, is_pseudo: 1 }]];
        }

        if (sql.includes('SELECT COALESCE(SUM(FLOOR(duration / 10800)')) {
            return [[{ bubbles: 30 }]];
        }

        if (sql.includes('UPDATE characters') && sql.includes('simplified_tracking')) {
            characterState.simplified_tracking = bindings[14];
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('SELECT id, start_tier, dm_bubbles, bubble_shop_spend, is_filler, simplified_tracking, progression_version_id')) {
            return [[{
                id: characterState.id,
                start_tier: characterState.start_tier,
                dm_bubbles: characterState.dm_bubbles,
                bubble_shop_spend: characterState.bubble_shop_spend,
                is_filler: characterState.is_filler,
                simplified_tracking: characterState.simplified_tracking,
                progression_version_id: characterState.progression_version_id,
            }]];
        }

        if (sql.includes('INSERT INTO adventures')) {
            pseudoRows.push({
                id: 900 + pseudoRows.length,
                start_date: bindings[1],
                target_level: bindings[4],
                target_bubbles: bindings[5],
                progression_version_id: bindings[6],
            });
            return [{ affectedRows: 1, insertId: pseudoRows[pseudoRows.length - 1].id }];
        }

        if (sql.startsWith('UPDATE adventures SET duration = 0')) {
            const latestPseudo = pseudoRows[pseudoRows.length - 1];
            latestPseudo.target_level = bindings[0];
            latestPseudo.target_bubbles = bindings[1];
            latestPseudo.progression_version_id = bindings[2];
            return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
    },
    async getConnection() {
        return fakeConnection;
    },
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
};

delete require.cache[appDbPath];

const { updateCharacterTrackingModeForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const discordUser = {
            id: '117027601209360389',
            username: 'sirrio',
            globalName: 'Sirrio',
            tag: 'sirrio#0001',
            displayAvatarURL: () => 'https://example.test/avatar.png',
        };

        pseudoRows = [];
        characterState.simplified_tracking = 0;

        const enableResult = await updateCharacterTrackingModeForDiscord(discordUser, 42, true);
        assert.equal(enableResult.ok, true);
        assert.equal(characterState.simplified_tracking, 1);
        assert.equal(pseudoRows.length, 0);

        const disableResult = await updateCharacterTrackingModeForDiscord(discordUser, 42, false);
        assert.equal(disableResult.ok, true);
        assert.equal(characterState.simplified_tracking, 0);
        assert.equal(pseudoRows.length, 0);

        console.log('app-db-character-tracking-mode.test.js passed');
    })
    .finally(() => {
        if (originalDbModule === undefined) {
            delete require.cache[dbPath];
        } else {
            require.cache[dbPath] = originalDbModule;
        }

        if (originalAppDbModule === undefined) {
            delete require.cache[appDbPath];
        } else {
            require.cache[appDbPath] = originalAppDbModule;
        }

        if (originalLevelProgressionModule === undefined) {
            delete require.cache[levelProgressionPath];
        } else {
            require.cache[levelProgressionPath] = originalLevelProgressionModule;
        }
    });
