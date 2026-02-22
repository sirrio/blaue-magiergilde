const assert = require('node:assert/strict');
const {
    buildNoticeEmbed,
    buildInfoEmbed,
    buildSuccessEmbed,
    buildWarningEmbed,
    buildErrorEmbed,
} = require('../utils/noticeEmbeds');

const info = buildInfoEmbed('Info title', 'Info body').toJSON();
assert.equal(info.title, 'Info title');
assert.equal(info.description, 'Info body');

const success = buildSuccessEmbed('Success title').toJSON();
assert.equal(success.title, 'Success title');
assert.equal(typeof success.color, 'number');

const warning = buildWarningEmbed('Warning title', 'Warning body').toJSON();
assert.equal(warning.description, 'Warning body');

const error = buildErrorEmbed('Error title', 'Error body').toJSON();
assert.equal(error.title.startsWith('⚠'), true);
assert.equal(error.title.includes('Error title'), true);
assert.equal(error.description, 'Error body');

const fallback = buildNoticeEmbed({ title: 'Fallback', kind: 'unknown' }).toJSON();
assert.equal(fallback.title, 'Fallback');
assert.equal(typeof fallback.color, 'number');

console.log('notice-embeds.test.js passed');
