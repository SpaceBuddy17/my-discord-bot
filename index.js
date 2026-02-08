const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
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

// Admins
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
const WELCOME_CHANNEL_ID = '1463012723226054708';
const VERIFIED_ROLE_ID = '1137122628801405018';
const WELCOME_IMAGE_URL = 'https://cdn.discordapp.com/attachments/1463012723226054708/1469863777712472114/DestinyWelcomeSlideWidescreen.jpg?ex=698934d1&is=6987e351&hm=5abdc3ed25a039eb96112a6786679bf905d9524d3f3cdc0b794ae86bf01d410f&';

// YouTube system
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';

const parser = new Parser();

/* ================= PERSISTENT DATA ================= */

const pendingBotposts = new Map();
const anonMessages = new Map();
const LAST_VIDEO_FILE = './lastVideoDate.json';
let lastVideoDate = null;

if (fs.existsSync(LAST_VIDEO_FILE)) {
  try {
    lastVideoDate = JSON.parse(fs.readFileSync(LAST_VIDEO_FILE, 'utf8')).lastVideoDate;
  } catch (err) {
    console.error('Failed to read lastVideoDate.json', err);
  }
}

function saveLastVideoDate(date) {
  lastVideoDate = date;
  fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ lastVideoDate: date }));
}

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

function makeId() {
  return 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description (multi-line allowed)').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('previewwelcome')
    .setDescription('Preview the welcome message'),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup an anonymous message sender')
    .addStringOption(o => o.setName('id').setDescription('Anonymous message ID').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

/* ================= INTERACTIONS ================= */

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const o = interaction.options;

  // Permissions check
  if (interaction.isChatInputCommand() && !hasAdminRole(interaction.member) &&
      ['botpost'].includes(interaction.commandName)) {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  /* ---------- BOTPOST ---------- */
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

    return interaction.reply({ content: '📋 Preview', embeds: [embed], components: [buttons], ephemeral: true });
  }

  /* ---------- CONFIRM/CANCEL BOTPOST ---------- */
  if (interaction.isButton()) {
    const data = pendingBotposts.get(interaction.user.id);
    if (!data) return;

    if (interaction.customId === 'cancel') {
      pendingBotposts.delete(interaction.user.id);
      return interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
    }

    if (interaction.customId === 'confirm') {
      await data.channel.send({ embeds: [data.embed] });
      if (data.ping) await data.channel.send({ content: `<@&${data.ping.id}>` });
      pendingBotposts.delete(interaction.user.id);
      return interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
    }
  }

  /* ---------- PREVIEW WELCOME ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'previewwelcome') {
    const embed = {
      color: 0xFFFFFF,
      title: `Welcome to ${interaction.guild.name}!`,
      description: "We’re thrilled to have you here! Feel free to jump in and say hello!",
      image: { url: WELCOME_IMAGE_URL },
      timestamp: new Date()
    };
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  /* ---------- ANON LOOKUP ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
    const id = o.getString('id');
    const record = anonMessages.get(id);
    if (!record) return interaction.reply({ content: '❌ Could not find sender.', ephemeral: true });
    return interaction.reply({ content: `🕵️ Sender: <@${record.userId}> • ID: ${id}`, ephemeral: true });
  }
});

/* ================= ANONYMOUS CHANNEL HANDLER ================= */

client.on(Events.MessageCreate, async message => {
  if (!ANON_CHANNELS.includes(message.channelId) || message.author.bot) return;

  const anonId = makeId();
  anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel });
  await message.delete();
  await message.channel.send({ content: message.content });
});

/* ================= WELCOME MESSAGE ================= */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (!oldMember.roles.cache.has(VERIFIED_ROLE_ID) &&
      newMember.roles.cache.has(VERIFIED_ROLE_ID)) {

    const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const endings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];
    const randomEnding = endings[Math.floor(Math.random() * endings.length)];

    const embed = {
      color: 0xFFFFFF,
      title: `Welcome to ${newMember.guild.name}, ${newMember.displayName}!`,
      description: randomEnding,
      image: { url: WELCOME_IMAGE_URL },
      timestamp: new Date()
    };

    await channel.send({ embeds: [embed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ================= YOUTUBE CHECK ================= */

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

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000);
});

/* ================= LOGIN ================= */

client.login(TOKEN);
