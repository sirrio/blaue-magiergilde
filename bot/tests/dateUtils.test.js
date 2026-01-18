const assert = require('node:assert/strict');

const { formatIsoDate, formatLocalIsoDate, formatTimeHHMM } = require('../dateUtils');

(() => {
    const date = new Date(2024, 0, 5);

    assert.equal(formatLocalIsoDate(date), '2024-01-05');
})();

(() => {
    assert.equal(formatIsoDate('2024-10-14 00:00:00'), '2024-10-14');
    assert.equal(formatIsoDate('2024-10-14'), '2024-10-14');
})();

(() => {
    const date = new Date(2024, 0, 5, 9, 7);

    assert.equal(formatTimeHHMM(date), '09:07');
})();

console.log('dateUtils.test.js passed');
