const assert = require('node:assert/strict');
const test = require('node:test');

const { formatLocalIsoDate } = require('../dateUtils');

test('formatLocalIsoDate pads month and day', () => {
    const date = new Date(2024, 0, 5);

    assert.equal(formatLocalIsoDate(date), '2024-01-05');
});
