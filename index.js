const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Channels & roles
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!')
].map(c => c.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands', err);
  }
})();

// Slash command handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong!');
  }
});

// 🔔 Welcome message on join (embed + avatar + Verified role check)
client.on(Events.GuildMemberAdd, async member => {
  // Only continue if the member has the Verified role
  if (!member.roles.cache.has(VERIFIED_ROLE_ID)) return;

  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  const welcomeEmbed = {
    color: 0xFFFFFF, // White
    title: `👋 Welcome to ${member.guild.name}, ${member.displayName}!`,
    description: `We’re glad you’re here — feel free to jump in and say hi!`,
    thumbnail: { url: member.user.displayAvatarURL({ dynamic: true, size: 1024 }) },
  };

  channel.send({ embeds: [welcomeEmbed] });
});

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);
