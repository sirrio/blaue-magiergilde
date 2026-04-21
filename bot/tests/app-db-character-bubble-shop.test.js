const assert = require('node:assert/strict');
const { setLevelProgressionTotals } = require('../utils/levelProgression');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];

let scenario = 'success';
const executed = [];

setLevelProgressionTotals({
    1: 0, 2: 1, 3: 3, 4: 6, 5: 10,
    6: 15, 7: 21, 8: 28, 9: 36, 10: 45,
    11: 55, 12: 66, 13: 78, 14: 91, 15: 105,
    16: 120, 17: 136, 18: 153, 19: 171, 20: 190,
});

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
            return [[{ id: 7, deleted_at: null, locale: 'de', simplified_tracking: 0 }]];
        }

        if (sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('WHERE c.id = ?') && sql.includes('LIMIT 1')) {
            if (scenario === 'invalid') {
                return [[{
                    id: 42,
                    name: 'Bubble Tester',
                    start_tier: 'bt',
                    version: '2024',
                    faction: 'none',
                    external_link: '',
                    avatar: null,
                    notes: null,
                    dm_bubbles: 0,
                    dm_coins: 0,
                    bubble_shop_spend: 4,
                    bubble_shop_legacy_spend: 4,
                    bubble_shop_skill_proficiency: 0,
                    bubble_shop_rare_language: 0,
                    bubble_shop_tool_or_language: 0,
                    bubble_shop_lt_downtime: 0,
                    bubble_shop_ht_downtime: 0,
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
                    adventures_count: 1,
                    adventure_bubbles: 1,
                    has_pseudo_adventure: 0,
                    has_real_adventure: 1,
                    total_downtime: 0,
                    faction_downtime: 0,
                    other_downtime: 0,
                    class_names: 'Wizard',
                }]];
            }

            return [[{
                id: 42,
                name: 'Bubble Tester',
                start_tier: 'lt',
                version: '2024',
                faction: 'none',
                external_link: '',
                avatar: null,
                notes: null,
                dm_bubbles: 0,
                dm_coins: 0,
                bubble_shop_spend: 8,
                bubble_shop_legacy_spend: 8,
                bubble_shop_skill_proficiency: 0,
                bubble_shop_rare_language: 0,
                bubble_shop_tool_or_language: 0,
                bubble_shop_lt_downtime: 0,
                bubble_shop_ht_downtime: 0,
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
                adventures_count: 3,
                adventure_bubbles: 10,
                has_pseudo_adventure: 0,
                has_real_adventure: 1,
                total_downtime: 0,
                faction_downtime: 0,
                other_downtime: 0,
                class_names: 'Wizard',
            }]];
        }

        if (sql.startsWith('DELETE FROM character_bubble_shop_purchases')) {
            executed.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('INSERT INTO character_bubble_shop_purchases')) {
            executed.push({ sql, bindings });
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('UPDATE characters SET bubble_shop_spend = ?, updated_at = ? WHERE id = ? AND user_id = ?')) {
            executed.push({ sql, bindings });
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

const { updateCharacterBubbleShopForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const discordUser = {
            id: '117027601209360389',
            username: 'sirrio',
            globalName: 'Sirrio',
            tag: 'sirrio#0001',
            displayAvatarURL: () => 'https://example.test/avatar.png',
        };

        scenario = 'success';
        executed.length = 0;
        const success = await updateCharacterBubbleShopForDiscord(discordUser, 42, {
            skill_proficiency: 1,
            rare_language: 0,
            tool_or_language: 1,
            lt_downtime: 2,
            ht_downtime: 0,
        });
        assert.equal(success.ok, true);
        assert.equal(executed.filter((entry) => entry.sql.includes('INSERT INTO character_bubble_shop_purchases')).length, 3);
        assert.equal(executed.some((entry) => entry.sql.startsWith('UPDATE characters SET bubble_shop_spend = ?, updated_at = ? WHERE id = ? AND user_id = ?') && entry.bindings[0] === 10), true);

        scenario = 'invalid';
        executed.length = 0;
        const invalid = await updateCharacterBubbleShopForDiscord(discordUser, 42, {
            skill_proficiency: 0,
            rare_language: 0,
            tool_or_language: 0,
            lt_downtime: 1,
            ht_downtime: 0,
        });
        assert.equal(invalid.ok, false);
        assert.equal(invalid.reason, 'invalid_quantity');
        assert.equal(invalid.type, 'lt_downtime');
        assert.equal(invalid.max, 0);
        assert.equal(executed.length, 0);

        console.log('app-db-character-bubble-shop.test.js passed');
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
    });
