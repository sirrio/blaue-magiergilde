const assert = require('node:assert/strict');
const { getGamesScanSinceDate } = require('../gameScanWindow');

const referenceDate = new Date('2026-03-15T00:00:00Z');
const sinceDefault = getGamesScanSinceDate({ referenceDate });
const sinceCustom = getGamesScanSinceDate({ referenceDate, years: 5 });

assert.equal(sinceDefault.toISOString(), '2016-03-15T00:00:00.000Z');
assert.equal(sinceCustom.toISOString(), '2021-03-15T00:00:00.000Z');

console.log('discord-game-sync.test.js passed');
