const assert = require('node:assert/strict');

const previousBotAppUrl = process.env.BOT_APP_URL;
const previousBotPublicAppUrl = process.env.BOT_PUBLIC_APP_URL;
const previousAppUrl = process.env.APP_URL;

process.env.BOT_APP_URL = 'http://127.0.0.1';
process.env.BOT_PUBLIC_APP_URL = 'https://blaue-magiergilde.de';
process.env.APP_URL = 'https://blaue-magiergilde.de';

delete require.cache[require.resolve('../appUrls')];

const { resolveApiBaseUrl, resolveApiBaseUrls, resolvePublicBaseUrl } = require('../appUrls');

assert.equal(resolveApiBaseUrl(), 'http://127.0.0.1');
assert.deepEqual(resolveApiBaseUrls(), [
    'http://127.0.0.1',
    'https://blaue-magiergilde.de',
]);
assert.equal(resolvePublicBaseUrl(), 'https://blaue-magiergilde.de');

if (previousBotAppUrl === undefined) {
    delete process.env.BOT_APP_URL;
} else {
    process.env.BOT_APP_URL = previousBotAppUrl;
}

if (previousBotPublicAppUrl === undefined) {
    delete process.env.BOT_PUBLIC_APP_URL;
} else {
    process.env.BOT_PUBLIC_APP_URL = previousBotPublicAppUrl;
}

if (previousAppUrl === undefined) {
    delete process.env.APP_URL;
} else {
    process.env.APP_URL = previousAppUrl;
}

delete require.cache[require.resolve('../appUrls')];

console.log('app-urls.test.js passed');
