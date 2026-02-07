const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= CONFIG ================= */

const TOKEN = process.env.BOT_TOKEN;

// Roles allowed to use admin commands
const ADMIN_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

// Anonymous message channels
const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643'
];

const BOTPOST_LOG_FILE = './botpost-log.json';
const ANON_LOG_FILE = './anon-log.json';

/* ========================================== */

if (!fs.existsSync(BOTPOST_LOG_FILE)) fs.writeFileSync(BOTPOST_LOG_FILE, '[]');
if (!fs.existsSync(ANON_LOG_FILE)) fs.writeFileSync(ANON_LOG_FILE, '[]');

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

/* =============== COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send an embed via the bot')
    .addStringOption(o =>
      o.setName('title')
        .setDescription('Embed title')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('description')
        .setDescription('Main description (multi-line allowed)')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('description2')
        .setDescription('Secondary description (optional)')
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName('link')
        .setDescription('Website link (optional)')
        .setRequired(false)
    )
    .addRoleOption(o =>
      o.setName('ping')
        .setDescription('Optional role to ping')
        .setRequired(false)
    ),

  new ContextMenuCommandBuilder()
    .setName('Lookup Anonymous Sender')
    .setType(ApplicationCommandType.Message)
];

/* ============== READY ================= */

client.once('ready', async () => {
  await client.application.commands.set(commands);
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ============ INTERACTIONS ============== */

client.on('interactionCreate', async interaction => {

  /* ---------- BOTPOST ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const title = interaction.options.getString('title');
      const desc1 = interaction.options.getString('description');
      const desc2 = interaction.options.getString('description2');
      const link = interaction.options.getString('link');
      const pingRole = interaction.options.getRole('ping');

      let description = desc1;
      if (desc2) description += `\n\n${desc2}`;
      if (link) description += `\n\n**Website Link:** ${link}`;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();

      await interaction.channel.send({
        content: pingRole ? `<@&${pingRole.id}>` : null,
        embeds: [embed]
      });

      // LOG WHO SENT IT
      const logs = JSON.parse(fs.readFileSync(BOTPOST_LOG_FILE));
      logs.push({
        userId: interaction.user.id,
        username: interaction.user.tag,
        channelId: interaction.channel.id,
        time: new Date().toISOString(),
        title
      });
      fs.writeFileSync(BOTPOST_LOG_FILE, JSON.stringify(logs, null, 2));

      await interaction.editReply({ content: '✅ Message sent successfully.' });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Failed to send message.' });
    }
  }

  /* ---------- ANON LOOKUP ---------- */
  if (interaction.isMessageContextMenuCommand() &&
      interaction.commandName === 'Lookup Anonymous Sender') {

    if (!hasAdminRole(interaction.member)) {
      return interaction.reply({ content: '❌ You do not have permission.', ephemeral: true });
    }

    const logs = JSON.parse(fs.readFileSync(ANON_LOG_FILE));
    const entry = logs.find(l => l.messageId === interaction.targetId);

    if (!entry) {
      return interaction.reply({ content: '⚠️ No record found.', ephemeral: true });
    }

    return interaction.reply({
      content: `🕵️ Sent by <@${entry.userId}>`,
      ephemeral: true
    });
  }
});

/* ============ ANON HANDLER =============== */

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channel.id)) return;

  const anonEmbed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setDescription(message.content)
    .setTimestamp();

  const sent = await message.channel.send({ embeds: [anonEmbed] });

  const logs = JSON.parse(fs.readFileSync(ANON_LOG_FILE));
  logs.push({
    messageId: sent.id,
    userId: message.author.id,
    channelId: message.channel.id,
    time: new Date().toISOString()
  });
  fs.writeFileSync(ANON_LOG_FILE, JSON.stringify(logs, null, 2));

  await message.delete();
});

/* =============== LOGIN ================= */

client.login(TOKEN);
