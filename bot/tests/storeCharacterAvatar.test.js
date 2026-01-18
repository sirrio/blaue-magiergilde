const assert = require('node:assert/strict');
const { storeCharacterAvatar } = require('../interactions/characters');

async function run() {
    const originalFetch = global.fetch;
    global.fetch = () => {
        throw new Error('fetch should not be called');
    };

    const missingId = await storeCharacterAvatar(null, 'https://example.com/avatar.png');
    assert.equal(missingId, false);

    const missingUrl = await storeCharacterAvatar(123, '');
    assert.equal(missingUrl, false);

    global.fetch = originalFetch;
    console.log('storeCharacterAvatar.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
