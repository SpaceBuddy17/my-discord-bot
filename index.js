const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  PermissionFlagsBits,
  Events
} = require('discord.js');

require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// ===== CONFIG =====
const ALLOWED_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a message via the bot')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to send')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post in')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('botpostembed')
    .setDescription('Send an embedded message via the bot')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Embed title')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Embed description')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('ping')
        .setDescription('Optional role to ping')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('image')
        .setDescription('Optional image URL')
        .setRequired(false))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post in')
        .setRequired(false))
].map(cmd => cmd.toJSON());

// ===== REGISTER COMMANDS =====
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered.');
  } catch (err) {
    console.error(err);
  }
})();

// ===== INTERACTIONS =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Role check
  const memberRoles = interaction.member.roles.cache;
  const hasPermission = ALLOWED_ROLES.some(roleId =>
    memberRoles.has(roleId)
  );

  if (!hasPermission) {
    await interaction.reply({
      content: '❌ You do not have permission to use this command.',
      ephemeral: true
    });
    return;
  }

  // ===== /botpost =====
  if (interaction.commandName === 'botpost') {
    const message = interaction.options.getString('message');
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption || interaction.channel;

    await targetChannel.send({ content: message });
    // silent
  }

  // ===== /botpostembed =====
  if (interaction.commandName === 'botpostembed') {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const image = interaction.options.getString('image');
    const pingRole = interaction.options.getRole('ping');
    const channelOption = interaction.options.getChannel('channel');
    const targetChannel = channelOption || interaction.channel;

    const embed = {
      color: 0xFFFFFF, // ALWAYS WHITE
      title,
      description,
      timestamp: new Date()
    };

    if (image) {
      embed.image = { url: image };
    }

    if (pingRole) {
      await targetChannel.send({
        content: `<@&${pingRole.id}>`,
        embeds: [embed]
      });
    } else {
      await targetChannel.send({
        embeds: [embed]
      });
    }
    // silent
  }
});

// ===== LOGIN =====
client.login(process.env.BOT_TOKEN);
