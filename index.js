const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
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

/* ================= CONFIG ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ADMIN_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643',
  '1469852593235824812'
];

const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';

/* ================= HELPERS ================= */

const parser = new Parser();
const pendingBotposts = new Map();
const scheduledPosts = [];
const anonMessages = new Map();
const pollPreviews = new Map();
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

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

function pacificToUTC(mmddyyyy, time24) {
  const [m, d, y] = mmddyyyy.split('-').map(Number);
  const [hh, mm] = time24.split(':').map(Number);
  const pacific = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = new Date(pacific.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return offset;
}

function formatPacific(date) {
  return date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function makeId() {
  return 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message with embed')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup anonymous sender'),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3').setRequired(false))
    .addStringOption(o => o.setName('option4').setDescription('Option 4').setRequired(false))
    .addStringOption(o => o.setName('option5').setDescription('Option 5').setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

/* ================= READY ================= */

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= INTERACTIONS ================= */

client.on('interactionCreate', async interaction => {
  if ((interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) &&
      !hasAdminRole(interaction.member)) {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  const o = interaction.options;

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

    await interaction.channel.send({
      embeds: [embed]
    });

    const ping = o.getRole('ping');
    if (ping) await interaction.channel.send({ content: `<@&${ping.id}>` });

    return interaction.reply({ content: '✅ Botpost sent.', ephemeral: true });
  }

  /* ---------- ANONYMOUS LOOKUP ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
    return interaction.reply({ content: 'Use the anonMessages Map to lookup users by ID.', ephemeral: true });
  }

  /* ---------- POLL ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'poll') {
    const question = o.getString('question');
    const options = [
      o.getString('option1'),
      o.getString('option2'),
      o.getString('option3'),
      o.getString('option4'),
      o.getString('option5')
    ].filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(question)
      .setDescription(options.map((opt, i) => `**${i + 1}.** ${opt}`).join('\n'))
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('poll_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('poll_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    pollPreviews.set(interaction.user.id, { embed, options, channel: interaction.channel });
    return interaction.reply({ content: 'Preview poll:', embeds: [embed], components: [row], ephemeral: true });
  }

  /* ---------- POLL BUTTONS ---------- */
  if (interaction.isButton()) {
    const data = pollPreviews.get(interaction.user.id);
    if (!data) return;

    if (interaction.customId === 'poll_cancel') {
      pollPreviews.delete(interaction.user.id);
      return interaction.update({ content: '❌ Poll canceled.', embeds: [], components: [] });
    }

    if (interaction.customId === 'poll_confirm') {
      const pollMessage = await data.channel.send({ embeds: [data.embed] });
      for (let i = 0; i < data.options.length; i++) {
        await pollMessage.react(`${i+1}\u20E3`); // 1️⃣, 2️⃣, etc.
      }
      pollPreviews.delete(interaction.user.id);
      return interaction.update({ content: '✅ Poll posted.', embeds: [], components: [] });
    }
  }
});

/* ====================== ANONYMOUS MESSAGING (EMBED) ====================== */

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channelId)) return;

  const anonId = makeId();
  anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel });

  await message.delete();

  const embed = new EmbedBuilder()
    .setColor(0xAAAAAA)
    .setTitle('Anonymous Message')
    .setDescription(message.content)
    .setFooter({ text: `ID: ${anonId}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
});

/* ====================== WELCOME MESSAGE ====================== */

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

    const embed = new EmbedBuilder()
      .setColor(0xFFFFFF)
      .setTitle(`Welcome to ${newMember.guild.name}, ${newMember.displayName}!`)
      .setDescription(randomEnding)
      .setImage('https://cdn.discordapp.com/attachments/1463012723226054708/1469863777712472114/DestinyWelcomeSlideWidescreen.jpg?ex=698934d1&is=6987e351&hm=5abdc3ed25a039eb96112a6786679bf905d9524d3f3cdc0b794ae86bf01d410f&')
      .setThumbnail({ url: newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }) })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ====================== YOUTUBE CHECK ====================== */

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

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000);
});

/* ====================== LOGIN ====================== */

client.login(TOKEN);
