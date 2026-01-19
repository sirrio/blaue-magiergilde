const { REST, Routes } = require('discord.js');
const { clientId, guildIds, token } = require('./config');
const fs = require('node:fs');
const path = require('node:path');

if (!token) {
     
    console.error('Missing bot token. Set DISCORD_BOT_TOKEN in the root .env.');
    process.exit(1);
}

if (!clientId) {
     
    console.error('Missing clientId. Set DISCORD_CLIENT_ID in the root .env.');
    process.exit(1);
}

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const guildIdList = Array.isArray(guildIds) ? guildIds.filter(Boolean) : [];
        const targetGuildIds = guildIdList.length > 0 ? guildIdList : [];

        if (targetGuildIds.length === 0) {
            const data = await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
            console.log('Deployed as GLOBAL commands (can take up to ~1h to appear).');
            return;
        }

        for (const gid of targetGuildIds) {
             
            const data = await rest.put(Routes.applicationGuildCommands(clientId, gid), { body: commands });
            console.log(`Successfully reloaded ${data.length} application (/) commands for guildId=${gid}.`);
        }

        console.log(`Deployed as GUILD commands for ${targetGuildIds.length} guild(s) (usually visible immediately).`);
    } catch (error) {
        console.error(error);
    }
})();
