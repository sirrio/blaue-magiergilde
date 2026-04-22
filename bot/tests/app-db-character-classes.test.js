const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];

let scenario = 'reject-disabled-new-class';
const executed = [];

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
        executed.push({ sql, bindings });

        if (sql.includes('FROM users WHERE discord_id = ? LIMIT 1')) {
            return [[{ id: 7, deleted_at: null, locale: 'de', simplified_tracking: 0 }]];
        }

        if (sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('FROM characters c') && sql.includes('WHERE c.id = ?') && sql.includes('LIMIT 1')) {
            return [[{
                id: 42,
                name: 'Class Tester',
                start_tier: 'bt',
                version: '2024',
                faction: 'none',
                external_link: '',
                avatar: null,
                notes: null,
                dm_bubbles: 0,
                dm_coins: 0,
                bubble_shop_spend: 0,
                bubble_shop_legacy_spend: 0,
                bubble_shop_skill_proficiency: 0,
                bubble_shop_rare_language: 0,
                bubble_shop_tool_or_language: 0,
                bubble_shop_downtime: 0,
                progression_version_id: 1,
                manual_adventures_count: null,
                manual_faction_rank: null,
                is_filler: 0,
                guild_status: 'draft',
                registration_note: null,
                review_note: null,
                simplified_tracking: 0,
                avatar_masked: 1,
                private_mode: 0,
                has_room: 0,
                adventures_count: 0,
                adventure_bubbles: 0,
                has_pseudo_adventure: 0,
                has_real_adventure: 0,
                total_downtime: 0,
                faction_downtime: 0,
                other_downtime: 0,
                class_names: '',
            }]];
        }

        if (sql.startsWith('SELECT id, name, guild_enabled FROM character_classes ORDER BY name ASC')) {
            return [[
                { id: 1, name: 'Wizard', guild_enabled: 1 },
                { id: 2, name: 'Forbidden', guild_enabled: 0 },
            ]];
        }

        if (sql.includes('SELECT ccc.character_class_id') && sql.includes('WHERE ccc.character_id = ? AND c.user_id = ?')) {
            if (scenario === 'keep-existing-disabled-class') {
                return [[{ character_class_id: 2 }]];
            }

            return [[{ character_class_id: 1 }]];
        }

        if (sql.includes('SELECT cc.id') && sql.includes('FROM character_classes cc')) {
            if (scenario === 'keep-existing-disabled-class') {
                return [[{ id: 2 }]];
            }

            return [[{ id: 1 }]];
        }

        if (sql.startsWith('DELETE FROM character_character_class WHERE character_id = ? AND character_class_id NOT IN')) {
            return [{ affectedRows: 0 }];
        }

        if (sql.startsWith('INSERT IGNORE INTO character_character_class')) {
            return [{ affectedRows: 1 }];
        }

        throw new Error(`Unhandled SQL in class test: ${sql}`);
    },
    async getConnection() {
        return fakeConnection;
    },
};

require.cache[dbPath] = { exports: fakeDb };
delete require.cache[appDbPath];
const appDb = require('../appDb');

async function run() {
    const classes = await appDb.listCharacterClassesForDiscord();
    assert.equal(classes.length, 2);
    assert.equal(Number(classes[1].guild_enabled), 0);

    scenario = 'reject-disabled-new-class';
    executed.length = 0;
    const rejectResult = await appDb.syncCharacterClassesForDiscord({ id: 'discord-user' }, 42, [1, 2]);
    assert.equal(rejectResult.ok, true);
    const rejectInsert = executed.find((entry) => entry.sql.startsWith('INSERT IGNORE INTO character_character_class'));
    assert.deepEqual(rejectInsert.bindings, [42, 1]);

    scenario = 'keep-existing-disabled-class';
    executed.length = 0;
    const keepResult = await appDb.syncCharacterClassesForDiscord({ id: 'discord-user' }, 42, [2]);
    assert.equal(keepResult.ok, true);
    const keepInsert = executed.find((entry) => entry.sql.startsWith('INSERT IGNORE INTO character_character_class'));
    assert.deepEqual(keepInsert.bindings, [42, 2]);

    console.log('app-db-character-classes tests passed');
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => {
        if (originalDbModule) {
            require.cache[dbPath] = originalDbModule;
        } else {
            delete require.cache[dbPath];
        }

        if (originalAppDbModule) {
            require.cache[appDbPath] = originalAppDbModule;
        } else {
            delete require.cache[appDbPath];
        }
    });
