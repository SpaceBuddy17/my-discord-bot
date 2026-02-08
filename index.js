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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

/* ====================== CONFIG ====================== */

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Admin roles
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

/* ====================== HELPERS ====================== */

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

function makeId() {
  return 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* ====================== COMMANDS ====================== */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot embed message')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description (multi-line allowed)').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(o => o.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3').setRequired(false))
    .addStringOption(o => o.setName('option4').setDescription('Option 4').setRequired(false))
    .addStringOption(o => o.setName('option5').setDescription('Option 5').setRequired(false))
    .addStringOption(o => o.setName('emoji1').setDescription('Emoji for option 1').setRequired(true))
    .addStringOption(o => o.setName('emoji2').setDescription('Emoji for option 2').setRequired(true))
    .addStringOption(o => o.setName('emoji3').setDescription('Emoji for option 3').setRequired(false))
    .addStringOption(o => o.setName('emoji4').setDescription('Emoji for option 4').setRequired(false))
    .addStringOption(o => o.setName('emoji5').setDescription('Emoji for option 5').setRequired(false))
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

/* ====================== INTERACTIONS ====================== */

const pendingBotposts = new Map();
const pendingPolls = new Map();
const anonMessages = new Map();

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  if (interaction.isChatInputCommand() && !hasAdminRole(interaction.member)) {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  const o = interaction.options;

  /* ---------- BOTPOST ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
    let desc = o.getString('description');
    if (o.getString('description2')) desc += `\n\n${o.getString('description2')}`;
    if (o.getString('link')) desc += `\n\n[Website Link](${o.getString('link')})`;

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle(o.getString('title'))
      .setDescription(desc)
      .setTimestamp();

    const data = { embed, channel: interaction.channel, ping: o.getRole('ping') };
    pendingBotposts.set(interaction.user.id, data);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_botpost').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel_botpost').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ content: '📋 Preview', embeds: [embed], components: [buttons], ephemeral: true });
  }

  /* ---------- POLL ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === 'poll') {
    const question = o.getString('question');
    const options = [];
    const emojis = [];
    for (let i = 1; i <= 5; i++) {
      const opt = o.getString(`option${i}`);
      const emj = o.getString(`emoji${i}`);
      if (opt && emj) { options.push(opt); emojis.push(emj); }
    }
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((opt, idx) => `${emojis[idx]} • **${opt}**`).join('\n'))
      .setColor(0x00AAFF)
      .setTimestamp();

    pendingPolls.set(interaction.user.id, { embed, channel: interaction.channel, options, emojis });
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_poll').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel_poll').setLabel('Cancel').setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({ content: '📋 Preview Poll', embeds: [embed], components: [buttons], ephemeral: true });
  }

  /* ---------- BUTTON HANDLER ---------- */
  if (interaction.isButton()) {
    const userId = interaction.user.id;

    /* --- BOTPOST BUTTONS --- */
    if (interaction.customId === 'cancel_botpost') {
      pendingBotposts.delete(userId);
      return interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
    }
    if (interaction.customId === 'confirm_botpost') {
      const data = pendingBotposts.get(userId);
      if (!data) return;
      data.channel.send({ embeds: [data.embed] });
      if (data.ping) data.channel.send({ content: `<@&${data.ping.id}>` });
      pendingBotposts.delete(userId);
      return interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
    }

    /* --- POLL BUTTONS --- */
    if (interaction.customId === 'cancel_poll') {
      pendingPolls.delete(userId);
      return interaction.update({ content: '❌ Poll canceled.', embeds: [], components: [] });
    }
    if (interaction.customId === 'confirm_poll') {
      const poll = pendingPolls.get(userId);
      if (!poll) return;
      const msg = await poll.channel.send({ embeds: [poll.embed] });
      for (const emj of poll.emojis) await msg.react(emj);
      pendingPolls.delete(userId);
      return interaction.update({ content: '✅ Poll sent.', embeds: [], components: [] });
    }
  }
});

/* ====================== WELCOME MESSAGE ====================== */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (!oldMember.roles.cache.has(VERIFIED_ROLE_ID) && newMember.roles.cache.has(VERIFIED_ROLE_ID)) {
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
      image: { url: WELCOME_BANNER },
      thumbnail: { url: newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }) },
      footer: { text: newMember.guild.name, icon_url: newMember.guild.iconURL({ dynamic: true }) },
      timestamp: new Date()
    };

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

/* ====================== ANONYMOUS MESSAGING ====================== */

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channelId)) return;

  const anonId = makeId();
  anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel });

  await message.delete();
  await message.channel.send({ content: message.content });
});

/* ====================== READY ====================== */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000);
});

/* ====================== LOGIN ====================== */

client.login(TOKEN);
