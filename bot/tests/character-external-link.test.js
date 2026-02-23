const assert = require('node:assert/strict');
const { isExternalCharacterLink } = require('../interactions/characterViews');

process.env.APP_URL = 'https://blaue-magiergilde.test';
process.env.BOT_PUBLIC_APP_URL = 'https://blaue-magiergilde.test';

assert.equal(isExternalCharacterLink('https://www.dndbeyond.com/characters/1234567'), true);
assert.equal(isExternalCharacterLink('https://example.com/characters/sheet'), false);
assert.equal(isExternalCharacterLink('https://blaue-magiergilde.test/characters'), false);
assert.equal(isExternalCharacterLink('https://blaue-magiergilde.test/characters/1'), false);

console.log('character-external-link.test.js passed');
