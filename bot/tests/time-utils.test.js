const assert = require('node:assert/strict');
const test = require('node:test');

const { formatDurationSeconds } = require('../utils/time');

test('formatDurationSeconds returns hour and minute format', () => {
    assert.equal(formatDurationSeconds(0), '0h 0m');
    assert.equal(formatDurationSeconds(3600), '1h 0m');
    assert.equal(formatDurationSeconds(3720), '1h 2m');
});
