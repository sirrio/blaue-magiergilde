const assert = require('node:assert/strict');
const test = require('node:test');

const { formatDateOnly, formatLocalIsoDate } = require('../dateUtils');

test('formatLocalIsoDate pads month and day', () => {
    const date = new Date(2024, 0, 5);

    assert.equal(formatLocalIsoDate(date), '2024-01-05');
});

test('formatDateOnly returns ISO date from datetime strings', () => {
    assert.equal(formatDateOnly('2024-12-31 13:45:00'), '2024-12-31');
});

test('formatDateOnly returns ISO date from Date instances', () => {
    assert.equal(formatDateOnly(new Date(2025, 3, 9)), '2025-04-09');
});

test('formatDateOnly returns empty string for empty values', () => {
    assert.equal(formatDateOnly(''), '');
});
