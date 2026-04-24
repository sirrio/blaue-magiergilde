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

function progressionStateJson(row) {
    const available = Math.max(0, Number(row.adventure_bubbles || 0));
    const level = levelFromAvailableBubbles(available);
    return JSON.stringify({
        level,
        tier: level >= 17 ? 'et' : level >= 11 ? 'ht' : level >= 5 ? 'lt' : 'bt',
        available_bubbles: available,
        bubbles_in_level: Math.max(0, available - floorFor(level)),
        bubbles_required_for_next_level: level >= 20 ? 0 : floorFor(level + 1) - floorFor(level),
        progression_version_id: row.progression_version_id ?? 1,
        bubble_shop_spend: 15,
        downtime_total_seconds: 0,
        downtime_logged_seconds: 0,
        faction_rank: 0,
        has_level_anchor: false,
    });
}

function currentCharacterRow() {
    const row = {
        ...characterState,
        simplified_tracking: characterState.simplified_tracking,
    };
    return {
        ...row,
        progression_state_json: progressionStateJson(row),
    };
}

const auditEventInserts = [];

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

        if (sql.includes('UPDATE characters') && sql.includes('simplified_tracking')) {
            characterState.simplified_tracking = bindings[10];
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('INSERT INTO character_audit_events')) {
            auditEventInserts.push({ sql, bindings });
            return [{ affectedRows: 1, insertId: 901 }];
        }

        if (sql.includes('FROM character_audit_events')) {
            return [[{ event_bubble_delta: 0 }]];
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

        characterState.simplified_tracking = 0;

        const enableResult = await updateCharacterTrackingModeForDiscord(discordUser, 42, true);
        assert.equal(enableResult.ok, true);
        assert.equal(characterState.simplified_tracking, 1);

        const disableResult = await updateCharacterTrackingModeForDiscord(discordUser, 42, false);
        assert.equal(disableResult.ok, true);
        assert.equal(characterState.simplified_tracking, 0);

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
