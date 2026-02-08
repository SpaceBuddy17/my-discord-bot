const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

// Welcome system
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';
const WELCOME_BANNER = 'https://cdn.discordapp.com/attachments/1463012723226054708/1469863777712472114/DestinyWelcomeSlideWidescreen.jpg?ex=698934d1&is=6987e351&hm=5abdc3ed25a039eb96112a6786679bf905d9524d3f3cdc0b794ae86bf01d410f&';

// Anonymous system
const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643',
  '1469852593235824812'
];

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

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot embed message')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup an anonymous sender')
    .addStringOption(o => o.setName('id').setDescription('Anonymous message ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a simple poll')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

/* ================= ANONYMOUS MESSAGES ================= */

const anonMessages = new Map(); // id -> { content, userId, channel }

function makeId() {
  return 'ANON-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* ================= INTERACTIONS ================= */

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const o = interaction.options;

  /* ---------- BOTPOST ---------- */
  if (interaction.commandName === 'botpost') {
    let desc = o.getString('description');
    if (o.getString('description2')) desc += `\n\n${o.getString('description2')}`;
    if (o.getString('link')) desc += `\n\n[Website Link](${o.getString('link')})`;

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle(o.getString('title'))
      .setDescription(desc)
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });

    if (o.getRole('ping')) {
      await interaction.channel.send({ content: `<@&${o.getRole('ping').id}>` });
    }

    return interaction.reply({ content: '✅ Botpost sent', ephemeral: true });
  }

  /* ---------- ANONYMOUS MESSAGE LOOKUP ---------- */
  if (interaction.commandName === 'anonlookup') {
    const id = o.getString('id');
    const record = anonMessages.get(id);
    if (!record) return interaction.reply({ content: '❌ ID not found', ephemeral: true });
    return interaction.reply({ content: `🕵️ Sender: <@${record.userId}>`, ephemeral: true });
  }

  /* ---------- POLL ---------- */
  if (interaction.commandName === 'poll') {
    const question = o.getString('question');
    const poll = await interaction.channel.send({ content: `📊 **Poll:** ${question}` });
    await poll.react('👍');
    await poll.react('👎');
    return interaction.reply({ content: '✅ Poll created', ephemeral: true });
  }

  /* ---------- ANONYMOUS MESSAGES ---------- */
  if (ANON_CHANNELS.includes(interaction.channelId) && o.getString('message')) {
    const content = o.getString('message');
    const anonId = makeId();
    anonMessages.set(anonId, { content, userId: interaction.user.id, channel: interaction.channel });
    await interaction.reply({ content: `✉️ Sent anonymously • ID: ${anonId}`, ephemeral: true });
    await interaction.channel.send({ content: content });
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

    const welcomeEndings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];
    const randomEnding = welcomeEndings[Math.floor(Math.random() * welcomeEndings.length)];

    const embed = new EmbedBuilder()
      .setColor(0xFFFFFF)
      .setTitle(`Welcome to ${newMember.guild.name}, ${newMember.displayName}!`)
      .setDescription(randomEnding)
      .setImage(WELCOME_BANNER)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ================= YOUTUBE VOD SAFE CHECK ================= */

async function checkYouTube() {
  try {
    const feed = await parser.parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
    );

    const latest = feed.items[0];
    if (!latest || !latest.pubDate) return;

    const published = new Date(latest.pubDate).getTime();

    if (!lastVideoDate || published > lastVideoDate) {
      saveLastVideoDate(published);

      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(latest.title)
        .setURL(latest.link)
        .setDescription("📢 New video uploaded! Go check it out!")
        .setImage(latest['media:group']['media:thumbnail']['$'].url)
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
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000); // every 5 minutes
});

client.login(TOKEN);
