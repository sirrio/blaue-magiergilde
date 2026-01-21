const assert = require('node:assert/strict');
const { storeCharacterAvatar } = require('../interactions/characters');

async function run() {
    const originalFetch = global.fetch;
    global.fetch = () => {
        throw new Error('fetch should not be called');
    };

    const missingId = await storeCharacterAvatar(null, 'https://example.com/avatar.png');
    assert.equal(missingId.ok, false);
    assert.equal(missingId.reason, 'missing_input');

    const missingUrl = await storeCharacterAvatar(123, '');
    assert.equal(missingUrl.ok, false);
    assert.equal(missingUrl.reason, 'missing_input');

    global.fetch = originalFetch;
    console.log('storeCharacterAvatar.test.js passed');
}

run().catch(error => {
    console.error(error);
    process.exit(1);
});
