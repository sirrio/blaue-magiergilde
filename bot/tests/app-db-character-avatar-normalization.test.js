const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');
const levelProgressionPath = require.resolve('../utils/levelProgression');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];
const originalLevelProgressionModule = require.cache[levelProgressionPath];

let userQueryStep = 0;
let insertedAvatarParam = 'not-set';

const fakeConnection = {
    async beginTransaction() {
        return undefined;
    },
    async commit() {
        return undefined;
    },
    async rollback() {
        return undefined;
    },
    release() {
        return undefined;
    },
    async execute(sql, params = []) {
        if (sql.startsWith('SELECT simplified_tracking FROM users WHERE id = ? LIMIT 1')) {
            return [[{ simplified_tracking: 0 }]];
        }

        if (sql.includes('INSERT INTO characters')) {
            insertedAvatarParam = params[3];
            return [{ insertId: 777 }];
        }

        if (sql.startsWith('SELECT id FROM character_classes WHERE id IN')) {
            return [[{ id: 3 }]];
        }

        if (sql.startsWith('INSERT IGNORE INTO character_character_class')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('INSERT INTO character_audit_events')) {
            return [{ affectedRows: 1, insertId: 901 }];
        }

        throw new Error(`Unexpected connection SQL: ${sql}`);
    },
};

const fakeDb = {
    async execute(sql) {
        userQueryStep += 1;

        if (userQueryStep === 1) {
            assert.equal(sql.includes('FROM users WHERE discord_id = ? LIMIT 1'), true);
            return [[{ id: 42, deleted_at: null, locale: 'de', simplified_tracking: null }]];
        }

        if (userQueryStep === 2) {
            assert.equal(sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?'), true);
            return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected DB step ${userQueryStep}: ${sql}`);
    },
    async getConnection() {
        return fakeConnection;
    },
};

require.cache[levelProgressionPath] = {
    id: levelProgressionPath,
    filename: levelProgressionPath,
    loaded: true,
    exports: {
        activeLevelProgressionVersionId: () => 1,
        bubblesRequiredForLevel: (level) => Math.max(0, Number(level) - 1),
        ensureLevelProgressionLoaded: async () => true,
        levelFromAvailableBubbles: (availableBubbles) => Math.max(1, Math.floor(Number(availableBubbles) || 0) + 1),
    },
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
};

delete require.cache[appDbPath];

const { createCharacterForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const result = await createCharacterForDiscord(
            {
                id: '117027601209360389',
                username: 'sirrio',
                globalName: 'Sirrio',
                tag: 'sirrio#0001',
                displayAvatarURL: () => 'https://example.test/user-avatar.png',
            },
            {
                name: 'Test Character',
                startTier: 'bt',
                externalLink: 'https://www.dndbeyond.com/characters/12345',
                notes: '',
                avatar: 'https://cdn.discordapp.com/attachments/1/2/token.png?ex=abc',
                faction: 'none',
                version: '2024',
                classIds: [3],
            },
        );

        assert.equal(result.ok, true);
        assert.equal(result.id, 777);
        assert.equal(insertedAvatarParam, null);

        console.log('app-db-character-avatar-normalization.test.js passed');
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
