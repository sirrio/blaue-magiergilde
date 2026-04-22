const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');
const levelProgressionPath = require.resolve('../utils/levelProgression');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];
const originalLevelProgressionModule = require.cache[levelProgressionPath];

let executedStatements = [];

const fakeDb = {
    async execute(sql, bindings = []) {
        executedStatements.push({ sql, bindings });

        if (sql.includes('FROM users WHERE discord_id = ? LIMIT 1')) {
            return [[{ id: 7, deleted_at: null, locale: 'en', simplified_tracking: null }]];
        }

        if (sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.startsWith('UPDATE users SET locale = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
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

const { getLinkedUserLocaleForDiscord, updateLinkedUserLocaleForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const discordUser = {
            id: '117027601209360389',
            username: 'sirrio',
            globalName: 'Sirrio',
            tag: 'sirrio#0001',
            displayAvatarURL: () => 'https://example.test/avatar.png',
        };

        const locale = await getLinkedUserLocaleForDiscord(discordUser);
        assert.equal(locale, 'en');

        executedStatements = [];
        const savedLocale = await updateLinkedUserLocaleForDiscord(discordUser, 'de');
        assert.equal(savedLocale, 'de');
        assert.equal(
            executedStatements.some(({ sql, bindings }) => sql.startsWith('UPDATE users SET locale = ?, updated_at = ? WHERE id = ?') && bindings[0] === 'de' && bindings[2] === 7),
            true,
        );

        console.log('app-db-user-locale.test.js passed');
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
