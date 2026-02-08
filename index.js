const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  REST,
  Routes
} = require('discord.js');
const Parser = require('rss-parser');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= CONFIG ================= */

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Admin roles for botpost
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

const parser = new Parser();

/* ================= LAST VIDEO TRACKING ================= */

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

/* ================= BOTPOST ================= */

const pendingBotposts = new Map();

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

/* ================= POLLS ================= */

async function createPoll(channel, question, options) {
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setColor(0x00AAFF)
    .setDescription(options.map((opt, i) => `${i + 1}. ${opt}`).join('\n'));

  const message = await channel.send({ embeds: [embed] });

  for (let i = 0; i < options.length; i++) {
    await message.react(`${i + 1}\u20E3`); // number emoji
  }
}

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message with embed')
    .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Embed description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Optional secondary description').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup anonymous sender (admin only)')
].map(c => c.toJSON());

if (!TOKEN) {
  console.warn('⚠️ BOT_TOKEN is missing. Slash commands will not be registered.');
} else {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  (async () => {
    try {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ Slash commands registered');
    } catch (err) {
      console.error('Error registering commands:', err);
    }
  })();
}

/* ================= INTERACTIONS ================= */

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand() && !hasAdminRole(interaction.member)) {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  const o = interaction.options;

  // Botpost
  if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
    let description = o.getString('description');
    if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
    if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

    const embed = new EmbedBuilder()
      .setTitle(o.getString('title'))
      .setDescription(description)
      .setColor(0xFFFFFF)
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });

    if (o.getRole('ping')) {
      await interaction.channel.send({ content: `<@&${o.getRole('ping').id}>` });
    }

    return interaction.reply({ content: '✅ Botpost sent', ephemeral: true });
  }
});

/* ================= WELCOME MESSAGE ================= */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (
    !oldMember.roles.cache.has(VERIFIED_ROLE_ID) &&
    newMember.roles.cache.has(VERIFIED_ROLE_ID)
  ) {
    const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const endings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];
    const randomEnding = endings[Math.floor(Math.random() * endings.length)];

    const embed = new EmbedBuilder()
      .setTitle(`Welcome to ${newMember.guild.name}, ${newMember.displayName}!`)
      .setDescription(randomEnding)
      .setColor(0xFFFFFF)
      .setImage(WELCOME_BANNER_URL)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setFooter({ text: newMember.guild.name, iconURL: newMember.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ================= ANONYMOUS MESSAGES ================= */

const anonMessages = new Map();

client.on(Events.MessageCreate, async msg => {
  if (ANON_CHANNELS.includes(msg.channel.id) && !msg.author.bot) {
    const anonId = 'ANON-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    anonMessages.set(anonId, { content: msg.content, userId: msg.author.id, channel: msg.channel });

    await msg.delete();
    await msg.channel.send({ content: `✉️ Message sent anonymously • ID: ${anonId}\n${msg.content}` });
  }
});

/* ================= YOUTUBE VOD CHECK ================= */

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

      const embed = new EmbedBuilder()
        .setTitle(latest.title)
        .setURL(latest.link)
        .setDescription('📢 New video uploaded! Go check it out!')
        .setImage(latest['media:group']['media:thumbnail']['$'].url)
        .setColor(0xFF0000)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });
    }
  } catch (err) {
    console.error('YouTube check failed:', err);
  }
}

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  if (TOKEN) {
    await checkYouTube();
    setInterval(checkYouTube, 5 * 60 * 1000);
  }
});

client.login(TOKEN);
