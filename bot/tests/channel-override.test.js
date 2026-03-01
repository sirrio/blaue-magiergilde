const assert = require('node:assert/strict');

const previousOverride = process.env.DISCORD_CHANNEL_OVERRIDE_ID;
delete process.env.DISCORD_CHANNEL_OVERRIDE_ID;

let channelOverride = require('../channelOverride');

assert.equal(channelOverride.resolveChannelId('123456789012345678'), '123456789012345678');
assert.equal(channelOverride.resolveChannelId('abc'), '');

process.env.DISCORD_CHANNEL_OVERRIDE_ID = '999999999999999999';
delete require.cache[require.resolve('../channelOverride')];
channelOverride = require('../channelOverride');

assert.equal(channelOverride.getChannelOverrideId(), '999999999999999999');
assert.equal(channelOverride.resolveChannelId('123456789012345678'), '999999999999999999');

if (typeof previousOverride === 'string') {
    process.env.DISCORD_CHANNEL_OVERRIDE_ID = previousOverride;
} else {
    delete process.env.DISCORD_CHANNEL_OVERRIDE_ID;
}

console.log('channel-override.test.js passed');
