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
const WELCOME_BANNER = 'https://cdn.discordapp.com/attachments/1463012723226054708/1469863777712472114/DestinyWelcomeSlideWidescreen.jpg?ex=698934d1&is=6987e351&hm=5abdc3ed25a039eb96112a6786679bf905d9524d3f3cdc0b794ae86bf01d410f&';

// YouTube system
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';
const parser = new Parser();
const LAST_VIDEO_FILE = './lastVideoDate.json';
let lastVideoDate = null;
if (fs.existsSync(LAST_VIDEO_FILE)) {
  try {
    lastVideoDate = JSON.parse(fs.readFileSync(LAST_VIDEO_FILE, 'utf8')).lastVideoDate;
  } catch (err) { console.error('Failed to read lastVideoDate.json', err); }
}

function saveLastVideoDate(date) {
  lastVideoDate = date;
  fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ lastVideoDate: date }));
}

/* =============== HELPERS ================= */

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

function makeId() {
  return 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* =============== BOTPOST ================= */

const pendingBotposts = new Map();

async function handleBotpost(interaction) {
  const o = interaction.options;
  let description = o.getString('description');
  if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
  if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

  const embed = new EmbedBuilder()
    .setColor(0xffffff)
    .setTitle(o.getString('title'))
    .setDescription(description)
    .setTimestamp();

  const data = {
    embed,
    channel: interaction.channel,
    ping: o.getRole('ping')
  };
  pendingBotposts.set(interaction.user.id, data);

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
  );

  return interaction.reply({
    content: '📋 Preview',
    embeds: [embed],
    components: [buttons],
    ephemeral: true
  });
}

/* =============== POLL CREATOR ================= */

async function createPoll(channel, question, options) {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  const description = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(question)
    .setDescription(description)
    .setColor(0x00AAFF)
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed] });
  for (let i = 0; i < options.length; i++) {
    await msg.react(emojis[i]);
  }
}

/* =============== SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message with embed')
    .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup an anonymous message sender')
    .addStringOption(o => o.setName('id').setDescription('Anonymous message ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with up to 5 options')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3').setRequired(false))
    .addStringOption(o => o.setName('option4').setDescription('Option 4').setRequired(false))
    .addStringOption(o => o.setName('option5').setDescription('Option 5').setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('✅ Slash commands registered');
})();

/* =============== INTERACTIONS ================= */

const anonMessages = new Map();

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if ((interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) &&
      !hasAdminRole(interaction.member) && interaction.commandName === 'botpost') {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  /* BOTPOST */
  if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
    return handleBotpost(interaction);
  }

  /* BUTTONS */
  if (interaction.isButton()) {
    const data = pendingBotposts.get(interaction.user.id);
    if (!data) return;

    if (interaction.customId === 'cancel') {
      pendingBotposts.delete(interaction.user.id);
      return interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
    }

    if (interaction.customId === 'confirm') {
      // Send embed first
      await data.channel.send({ embeds: [data.embed] });
      // Send role ping after
      if (data.ping) await data.channel.send({ content: `<@&${data.ping.id}>` });
      pendingBotposts.delete(interaction.user.id);
      return interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
    }
  }

  /* ANON LOOKUP */
  if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
    const id = interaction.options.getString('id');
    const record = anonMessages.get(id);
    if (!record) return interaction.reply({ content: '❌ Not found.', ephemeral: true });
    return interaction.reply({ content: `🕵️ Sender: <@${record.userId}>`, ephemeral: true });
  }

  /* POLL */
  if (interaction.isChatInputCommand() && interaction.commandName === 'poll') {
    const question = interaction.options.getString('question');
    const options = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }
    if (options.length < 2) return interaction.reply({ content: 'Need at least 2 options.', ephemeral: true });
    await createPoll(interaction.channel, question, options);
    return; // silently post poll
  }
});

/* =============== ANONYMOUS MESSAGES ================= */

client.on(Events.MessageCreate, async message => {
  if (!ANON_CHANNELS.includes(message.channelId)) return;
  if (message.author.bot) return;

  const anonId = makeId();
  anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel });
  await message.delete();
  await message.channel.send({ content: message.content });
});

/* =============== WELCOME MESSAGE ================= */

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
      .setFooter({ text: newMember.guild.name, iconURL: newMember.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    await channel.send({ embeds: [welcomeEmbed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* =============== YOUTUBE CHECK ================= */

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
  } catch (err) {
    console.error('YouTube check failed:', err);
  }
}

/* =============== READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000);
});

client.login(TOKEN);
