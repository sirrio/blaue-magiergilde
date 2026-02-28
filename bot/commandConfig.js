const { commandPrefix } = require('./config');

function normalizePrefix(input) {
    const prefix = String(input || '').trim().toLowerCase();
    if (!prefix) return 'mg';
    if (!/^[a-z0-9-]{1,32}$/.test(prefix)) {
        throw new Error('DISCORD_COMMAND_PREFIX must match /^[a-z0-9-]{1,32}$/');
    }
    return prefix;
}

function commandName(suffix) {
    const prefix = normalizePrefix(commandPrefix || 'mg');
    const cleanedSuffix = String(suffix || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{1,32}$/.test(cleanedSuffix)) {
        throw new Error('Command suffix must match /^[a-z0-9-]{1,32}$/');
    }
    const name = `${prefix}-${cleanedSuffix}`;
    if (name.length > 32) {
        throw new Error(`Slash command name too long (${name.length}/32): ${name}`);
    }
    return name;
}

module.exports = {
    commandName,
};
