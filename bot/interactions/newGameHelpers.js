function isThreadChannel(channel) {
    return Boolean(channel?.isThread?.());
}

function threadRestrictionMessage() {
    return 'Please run this command in a non-thread channel so the bot can create a new game thread.';
}

module.exports = { isThreadChannel, threadRestrictionMessage };
