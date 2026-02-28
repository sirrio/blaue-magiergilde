const { Events } = require('discord.js');
const { startHttpServer } = require('../httpServer');
const { startGameAnnouncementSync } = require('../discordGameSync');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        startHttpServer(client);
        startGameAnnouncementSync(client);
    },
};
