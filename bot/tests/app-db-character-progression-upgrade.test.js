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
    1: { 1: 0, 2: 1, 3: 3, 4: 6, 5: 10, 6: 15, 7: 21, 8: 28, 9: 36, 10: 45, 11: 55, 12: 66, 13: 78, 14: 91, 15: 105, 16: 120, 17: 136, 18: 153, 19: 171, 20: 190 },
    2: { 1: 0, 2: 1, 3: 3, 4: 6, 5: 10, 6: 15, 7: 20, 8: 25, 9: 30, 10: 35, 11: 40, 12: 45, 13: 50, 14: 55, 15: 60, 16: 65, 17: 70, 18: 75, 19: 80, 20: 85 },
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
                    adventures_count: 12,
                    adventure_bubbles: 95,
                    has_pseudo_adventure: 0,
                    has_real_adventure: 1,
                    total_downtime: 0,
                    faction_downtime: 0,
                    other_downtime: 0,
                    class_names: 'Wizard',
                }]];
            }

            if (scenario === 'pseudo-current-level') {
                return [[{
                    id: 78,
                    name: 'Pseudo Current Level Character',
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
                    adventures_count: 1,
                    adventure_bubbles: 27,
                    has_pseudo_adventure: 1,
                    has_real_adventure: 0,
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
                adventure_bubbles: 91,
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
                    target_level: 14,
                    target_bubbles: 91,
                    progression_version_id: 1,
                }]];
            }

            if (scenario === 'pseudo-current-level') {
                return [[{
                    id: 902,
                    start_date: '2026-04-20',
                    target_level: 7,
                    target_bubbles: 27,
                    progression_version_id: 1,
                }]];
            }

            return [[]];
        }

        if (sql.includes('SELECT id, start_tier, dm_bubbles, bubble_shop_spend, is_filler, simplified_tracking, progression_version_id')) {
            if (scenario === 'pseudo-current-level') {
                return [[{
                    id: 78,
                    start_tier: 'bt',
                    dm_bubbles: 0,
                    bubble_shop_spend: 0,
                    is_filler: 0,
                    simplified_tracking: 1,
                    progression_version_id: 2,
                }]];
            }

            return [[{
                id: 77,
                start_tier: 'bt',
                dm_bubbles: 0,
                bubble_shop_spend: 0,
                is_filler: 0,
                simplified_tracking: 1,
                progression_version_id: 2,
            }]];
        }

        if (sql.includes('SELECT id, start_date, target_level') && sql.includes('is_pseudo = 1')) {
            if (scenario === 'pseudo-current-level') {
                return [[{
                    id: 902,
                    start_date: '2026-04-20',
                    target_level: 7,
                }]];
            }

            return [[{
                id: 901,
                start_date: '2026-04-20',
                target_level: 14,
            }]];
        }

        if (sql.includes('SELECT id, is_pseudo') && sql.includes('FROM adventures')) {
            if (scenario === 'pseudo-current-level') {
                return [[{ id: 902, is_pseudo: 1 }]];
            }

            return [[{ id: 901, is_pseudo: 1 }]];
        }

        if (sql.includes('SELECT COALESCE(SUM(FLOOR(duration / 10800)')) {
            if (scenario === 'adventure') {
                return [[{ bubbles: 95 }]];
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

        if (sql.startsWith('UPDATE adventures SET duration = 0, has_additional_bubble = 0, target_level = ?, target_bubbles = ?, progression_version_id = ?, updated_at = ? WHERE id = ?')) {
            updates.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('UPDATE adventures SET deleted_at = ?, updated_at = ? WHERE id = ?')) {
            updates.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('UPDATE characters SET progression_version_id = ?, updated_at = ? WHERE id = ?')) {
            updates.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('UPDATE characters SET bubble_shop_spend = ?, updated_at = ? WHERE id = ?')) {
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

const { getCharacterProgressionUpgradeStateForDiscord, upgradeCharacterProgressionForDiscord } = require('../appDb');

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
        const adventureState = await getCharacterProgressionUpgradeStateForDiscord(discordUser, 42);
        assert.equal(adventureState.ok, true);
        assert.equal(adventureState.currentLevel, 14);
        assert.equal(adventureState.recalculatedLevel, 20);
        assert.equal(adventureState.minSelectableLevel, 14);
        const adventureResult = await upgradeCharacterProgressionForDiscord(discordUser, 42, 14, 0);
        assert.equal(adventureResult.ok, true);
        assert.equal(updates.length, 1);
        assert.equal(inserts.length, 1);
        assert.equal(deletes.length, 0);
        assert.equal(inserts[0].bindings[1], 'downtime');
        assert.equal(inserts[0].bindings[2], 40);
        assert.equal(updates[0].bindings[0], 2);
        assert.equal(updates[0].bindings[1], 40);
        assert.equal(updates[0].bindings[3], 42);

        scenario = 'pseudo';
        updates = [];
        const pseudoState = await getCharacterProgressionUpgradeStateForDiscord(discordUser, 77);
        assert.equal(pseudoState.ok, true);
        assert.equal(pseudoState.currentLevel, 14);
        assert.equal(pseudoState.recalculatedLevel, 20);
        const pseudoResult = await upgradeCharacterProgressionForDiscord(discordUser, 77, 10, 0);
        assert.equal(pseudoResult.ok, false);
        assert.equal(pseudoResult.reason, 'outside_manual_range');
        assert.equal(pseudoResult.minLevel, 14);
        assert.equal(pseudoResult.maxLevel, 20);
        assert.equal(updates.length, 0);

        scenario = 'pseudo-current-level';
        updates = [];
        inserts = [];
        deletes = [];
        const pseudoCurrentLevelState = await getCharacterProgressionUpgradeStateForDiscord(discordUser, 78);
        assert.equal(pseudoCurrentLevelState.ok, true);
        assert.equal(pseudoCurrentLevelState.currentLevel, 7);
        assert.equal(pseudoCurrentLevelState.recalculatedLevel, 8);
        const pseudoCurrentLevelResult = await upgradeCharacterProgressionForDiscord(discordUser, 78, 7, 0);
        assert.equal(pseudoCurrentLevelResult.ok, true);
        assert.equal(inserts.length, 1);
        assert.equal(inserts[0].bindings[1], 'downtime');
        assert.equal(inserts[0].bindings[2], 7);

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
