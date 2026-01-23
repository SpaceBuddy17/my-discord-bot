const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// 1️⃣ Create bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // needed for auto welcome
  ]
});

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

// 4️⃣ Register slash commands
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
    const embed = new EmbedBuilder()
      .setTitle('👋 Welcome!')
      .setDescription('Welcome to the server! We’re happy to have you here 😄')
      .setColor(0xFF9900)
      .setFooter({ text: 'Your Brand Name' });

    await interaction.reply({ embeds: [embed] });
  }
});

// 6️⃣ Automatic welcome messages
client.on('guildMemberAdd', async (member) => {
  try {
    // Change 'general' to your welcome channel name
    const channel = member.guild.channels.cache.find(
      ch => ch.name === 'general-chat' && ch.isTextBased()
    );

    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(`👋 Welcome, ${member.user.username}!`)
      .setDescription('We’re so happy you joined the server! 😄')
      .setColor(0xFF9900)
      .setFooter({ text: 'Destiny Church' })
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error sending welcome message:', err);
  }
});

// 7️⃣ Log bot in
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(token);
