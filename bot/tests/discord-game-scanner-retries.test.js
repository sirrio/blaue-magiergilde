const assert = require('node:assert/strict');

const { scanGameAnnouncements } = require('../discordGameScanner');

function makeMessage(content, createdAt = new Date('2026-01-22T12:00:00Z')) {
    return {
        content,
        channelId: '123',
        guildId: '456',
        id: '999',
        createdAt,
        author: { id: '1', username: 'Tester', avatarURL: () => null },
        member: { displayName: 'Tester' },
        reactions: {
            cache: [],
        },
    };
}

async function testRetriesTransientMessageFetchErrors() {
    let attempts = 0;
    let deliveredBatch = false;
    const message = makeMessage(':MG_BT: 22.01.2026 - 19:00 Uhr - "Retry Test"');
    const batch = {
        size: 1,
        values: function* values() {
            yield message;
        },
    };

    const client = {
        channels: {
            fetch: async () => ({
                isTextBased: () => true,
                messages: {
                    fetch: async () => {
                        attempts += 1;
                        if (attempts === 1) {
                            const error = new Error('Internal Server Error');
                            error.status = 500;
                            throw error;
                        }
                        if (deliveredBatch) {
                            return {
                                size: 0,
                                values: function* values() {},
                            };
                        }
                        deliveredBatch = true;
                        return batch;
                    },
                },
            }),
        },
    };

    const result = await scanGameAnnouncements(client, {
        channelId: '123',
        since: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.equal(result.games.length, 1);
    assert.equal(attempts, 3);
}

async function testReturnsFailureInsteadOfThrowingAfterRepeatedDiscord500s() {
    const client = {
        channels: {
            fetch: async () => ({
                isTextBased: () => true,
                messages: {
                    fetch: async () => {
                        const error = new Error('Internal Server Error');
                        error.status = 500;
                        throw error;
                    },
                },
            }),
        },
    };

    const result = await scanGameAnnouncements(client, {
        channelId: '123',
        since: '2026-01-01T00:00:00.000Z',
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 500);
}

async function run() {
    await testRetriesTransientMessageFetchErrors();
    await testReturnsFailureInsteadOfThrowingAfterRepeatedDiscord500s();
    console.log('discord-game-scanner-retries.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
