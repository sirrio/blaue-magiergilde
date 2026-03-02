const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];

let step = 0;

const fakeDb = {
    async execute(sql) {
        step += 1;

        if (step === 1) {
            assert.equal(sql.includes('SELECT id, deleted_at, locale FROM users WHERE discord_id = ? LIMIT 1'), true);
            return [[]];
        }

        if (step === 2) {
            assert.equal(sql.startsWith('INSERT INTO users'), true);
            const error = new Error('Duplicate entry');
            error.code = 'ER_DUP_ENTRY';
            error.errno = 1062;
            throw error;
        }

        if (step === 3) {
            assert.equal(sql.includes('SELECT id, deleted_at, locale FROM users WHERE discord_id = ? LIMIT 1'), true);
            return [[{ id: 42, deleted_at: null, locale: 'de' }]];
        }

        if (step === 4) {
            assert.equal(sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?'), true);
            return [{ affectedRows: 1 }];
        }

        throw new Error(`Unexpected DB step ${step}: ${sql}`);
    },
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
};

delete require.cache[appDbPath];

const { createUserForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const result = await createUserForDiscord({
            id: '117027601209360389',
            username: 'sirrio',
            globalName: 'Sirrio',
            tag: 'sirrio#0001',
            displayAvatarURL: () => 'https://example.test/avatar.png',
        });

        assert.deepEqual(result, {
            created: false,
            userId: 42,
        });

        console.log('app-db-discord-user.test.js passed');
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
