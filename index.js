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

// 🔔 Welcome message after Verified role is assigned with cohesive random messages
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  // Only trigger if the Verified role was just added
  if (
    !oldMember.roles.cache.has(VERIFIED_ROLE_ID) &&
    newMember.roles.cache.has(VERIFIED_ROLE_ID)
  ) {

    // Random welcome sentence endings
    const welcomeEndings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];

    const randomEnding = welcomeEndings[Math.floor(Math.random() * welcomeEndings.length)];

    // Embed with cohesive greeting
    const welcomeEmbed = {
      color: 0xFFFFFF, // White
      title: `👋 Welcome to ${newMember.guild.name}, ${newMember.displayName}!`,
      description: randomEnding,
      thumbnail: { url: newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }) },
      footer: {
        text: newMember.guild.name,
        icon_url: newMember.guild.iconURL({ dynamic: true })
      },
      timestamp: new Date()
    };

    // Send embed first, ping underneath
    channel.send({
      content: `<@${newMember.id}>`, // Ping appears below embed
      embeds: [welcomeEmbed]
    });
  }
});

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);
