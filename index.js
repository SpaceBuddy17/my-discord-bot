require('dotenv').config();

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

// 1️⃣ Create bot client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 2️⃣ Config from Railway secrets
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// 3️⃣ Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Sends a branded welcome message')
].map(cmd => cmd.toJSON());

// 4️⃣ Register commands with Discord
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error(error);
  }
})();

// 5️⃣ Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }

  if (interaction.commandName === 'welcome') {
    await interaction.reply({
      embeds: [{
        title: '👋 Welcome!',
        description: 'Welcome to the server! We’re happy to have you here 😄',
        color: 0xFF9900,
        footer: { text: 'Your Brand Name' }
      }]
    });
  }
});

// 6️⃣ Log bot in
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(token);
