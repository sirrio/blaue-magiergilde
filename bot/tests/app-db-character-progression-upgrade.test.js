const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');
const levelProgressionPath = require.resolve('../utils/levelProgression');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];
const originalLevelProgressionModule = require.cache[levelProgressionPath];

let scenario = 'adventure';
let updates = [];
let inserts = [];
let deletes = [];

const fakeConnection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, bindings = []) {
        return fakeDb.execute(sql, bindings);
    },
};

const progressionTotals = {
    1: { 1: 0, 2: 5, 3: 10, 4: 15, 5: 20, 6: 25, 7: 30, 8: 35, 9: 40, 10: 45, 11: 50, 12: 55, 13: 60, 14: 65, 15: 70, 16: 75, 17: 80, 18: 85, 19: 90, 20: 95 },
    2: { 1: 0, 2: 3, 3: 6, 4: 10, 5: 15, 6: 21, 7: 28, 8: 36, 9: 45, 10: 55, 11: 66, 12: 78, 13: 91, 14: 105, 15: 120, 16: 136, 17: 153, 18: 171, 19: 190, 20: 210 },
};

function floorFor(level, versionId) {
    return progressionTotals[versionId][level];
}

function nextDeltaFor(level, versionId) {
    if (level >= 20) {
        return 0;
    }

    return floorFor(level + 1, versionId) - floorFor(level, versionId);
}

function levelFromAvailableBubbles(availableBubbles, versionId = 2) {
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
        activeLevelProgressionVersionId: () => 2,
        bubblesRequiredForLevel: floorFor,
        ensureLevelProgressionLoaded: async () => progressionTotals,
        levelFromAvailableBubbles,
    },
};

const fakeDb = {
    async execute(sql, bindings = []) {
        if (sql.includes('FROM users WHERE discord_id = ? LIMIT 1')) {
            return [[{ id: 7, deleted_at: null, locale: 'de', simplified_tracking: scenario === 'pseudo' ? 1 : 0 }]];
        }

        if (sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('WHERE c.id = ?') && sql.includes('LIMIT 1')) {
            if (scenario === 'adventure') {
                return [[{
                    id: 42,
                    name: 'Adventure Character',
                    start_tier: 'bt',
                    version: '2024',
                    faction: 'none',
                    external_link: '',
                    avatar: null,
                    notes: null,
                    dm_bubbles: 0,
                    dm_coins: 0,
                    bubble_shop_spend: 0,
                    bubble_shop_downtime: 0,
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
                    adventures_count: 2,
                    adventure_bubbles: 7,
                    has_pseudo_adventure: 0,
                    has_real_adventure: 1,
                    total_downtime: 0,
                    faction_downtime: 0,
                    other_downtime: 0,
                    class_names: 'Wizard',
                }]];
            }

            return [[{
                id: 77,
                name: 'Pseudo Character',
                start_tier: 'bt',
                version: '2024',
                faction: 'none',
                external_link: '',
                avatar: null,
                notes: null,
                dm_bubbles: 0,
                dm_coins: 0,
                bubble_shop_spend: 0,
                bubble_shop_downtime: 0,
                progression_version_id: 1,
                manual_adventures_count: null,
                manual_faction_rank: null,
                is_filler: 0,
                guild_status: 'approved',
                registration_note: null,
                review_note: null,
                simplified_tracking: 1,
                avatar_masked: 1,
                private_mode: 0,
                has_room: 0,
                adventures_count: 3,
                adventure_bubbles: 10,
                has_pseudo_adventure: 1,
                has_real_adventure: 1,
                total_downtime: 0,
                faction_downtime: 0,
                other_downtime: 0,
                class_names: 'Wizard',
            }]];
        }

        if (sql.includes('SELECT id, start_date, target_level, target_bubbles, progression_version_id') && sql.includes('is_pseudo = 1')) {
            if (scenario === 'pseudo') {
                return [[{
                    id: 901,
                    start_date: '2026-04-20',
                    target_level: 6,
                    target_bubbles: 25,
                    progression_version_id: 1,
                }]];
            }

            return [[]];
        }

        if (sql.includes('SELECT COALESCE(SUM(FLOOR(duration / 10800)')) {
            if (scenario === 'adventure') {
                return [[{ bubbles: 7 }]];
            }

            return [[{ bubbles: 0 }]];
        }

        if (sql.startsWith('UPDATE characters SET progression_version_id = ?, bubble_shop_spend = ?, updated_at = ? WHERE id = ?')) {
            updates.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('DELETE FROM character_bubble_shop_purchases WHERE character_id = ? AND type = ?')) {
            deletes.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('INSERT INTO character_bubble_shop_purchases')) {
            inserts.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('UPDATE characters SET progression_version_id = ?, updated_at = ? WHERE id = ?')) {
            updates.push({ sql, bindings });
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

const { upgradeCharacterProgressionForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const discordUser = {
            id: '117027601209360389',
            username: 'sirrio',
            globalName: 'Sirrio',
            tag: 'sirrio#0001',
            displayAvatarURL: () => 'https://example.test/avatar.png',
        };

        scenario = 'adventure';
        updates = [];
        inserts = [];
        deletes = [];
        const adventureResult = await upgradeCharacterProgressionForDiscord(discordUser, 42, 3, 0);
        assert.equal(adventureResult.ok, true);
        assert.equal(updates.length, 1);
        assert.equal(inserts.length, 1);
        assert.equal(deletes.length, 0);
        assert.equal(inserts[0].bindings[1], 'downtime');
        assert.equal(inserts[0].bindings[2], 1);
        assert.equal(updates[0].bindings[0], 2);
        assert.equal(updates[0].bindings[1], 1);
        assert.equal(updates[0].bindings[3], 42);

        scenario = 'pseudo';
        updates = [];
        const pseudoResult = await upgradeCharacterProgressionForDiscord(discordUser, 77, 5, 0);
        assert.equal(pseudoResult.ok, false);
        assert.equal(pseudoResult.reason, 'above_max');
        assert.equal(pseudoResult.maxLevel, 4);
        assert.equal(updates.length, 0);

        console.log('app-db-character-progression-upgrade.test.js passed');
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
