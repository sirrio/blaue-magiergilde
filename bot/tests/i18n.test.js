const assert = require('node:assert/strict');

const previousLocale = process.env.BOT_LOCALE;

delete require.cache[require.resolve('../i18n')];

process.env.BOT_LOCALE = 'de';

const { t, resolveBotLocale } = require('../i18n');

assert.equal(resolveBotLocale(), 'de');
assert.equal(t('linking.createNewAccount'), 'Neuen Account erstellen');
assert.equal(t('approvals.approve', {}, 'en'), 'Approve');
assert.equal(t('missing.key.path'), 'missing.key.path');

if (previousLocale === undefined) {
    delete process.env.BOT_LOCALE;
} else {
    process.env.BOT_LOCALE = previousLocale;
}

delete require.cache[require.resolve('../i18n')];

console.log('i18n.test.js passed');
