const assert = require('node:assert/strict');

const previousPublicUrl = process.env.BOT_PUBLIC_APP_URL;
const previousAppUrl = process.env.APP_URL;

process.env.BOT_PUBLIC_APP_URL = 'https://blaue-magiergilde.de';
process.env.APP_URL = 'https://blaue-magiergilde.de';

delete require.cache[require.resolve('../appUrls')];
delete require.cache[require.resolve('../linkingUi')];

const { legalLinksLine, notLinkedContent } = require('../linkingUi');

const legalLine = legalLinksLine();
assert.equal(legalLine.includes('Rechtliches'), true);
assert.equal(legalLine.includes('/datenschutz'), true);
assert.equal(legalLine.includes('/impressum'), true);

const content = notLinkedContent();
assert.equal(content.includes('Rechtliches'), true);
assert.equal(content.toLowerCase().includes('datenschutz'), true);
assert.equal(content.toLowerCase().includes('impressum'), true);

if (previousPublicUrl === undefined) {
    delete process.env.BOT_PUBLIC_APP_URL;
} else {
    process.env.BOT_PUBLIC_APP_URL = previousPublicUrl;
}

if (previousAppUrl === undefined) {
    delete process.env.APP_URL;
} else {
    process.env.APP_URL = previousAppUrl;
}

delete require.cache[require.resolve('../appUrls')];
delete require.cache[require.resolve('../linkingUi')];

console.log('linking-ui.test.js passed');
