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

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Change 'roles' to the channel where you want the buttons
  const channel = client.channels.cache.find(
    ch => ch.name === 'admin-chat' && ch.isTextBased()
  );
  if (!channel) return;

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('role_Men's Group')
        .setLabel('♂️ Man')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('role_artist')
        .setLabel('Artist')
        .setStyle(ButtonStyle.Primary)
    );

  await channel.send({
    content: 'Click a button to get your role!',
    components: [row]
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  let roleName;
  if (interaction.customId === 'role_gamer') roleName = 'Gamer';
  if (interaction.customId === 'role_artist') roleName = 'Artist';

  if (!roleName) return;

  const role = interaction.guild.roles.cache.find(r => r.name === roleName);
  if (!role) return interaction.reply({ content: 'Role not found!', ephemeral: true });

  try {
    if (interaction.member.roles.cache.has(role.id)) {
      await interaction.member.roles.remove(role);
      return interaction.reply({ content: `Removed your **${roleName}** role!`, ephemeral: true });
    } else {
      await interaction.member.roles.add(role);
      return interaction.reply({ content: `Added **${roleName}** role!`, ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: `I can't assign that role. Make sure I have permission!`, ephemeral: true });
  }
});

