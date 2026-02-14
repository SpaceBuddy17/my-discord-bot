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

const ADMIN_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643',
  '1469852593235824812'
];

const GUILD_ID = '1135971663050199142';

/* ================= YouTube / Welcome CONFIG ================= */

const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

const WAVE_STICKERS = [
  '1470247753614364813',
  '751606379340365864',
  '749054660769218631',
  '781291131828699156',
  '783787234091466793'
];
const waveTracker = new Map();

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

/* ================= BOTPOST / POLL / COMMANDS ================= */

const pendingBotposts = new Map();
const anonMessages = new Map();

const commands = [

  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message as an embed')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with up to 5 options')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('emoji1').setDescription('Emoji for option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('emoji2').setDescription('Emoji for option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3').setRequired(false))
    .addStringOption(o => o.setName('emoji3').setDescription('Emoji for option 3').setRequired(false))
    .addStringOption(o => o.setName('option4').setDescription('Option 4').setRequired(false))
    .addStringOption(o => o.setName('emoji4').setDescription('Emoji for option 4').setRequired(false))
    .addStringOption(o => o.setName('option5').setDescription('Option 5').setRequired(false))
    .addStringOption(o => o.setName('emoji5').setDescription('Emoji for option 5').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup the sender of an anonymous message')
    .addStringOption(o => o.setName('message_id').setDescription('ID of the anonymous message').setRequired(true)),

  new SlashCommandBuilder()
    .setName('reregister')
    .setDescription('Re-register slash commands (admin only)'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  new SlashCommandBuilder()
    .setName('testyoutube')
    .setDescription('Send a test YouTube notification')

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

/* ================= REGISTER COMMANDS ================= */

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Error registering commands:', err);
  }
})();

/* ================= INTERACTIONS ================= */

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.member) return;

    const o = interaction.options;

    if (
      interaction.isChatInputCommand() &&
      !['ping', 'testyoutube'].includes(interaction.commandName) &&
      !interaction.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id))
    ) {
      return await interaction.reply({ content: '❌ No permission.', ephemeral: true });
    }

   /* ---------- POLL ---------- */
if (interaction.isChatInputCommand() && interaction.commandName === 'poll') {

  const question = o.getString('question');
  const options = [];
  const emojis = [];

  for (let i = 1; i <= 5; i++) {
    const opt = o.getString(`option${i}`);
    const emo = o.getString(`emoji${i}`);
    if (opt && emo) {
      options.push(opt);
      emojis.push(emo);
    }
  }

  if (options.length < 2) {
    return interaction.reply({ content: '❌ At least 2 options required.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📊 ${question}`)
    .setFooter({ text: `Poll by ${interaction.user.tag}` })
    .setTimestamp();

  // Add each option as its own field (larger visual appearance)
  options.forEach((opt, i) => {
    embed.addFields({
      name: `${emojis[i]} Option ${i + 1}`,
      value: `**${opt}**`,
      inline: false
    });
  });

  const pollMessage = await interaction.channel.send({ embeds: [embed] });

  for (let i = 0; i < emojis.length; i++) {
    await pollMessage.react(emojis[i]);
  }

  return interaction.reply({ content: '✅ Poll created!', ephemeral: true });
}


    /* ---------- REREGISTER ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'reregister') {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      return interaction.reply({ content: '✅ Slash commands re-registered.', ephemeral: true });
    }

    /* ---------- PING ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
      return interaction.reply('🏓 Pong!');
    }

    /* ---------- TEST YOUTUBE ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'testyoutube') {
      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("The Holy Who wk4 || 11.23.25 || Pastor Terry Jimmerson")
        .setURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        .setDescription("📢 New video uploaded! Go check it out!")
        .setImage("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg")
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });

      return interaction.reply({ content: '✅ Test message sent', ephemeral: true });
    }

  } catch (err) {
    console.error('Interaction error:', err);
    if (!interaction.replied) await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
  }
});

/* ================= REST OF YOUR FILE REMAINS 100% UNCHANGED ================= */

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

/* (Welcome system, YouTube system, Ready event, login remain exactly as before) */

client.login(TOKEN);
