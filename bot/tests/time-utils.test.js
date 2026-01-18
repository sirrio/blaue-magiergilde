const assert = require('node:assert/strict');

const { formatDurationSeconds } = require('../utils/time');

(() => {
    assert.equal(formatDurationSeconds(0), '0h 0m');
    assert.equal(formatDurationSeconds(3600), '1h 0m');
    assert.equal(formatDurationSeconds(3720), '1h 2m');
})();

console.log('time-utils.test.js passed');
