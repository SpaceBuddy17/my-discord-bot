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
const CLIENT_ID = process.env.CLIENT_ID; // Application ID from Discord

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

// Guild ID for commands registration
const GUILD_ID = '1135971663050199142';

/* ================= YouTube / Welcome CONFIG ================= */

// Welcome system
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

// Wave button stickers and tracker
const WAVE_STICKERS = [
  '1470247753614364813',
  '751606379340365864',
  '749054660769218631',
  '781291131828699156',
  '783787234091466793'
];
const waveTracker = new Map(); // messageId -> Set(userIds)

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

/* ================= BOTPOST COMMAND ================= */

const pendingBotposts = new Map();
const anonMessages = new Map(); // id -> { content, userId, channel, messageId }

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

    // Admin check for bot commands
    if (interaction.isChatInputCommand() && !['ping', 'testyoutube'].includes(interaction.commandName) && !interaction.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id))) {
      return await interaction.reply({ content: '❌ No permission.', ephemeral: true });
    }

/* -------------------- SLASH COMMANDS -------------------- */

const pollCommand = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create a poll with emojis and multiple answers")
  .addStringOption(o =>
    o.setName("question")
      .setDescription("Poll question")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("options")
      .setDescription("Options separated by | (max 5)")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("emojis")
      .setDescription("Emojis separated by | (must match options)")
      .setRequired(true)
  );

// options + emojis (1–5)
for (let i = 1; i <= 5; i++) {
  pollCommand
    .addStringOption(o =>
      o.setName(`option${i}`)
        .setDescription(`Option ${i}`)
        .setRequired(i <= 2) // require at least 2 options
    )
    .addStringOption(o =>
      o.setName(`emoji${i}`)
        .setDescription(`Emoji for option ${i}`)
        .setRequired(i <= 2)
    );
}

const reregisterCommand = new SlashCommandBuilder()
  .setName("reregister")
  .setDescription("Re-register slash commands (admin only)");
  .setDescription("Re-register slash commands");

const commands = [
  pollCommand.toJSON(),
@@ -74,17 +79,29 @@
/* -------------------- INTERACTIONS -------------------- */

client.on(Events.InteractionCreate, async interaction => {

  /* ---------- /poll ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === "poll") {
    const question = interaction.options.getString("question");
    const options = interaction.options.getString("options").split("|").map(o => o.trim());
    const emojis = interaction.options.getString("emojis").split("|").map(e => e.trim());

    if (options.length > 5)
      return interaction.reply({ content: "❌ Max 5 options.", ephemeral: true });
    const options = [];
    const emojis = [];

    if (options.length !== emojis.length)
      return interaction.reply({ content: "❌ Options and emojis must match.", ephemeral: true });
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      const emo = interaction.options.getString(`emoji${i}`);

      if (opt && emo) {
        options.push(opt);
        emojis.push(emo);
      }
    }

    if (options.length < 2)
      return interaction.reply({
        content: "❌ You need at least 2 options.",
        ephemeral: true
      });

    const description = options
      .map((opt, i) => `## ${emojis[i]} ${opt}`)
@@ -123,11 +140,16 @@
  /* ---------- BUTTONS ---------- */
  if (interaction.isButton()) {
    const data = interaction.client.pollCache?.get(interaction.user.id);
    if (!data) return interaction.reply({ content: "❌ Poll data expired.", ephemeral: true });
    if (!data)
      return interaction.reply({ content: "❌ Poll expired.", ephemeral: true });

    if (interaction.customId === "poll_cancel") {
      interaction.client.pollCache.delete(interaction.user.id);
      return interaction.update({ content: "❌ Poll cancelled.", embeds: [], components: [] });
      return interaction.update({
        content: "❌ Poll cancelled.",
        embeds: [],
        components: []
      });
    }

    if (interaction.customId === "poll_confirm") {
@@ -138,14 +160,21 @@
      }

      interaction.client.pollCache.delete(interaction.user.id);
      await interaction.update({ content: "✅ Poll posted!", embeds: [], components: [] });
      await interaction.update({
        content: "✅ Poll posted!",
        embeds: [],
        components: []
      });
    }
  }

  /* ---------- /reregister ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === "reregister") {
    await registerSlashCommands();
    await interaction.reply({ content: "✅ Commands re-registered.", ephemeral: true });
    await interaction.reply({
      content: "✅ Commands re-registered.",
      ephemeral: true
    });
  }
});

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

      return await interaction.reply({
        content: '📋 Preview',
        embeds: [embed],
        components: [buttons],
        ephemeral: true
      });
    }

    /* ---------- CONFIRM / CANCEL ---------- */
    if (interaction.isButton()) {

      // -------- Wave Button Logic --------
      if (interaction.customId === 'wave_button') {

        const messageId = interaction.message.id;
        const userId = interaction.user.id;

        if (!waveTracker.has(messageId)) {
          waveTracker.set(messageId, new Set());
        }

        const clickedUsers = waveTracker.get(messageId);

        if (clickedUsers.has(userId)) {
          return interaction.reply({
            content: "You already waved! 👋",
            ephemeral: true
          });
        }

        clickedUsers.add(userId);

        const randomSticker =
          WAVE_STICKERS[Math.floor(Math.random() * WAVE_STICKERS.length)];

        await interaction.message.reply({
          content: `👋 <@${userId}> says hello!`,
          stickers: [randomSticker]
        });

        await interaction.deferUpdate();
        return;
      }

      // -------- Botpost Confirm/Cancel --------
      const data = pendingBotposts.get(interaction.user.id);
      if (!data) return;

      if (interaction.customId === 'cancel') {
        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
      }

      if (interaction.customId === 'confirm') {
        await data.channel.send({ embeds: [data.embed] });
        if (data.ping) {
          await data.channel.send(`<@&${data.ping.id}>`);
        }
        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
      }
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

    /* ---------- ANONLOOKUP ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
      const msgId = o.getString('message_id');
      const record = Array.from(anonMessages.entries()).find(([id, msg]) => msg.messageId === msgId);
      if (!record) return await interaction.reply({ content: '❌ Could not find sender.', ephemeral: true });
      const [anonId, msg] = record;
      return await interaction.reply({ content: `🕵️ Sender: <@${msg.userId}> • ID: ${anonId}`, ephemeral: true });
    }

  } catch (err) {
    console.error('Interaction error:', err);
    if (!interaction.replied) await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
  }
});

/* ---------- ANONYMOUS MESSAGE HANDLER ---------- */
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

/* ================= WELCOME (WAVE SYSTEM) ================= */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const hadRole = oldMember.roles.cache.has(VERIFIED_ROLE_ID);
    const hasRole = newMember.roles.cache.has(VERIFIED_ROLE_ID);

    if (!hadRole && hasRole) {
      const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(`Welcome to ${newMember.guild.name}!`)
        .setDescription("We're glad you're here!")
        .setThumbnail(newMember.user.displayAvatarURL({ size: 1024 }))
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('wave_button')
          .setLabel('Wave to say hi! 👋')
          .setStyle(ButtonStyle.Primary)
      );

      const welcomeMessage = await channel.send({
        content: `<@${newMember.id}>`,
        embeds: [embed],
        components: [row]
      });

      waveTracker.set(welcomeMessage.id, new Set());

      console.log(`✅ Welcome sent for ${newMember.user.tag}`);
    }

  } catch (err) {
    console.error("Welcome error:", err);
  }
});

/* ---------- YOUTUBE CHECK (VOD SAFE) ---------- */
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

      const videoId = latest.id.split(':').pop();
      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      const embed = {
        color: 0xFF0000,
        title: latest.title,
        url: latest.link,
        description: "📢 New video uploaded! Go check it out!",
        image: { url: thumbnail },
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

client.login(TOKEN);
