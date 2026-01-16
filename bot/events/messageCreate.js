const { Events } = require('discord.js');
const characters = require('../interactions/characters');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            await characters.handleMessage(message);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
        }
    },
};
