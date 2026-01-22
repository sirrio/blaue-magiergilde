const { Events } = require('discord.js');
const { startHttpServer } = require('../httpServer');
const { refreshOwnerIds } = require('../ownerIdsStore');
const { startGameAnnouncementSync } = require('../discordGameSync');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        startHttpServer(client);
        void refreshOwnerIds();
        startGameAnnouncementSync(client);
        setInterval(() => {
            void refreshOwnerIds();
        }, 5 * 60 * 1000).unref();
    },
};
