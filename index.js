const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  REST,
  Routes
} = require('discord.js');
const Parser = require('rss-parser');
const fs = require('fs');

/* ================= ENV / CONFIG ================= */

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Bot application ID
const GUILD_ID = process.env.GUILD_ID;   // Server ID

if (!TOKEN) {
  console.error('❌ BOT_TOKEN is not set! Exiting...');
  process.exit(1);
}

if (!CLIENT_ID || !GUILD_ID) {
  console.error('❌ CLIENT_ID or GUILD_ID is not set! Exiting...');
  process.exit(1);
}

// Admin roles allowed to use bot commands
const ADMIN_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

// Anonymous channels
const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643',
  '1469852593235824812'
];

// Welcome system
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';
const WELCOME_BANNER_URL = 'https://cdn.discordapp.com/attachments/1463012723226054708/1469863777712472114/DestinyWelcomeSlideWidescreen.jpg?ex=698934d1&is=6987e351&hm=5abdc3ed25a039eb96112a6786679bf905d9524d3f3cdc0b794ae86bf01d410f&';

// YouTube system
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';

// Parser for YouTube RSS
const parser = new Parser();
const LAST_VIDEO_FILE = './lastVideoDate.json';
let lastVideoDate = null;
if (fs.existsSync(LAST_VIDEO_FILE)) {
  try {
    const data = JSON.parse(fs.readFileSync(LAST_VIDEO_FILE, 'utf8'));
    lastVideoDate = data.lastVideoDate;
  } catch (err) {
    console.error('Failed to read lastVideoDate.json', err);
  }
}
function saveLastVideoDate(date) {
  lastVideoDate = date;
  fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ lastVideoDate: date }));
}

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* ================= COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message as an embed')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description (multi-line allowed)').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup the sender of an anonymous message')
    .addStringOption(o => o.setName('message_id').setDescription('ID of the anonymous message').setRequired(true)),

  new SlashCommandBuilder()
    .setName('previewwelcome')
    .setDescription('Preview the welcome message embed'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  new SlashCommandBuilder()
    .setName('testyoutube')
    .setDescription('Send a test YouTube notification')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

/* ================= REGISTER COMMANDS ================= */

async function clearAndRegisterCommands() {
  try {
    console.log('⚠️ Clearing old guild commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
    console.log('✅ Cleared all commands.');

    console.log('⚠️ Registering new commands...');
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Commands registered successfully.');
  } catch (err) {
    console.error('❌ Error clearing/registering commands:', err);
  }
}

/* ================= BOTPOST / ANON HANDLERS ================= */

const pendingBotposts = new Map();
const anonMessages = new Map(); // id -> { content, userId, channel, messageId }

/* ---------------- INTERACTIONS ---------------- */

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.member) return;
    const o = interaction.options;

    // Admin check for bot commands
    if (interaction.isChatInputCommand() && !['ping', 'testyoutube', 'previewwelcome'].includes(interaction.commandName) &&
        !interaction.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id))) {
      return await interaction.reply({ content: '❌ No permission.', ephemeral: true });
    }

    // BOTPOST
    if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
      let description = o.getString('description');
      if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
      if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(o.getString('title'))
        .setDescription(description)
        .setTimestamp();

      const data = { embed, channel: interaction.channel, ping: o.getRole('ping') };
      pendingBotposts.set(interaction.user.id, data);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
      );

      return await interaction.reply({ content: '📋 Preview', embeds: [embed], components: [buttons], ephemeral: true });
    }

    // BUTTONS
    if (interaction.isButton()) {
      const data = pendingBotposts.get(interaction.user.id);
      if (!data) return;

      if (interaction.customId === 'cancel') {
        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
      }

      if (interaction.customId === 'confirm') {
        await data.channel.send({ embeds: [data.embed] });
        if (data.ping) await data.channel.send(`<@&${data.ping.id}>`);
        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
      }
    }

    // PING
    if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
      return interaction.reply('🏓 Pong!');
    }

    // TEST YOUTUBE
    if (interaction.isChatInputCommand() && interaction.commandName === 'testyoutube') {
      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const embed = {
        color: 0xFF0000,
        title: "The Holy Who wk4 || 11.23.25 || Pastor Terry Jimmerson",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        description: "📢 New video uploaded! Go check it out!",
        image: { url: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg" },
        timestamp: new Date()
      };

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });
      return interaction.reply({ content: '✅ Test message sent', ephemeral: true });
    }

    // ANONLOOKUP
    if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
      const msgId = o.getString('message_id');
      const record = Array.from(anonMessages.entries()).find(([id, msg]) => msg.messageId === msgId);
      if (!record) return await interaction.reply({ content: '❌ Could not find sender.', ephemeral: true });
      const [anonId, msg] = record;
      return await interaction.reply({ content: `🕵️ Sender: <@${msg.userId}> • ID: ${anonId}`, ephemeral: true });
    }

    // PREVIEWWELCOME
    if (interaction.isChatInputCommand() && interaction.commandName === 'previewwelcome') {
      const channel = interaction.channel;
      const welcomeEndings = [
        "We’re thrilled to have you in our community!",
        "Feel free to jump in and say hi to everyone!",
        "Glad you joined us — we hope you enjoy your time here!"
      ];
      const randomEnding = welcomeEndings[Math.floor(Math.random() * welcomeEndings.length)];

      const embed = {
        color: 0xFFFFFF,
        title: `Welcome to ${interaction.guild.name}, ${interaction.user.username}!`,
        description: randomEnding,
        thumbnail: { url: interaction.user.displayAvatarURL({ dynamic: true, size: 1024 }) },
        image: { url: WELCOME_BANNER_URL },
        footer: { text: interaction.guild.name, icon_url: interaction.guild.iconURL({ dynamic: true) } },
        timestamp: new Date()
      };

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@${interaction.user.id}>` });
      return await interaction.reply({ content: '✅ Preview sent in this channel.', ephemeral: true });
    }

  } catch (err) {
    console.error('Interaction error:', err);
    if (!interaction.replied) await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
  }
});

/* ---------------- ANONYMOUS MESSAGE HANDLER ---------------- */
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channel.id)) return;

  const anonId = 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel, messageId: message.id });

  await message.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('✉️ Anonymous Message')
    .setDescription(message.content)
    .setFooter({ text: `ID: ${anonId}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
});

/* ---------------- WELCOME MESSAGE ---------------- */
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (!oldMember.roles.cache.has(VERIFIED_ROLE_ID) && newMember.roles.cache.has(VERIFIED_ROLE_ID)) {
    const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const welcomeEndings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];
    const randomEnding = welcomeEndings[Math.floor(Math.random() * welcomeEndings.length)];

    const welcomeEmbed = {
      color: 0xFFFFFF,
      title: `Welcome to ${newMember.guild.name}, ${newMember.displayName}!`,
      description: randomEnding,
      thumbnail: { url: newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }) },
      image: { url: WELCOME_BANNER_URL },
      footer: { text: newMember.guild.name, icon_url: newMember.guild.iconURL({ dynamic: true) } },
      timestamp: new Date()
    };

    await channel.send({ embeds: [welcomeEmbed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ---------------- YOUTUBE CHECK ---------------- */
async function checkYouTube() {
  try {
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
    const latest = feed.items[0];
    if (!latest || !latest.pubDate) return;

    const published = new Date(latest.pubDate).getTime();
    if (!lastVideoDate || published > lastVideoDate) {
      saveLastVideoDate(published);

      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const embed = {
        color: 0xFF0000,
        title: latest.title,
        url: latest.link,
        description: "📢 New video uploaded! Go check it out!",
        image: { url: latest['media:group']['media:thumbnail']['$'].url },
        timestamp: new Date()
      };

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });
    }
  } catch (err) {
    console.error('YouTube check failed:', err);
  }
}

/* ---------------- READY ---------------- */
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Automatically clear & register guild commands
  await clearAndRegisterCommands();

  // Immediate YouTube check
  await checkYouTube();

  // Repeat every 5 minutes
  setInterval(checkYouTube, 5 * 60 * 1000);
});

client.login(TOKEN);
