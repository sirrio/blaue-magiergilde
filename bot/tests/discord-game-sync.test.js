const assert = require('node:assert/strict');
const { getGamesScanSinceDate } = require('../gameScanWindow');

// Reference inside CET (no DST). Use months that stay within the same DST regime
// so we can assert exact UTC strings without timezone arithmetic noise.
const referenceDate = new Date('2026-03-15T00:00:00Z');
const sinceDefault = getGamesScanSinceDate({ referenceDate });
const sinceCustom = getGamesScanSinceDate({ referenceDate, months: 1 });

assert.equal(sinceDefault.toISOString(), '2025-12-15T00:00:00.000Z');
assert.equal(sinceCustom.toISOString(), '2026-02-15T00:00:00.000Z');

// Clamping: out-of-range values are pulled into the [1, 24] window.
const sinceTooLow = getGamesScanSinceDate({ referenceDate, months: 0 });
assert.equal(sinceTooLow.toISOString(), '2026-02-15T00:00:00.000Z');

const sinceTooHigh = getGamesScanSinceDate({ referenceDate, months: 100 });
assert.equal(sinceTooHigh.toISOString(), '2024-03-15T00:00:00.000Z');

console.log('discord-game-sync.test.js passed');
