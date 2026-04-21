const assert = require('node:assert/strict');

const dbPath = require.resolve('../db');
const appDbPath = require.resolve('../appDb');
const levelProgressionPath = require.resolve('../utils/levelProgression');

const originalDbModule = require.cache[dbPath];
const originalAppDbModule = require.cache[appDbPath];
const originalLevelProgressionModule = require.cache[levelProgressionPath];

const makeCharacterRow = (overrides = {}) => ({
    id: 1,
    name: 'Character',
    start_tier: 'bt',
    version: '2024',
    faction: 'none',
    external_link: '',
    avatar: null,
    notes: null,
    dm_bubbles: 0,
    dm_coins: 0,
    bubble_shop_spend: 0,
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
    adventures_count: 0,
    adventure_bubbles: 0,
    has_pseudo_adventure: 0,
    has_real_adventure: 0,
    total_downtime: 0,
    faction_downtime: 0,
    other_downtime: 0,
    class_names: 'Wizard',
    ...overrides,
});

const targetCharacter = makeCharacterRow({
    id: 99,
    name: 'New HT',
    guild_status: 'draft',
    start_tier: 'ht',
});
const targetLtCharacter = makeCharacterRow({
    id: 100,
    name: 'New LT',
    guild_status: 'draft',
    start_tier: 'lt',
});

const approvedHt = makeCharacterRow({
    id: 2,
    name: 'Existing HT',
    start_tier: 'ht',
});

const approvedBtRows = Array.from({ length: 8 }, (_, index) => makeCharacterRow({
    id: 10 + index,
    name: `BT ${index + 1}`,
    start_tier: 'bt',
}));
const approvedLtRows = Array.from({ length: 6 }, (_, index) => makeCharacterRow({
    id: 30 + index,
    name: `LT ${index + 1}`,
    start_tier: 'lt',
    // Level 5
    adventure_bubbles: 10,
}));
const approvedEtRows = Array.from({ length: 5 }, (_, index) => makeCharacterRow({
    id: 50 + index,
    name: `ET ${index + 1}`,
    start_tier: 'ht',
    // Level 17
    adventure_bubbles: 136,
}));

let mode = 'one_ht';

require.cache[levelProgressionPath] = {
    id: levelProgressionPath,
    filename: levelProgressionPath,
    loaded: true,
    exports: {
        activeLevelProgressionVersionId: () => 1,
        bubblesRequiredForLevel: (level) => ({
            1: 0,
            2: 1,
            3: 3,
            4: 6,
            5: 10,
            6: 15,
            7: 21,
            8: 28,
            9: 36,
            10: 45,
            11: 55,
            12: 66,
            13: 78,
            14: 91,
            15: 105,
            16: 120,
            17: 136,
            18: 153,
            19: 171,
            20: 190,
        }[level]),
        ensureLevelProgressionLoaded: async () => true,
        levelFromAvailableBubbles: (availableBubbles) => {
            const totals = { 1: 0, 2: 1, 3: 3, 4: 6, 5: 10, 6: 15, 7: 21, 8: 28, 9: 36, 10: 45, 11: 55, 12: 66, 13: 78, 14: 91, 15: 105, 16: 120, 17: 136, 18: 153, 19: 171, 20: 190 };
            let level = 1;
            for (let current = 20; current >= 1; current -= 1) {
                if (Number(availableBubbles) >= totals[current]) {
                    level = current;
                    break;
                }
            }
            return level;
        },
    },
};

const fakeDb = {
    async execute(sql, bindings = []) {
        if (sql.includes('FROM users WHERE discord_id = ? LIMIT 1')) {
            return [[{ id: 7, deleted_at: null, locale: 'de', simplified_tracking: null }]];
        }

        if (sql.startsWith('UPDATE users SET name = ?, avatar = ?, updated_at = ? WHERE id = ?')) {
            return [{ affectedRows: 1 }];
        }

        if (sql.includes('WHERE c.id = ?') && sql.includes('LIMIT 1')) {
            if (Number(bindings[0]) === 100) {
                return [[targetLtCharacter]];
            }
            return [[targetCharacter]];
        }

        if (sql.includes('WHERE c.user_id = ?') && sql.includes('ORDER BY c.position ASC, c.id ASC')) {
            if (mode === 'one_ht') {
                return [[approvedHt, ...approvedBtRows]];
            }

            if (mode === 'six_lt_two_ht') {
                return [[
                    ...approvedLtRows,
                    approvedHt,
                    makeCharacterRow({ id: 3, name: 'Existing HT 2', start_tier: 'ht' }),
                ]];
            }

            if (mode === 'six_lt_two_ht_five_et') {
                return [[
                    ...approvedLtRows,
                    approvedHt,
                    makeCharacterRow({ id: 3, name: 'Existing HT 2', start_tier: 'ht' }),
                    ...approvedEtRows,
                ]];
            }

            if (mode === 'two_ht_full_general') {
                return [[
                    approvedHt,
                    makeCharacterRow({ id: 3, name: 'Existing HT 2', start_tier: 'ht' }),
                    ...approvedBtRows,
                ]];
            }

            return [[
                approvedHt,
                makeCharacterRow({ id: 3, name: 'Existing HT 2', start_tier: 'ht' }),
                ...approvedBtRows.slice(0, 7),
            ]];
        }

        throw new Error(`Unexpected SQL: ${sql}`);
    },
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb,
};

delete require.cache[appDbPath];

const { getCharacterSubmissionStateForDiscord } = require('../appDb');

Promise.resolve()
    .then(async () => {
        const discordUser = {
            id: '117027601209360389',
            username: 'sirrio',
            globalName: 'Sirrio',
            tag: 'sirrio#0001',
            displayAvatarURL: () => 'https://example.test/avatar.png',
        };

        mode = 'one_ht';
        const secondHtState = await getCharacterSubmissionStateForDiscord(discordUser, 99);
        assert.equal(secondHtState.ok, true);
        assert.equal(secondHtState.blockedReason, null);

        mode = 'two_ht';
        const thirdHtState = await getCharacterSubmissionStateForDiscord(discordUser, 99);
        assert.equal(thirdHtState.ok, true);
        assert.equal(thirdHtState.blockedReason, null);

        mode = 'six_lt_two_ht';
        const extraLtState = await getCharacterSubmissionStateForDiscord(discordUser, 100);
        assert.equal(extraLtState.ok, true);
        assert.equal(extraLtState.blockedReason, null);
        const extraHtState = await getCharacterSubmissionStateForDiscord(discordUser, 99);
        assert.equal(extraHtState.ok, true);
        assert.equal(extraHtState.blockedReason, null);

        mode = 'six_lt_two_ht_five_et';
        const extraLtWithEtState = await getCharacterSubmissionStateForDiscord(discordUser, 100);
        assert.equal(extraLtWithEtState.ok, true);
        assert.equal(extraLtWithEtState.blockedReason, null);
        const extraHtWithEtState = await getCharacterSubmissionStateForDiscord(discordUser, 99);
        assert.equal(extraHtWithEtState.ok, true);
        assert.equal(extraHtWithEtState.blockedReason, null);

        mode = 'two_ht_full_general';
        const blockedThirdHtState = await getCharacterSubmissionStateForDiscord(discordUser, 99);
        assert.equal(blockedThirdHtState.ok, true);
        assert.equal(blockedThirdHtState.blockedReason, 'active_limit');

        console.log('app-db-character-submission-state.test.js passed');
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
