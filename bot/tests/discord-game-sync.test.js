const assert = require('node:assert/strict');
const { getGamesScanSinceDate } = require('../gameScanWindow');

const referenceDate = new Date('2026-03-15T00:00:00Z');
const since = getGamesScanSinceDate(referenceDate);

assert.equal(since.toISOString(), '2021-03-15T00:00:00.000Z');

console.log('discord-game-sync.test.js passed');
