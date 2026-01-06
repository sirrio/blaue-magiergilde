const { Events } = require('discord.js');
const { handleVoiceStateUpdate } = require('../voiceStateCache');

module.exports = {
    name: Events.VoiceStateUpdate,
    execute(oldState, newState) {
        handleVoiceStateUpdate(oldState, newState);
    },
};
