const fs = require('node:fs');
const path = require('node:path');
const { Collection, SlashCommandBuilder } = require('discord.js');
const { commandName } = require('../../commandConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(commandName('reload'))
        .setDescription('Reloads all commands.'),
    async execute(interaction) {
        const foldersPath = path.join(__dirname, '..');
        const commandFolders = fs.readdirSync(foldersPath);
        const { client } = interaction;

        client.commands = new Collection();

        try {
            for (const folder of commandFolders) {
                const commandsPath = path.join(foldersPath, folder);
                const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                    } else {
                        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    }
                }
            }

            await interaction.reply('All commands were reloaded!');
        } catch (error) {
            console.error(error);
            await interaction.reply(`There was an error while reloading commands:\n\`${error.message}\``);
        }
    },
};
