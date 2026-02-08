const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
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

// Welcome
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';
const WELCOME_BANNER = 'https://cdn.discordapp.com/attachments/1463012723226054708/1469863777712472114/DestinyWelcomeSlideWidescreen.jpg?ex=698934d1&is=6987e351&hm=5abdc3ed25a039eb96112a6786679bf905d9524d3f3cdc0b794ae86bf01d410f&';

// YouTube
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';
const parser = new Parser();

// Last video tracking
const LAST_VIDEO_FILE = './lastVideoDate.json';
let lastVideoDate = null;
if (fs.existsSync(LAST_VIDEO_FILE)) {
  try {
    lastVideoDate = JSON.parse(fs.readFileSync(LAST_VIDEO_FILE, 'utf8')).lastVideoDate;
  } catch {}
}
function saveLastVideoDate(date) {
  lastVideoDate = date;
  fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ lastVideoDate: date }));
}

// Pending and anonymous messages
const pendingBotposts = new Map();
const anonMessages = new Map();

/* ================= HELPERS ================= */

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot embed message')
    .addStringOption(o => o.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup anonymous message sender'),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a simple poll')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('options').setDescription('Comma-separated options, up to 10').setRequired(true))
].map(cmd => cmd.toJSON());

/* ============ REGISTER COMMANDS ============ */
const { REST } = require('discord.js');
const { Routes } = require('discord.js');
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('✅ Slash commands registered');
})();

/* ============ INTERACTIONS ============ */

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const o = interaction.options;

  // Permission check
  if (['botpost', 'poll', 'anonlookup'].includes(interaction.commandName) && !hasAdminRole(interaction.member)) {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  // BOTPOST
  if (interaction.commandName === 'botpost') {
    let description = o.getString('description');
    if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
    if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle(o.getString('title'))
      .setDescription(description)
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });
    const role = o.getRole('ping');
    if (role) await interaction.channel.send({ content: `<@&${role.id}>` });
    return interaction.reply({ content: '✅ Embed sent.', ephemeral: true });
  }

  // POLL
  if (interaction.commandName === 'poll') {
    const question = o.getString('question');
    const options = o.getString('options').split(',').map(opt => opt.trim()).slice(0, 10);
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const description = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle(question)
      .setDescription(description)
      .setColor(0x00FF00)
      .setTimestamp();

    const pollMessage = await interaction.channel.send({ embeds: [embed] });
    for (let i = 0; i < options.length; i++) await pollMessage.react(emojis[i]);
  }

  // ANONYMOUS LOOKUP
  if (interaction.commandName === 'anonlookup') {
    const record = Array.from(anonMessages.entries())[0]; // simple example, adapt to your storage
    if (!record) return interaction.reply({ content: '❌ Could not find sender.', ephemeral: true });
    const [anonId, msg] = record;
    return interaction.reply({ content: `🕵️ Sender: <@${msg.userId}> • ID: ${anonId}`, ephemeral: true });
  }
});

/* ============ ANONYMOUS MESSAGES ============ */

client.on(Events.MessageCreate, async message => {
  if (ANON_CHANNELS.includes(message.channelId) && !message.author.bot) {
    const anonId = `ANON-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel });
    await message.delete();
    await message.channel.send({ content: `✉️ Sent anonymously • ID: ${anonId}` });
  }
});

/* ============ WELCOME MESSAGE ============ */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  if (!oldMember.roles.cache.has(VERIFIED_ROLE_ID) && newMember.roles.cache.has(VERIFIED_ROLE_ID)) {
    const welcomeEndings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];
    const randomEnding = welcomeEndings[Math.floor(Math.random() * welcomeEndings.length)];

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0xFFFFFF)
      .setTitle(`Welcome to ${newMember.guild.name}, ${newMember.displayName}!`)
      .setDescription(randomEnding)
      .setImage(WELCOME_BANNER)
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .setTimestamp();

    await channel.send({ embeds: [welcomeEmbed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ============ YOUTUBE CHECK (VOD SAFE) ============ */

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
        .setColor(0xFF0000)
        .setTitle(latest.title)
        .setURL(latest.link)
        .setDescription("📢 New video uploaded! Go check it out!")
        .setImage(latest['media:group']['media:thumbnail']['$'].url)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });
    }
  } catch (err) { console.error('YouTube check failed:', err); }
}

/* ============ READY ============ */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000); // every 5 mins
});

/* ============ LOGIN ============ */

client.login(TOKEN);
