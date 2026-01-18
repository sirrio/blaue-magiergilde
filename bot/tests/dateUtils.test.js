const assert = require('node:assert/strict');
const test = require('node:test');

const { formatIsoDate, formatLocalIsoDate, formatTimeHHMM } = require('../dateUtils');

test('formatLocalIsoDate pads month and day', () => {
    const date = new Date(2024, 0, 5);

    assert.equal(formatLocalIsoDate(date), '2024-01-05');
});

test('formatIsoDate normalizes string dates', () => {
    assert.equal(formatIsoDate('2024-10-14 00:00:00'), '2024-10-14');
    assert.equal(formatIsoDate('2024-10-14'), '2024-10-14');
});

test('formatTimeHHMM returns 24-hour time', () => {
    const date = new Date(2024, 0, 5, 9, 7);

    assert.equal(formatTimeHHMM(date), '09:07');
});
