
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder 
} = require('discord.js');

// 1️⃣ Create bot client
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

// 2️⃣ Config from Railway environment variables
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
    .setDescription('Sends a branded welcome message'),
  new SlashCommandBuilder()
    .setName('selfroles')
    .setDescription('Sends a self-role message with buttons')
].map(cmd => cmd.toJSON());

// 4️⃣ Register commands with Discord
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Slash commands registered successfully!');
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
      embeds: [new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription('Welcome to the server! We’re happy to have you here 😄')
        .setColor(0xFF9900)
        .setFooter({ text: 'Your Brand Name' })
      ]
    });
  }

  if (interaction.commandName === 'selfroles') {
    // Create buttons for roles
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('role_gamer')
          .setLabel('Gamer')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('role_artist')
          .setLabel('Artist')
          .setStyle(ButtonStyle.Secondary),
      );

    await interaction.reply({
      content: 'Click a button to get your role!',
      components: [row],
      ephemeral: true
    });
  }
});

// 6️⃣ Handle button interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  let roleId;

  // Map button IDs to actual Discord role IDs
  if (interaction.customId === 'role_gamer') roleId = 'ROLE_ID_FOR_GAMER';
  if (interaction.customId === 'role_artist') roleId = 'ROLE_ID_FOR_ARTIST';

  if (!roleId) return;

  try {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ content: 'Role removed!', ephemeral: true });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({ content: 'Role added!', ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Failed to assign role.', ephemeral: true });
  }
});

// 7️⃣ Log bot in
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(token);
