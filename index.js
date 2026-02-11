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
const CLIENT_ID = process.env.CLIENT_ID; // ADD THIS IN RAILWAY

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

/* ================= WELCOME ================= */

const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

/* ================= YOUTUBE ================= */

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
    console.error('Failed reading lastVideoDate.json', err);
  }
}

function saveLastVideoDate(date) {
  lastVideoDate = date;
  fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ lastVideoDate: date }));
}

/* ================= BOTPOST / ANON ================= */

const pendingBotposts = new Map();
const anonMessages = new Map();

/* ================= SLASH COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message as an embed')
    .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description'))
    .addStringOption(o => o.setName('link').setDescription('Optional link'))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role ping')),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup anonymous sender')
    .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  new SlashCommandBuilder()
    .setName('testyoutube')
    .setDescription('Send a test YouTube notification')
].map(cmd => cmd.toJSON());

/* ================= READY ================= */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  /* REGISTER COMMANDS SAFELY */
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('Command registration failed:', err);
  }

  /* Initial YouTube Check */
  await checkYouTube();
  setInterval(checkYouTube, 5 * 60 * 1000);
});

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

    /* BOTPOST */
    if (interaction.commandName === 'botpost') {
      let description = o.getString('description');
      if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
      if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(o.getString('title'))
        .setDescription(description)
        .setTimestamp();

      pendingBotposts.set(interaction.user.id, {
        embed,
        channel: interaction.channel,
        ping: o.getRole('ping')
      });

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

    /* BUTTON HANDLER */
    if (interaction.isButton()) {
      const data = pendingBotposts.get(interaction.user.id);
      if (!data) return;

      if (interaction.customId === 'cancel') {
        pendingBotposts.delete(interaction.user.id);
        return interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
      }

      if (interaction.customId === 'confirm') {
        await data.channel.send({ embeds: [data.embed] });
        if (data.ping) await data.channel.send(`<@&${data.ping.id}>`);
        pendingBotposts.delete(interaction.user.id);
        return interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
      }
    }

    /* PING */
    if (interaction.commandName === 'ping')
      return interaction.reply('🏓 Pong!');

    /* TEST YOUTUBE */
    if (interaction.commandName === 'testyoutube') {
      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle("Test Upload")
        .setURL("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        .setDescription("📢 New video uploaded! Go check it out!")
        .setImage("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg")
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });

      return interaction.reply({ content: '✅ Test sent', ephemeral: true });
    }

    /* ANON LOOKUP */
    if (interaction.commandName === 'anonlookup') {
      const msgId = o.getString('message_id');
      const record = Array.from(anonMessages.entries())
        .find(([id, msg]) => msg.messageId === msgId);

      if (!record)
        return interaction.reply({ content: '❌ Could not find sender.', ephemeral: true });

      return interaction.reply({
        content: `🕵️ Sender: <@${record[1].userId}> • ID: ${record[0]}`,
        ephemeral: true
      });
    }

  } catch (err) {
    console.error('Interaction error:', err);
  }
});

/* ================= ANON SYSTEM ================= */

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channel.id)) return;

  const anonId = 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  anonMessages.set(anonId, {
    userId: message.author.id,
    messageId: message.id
  });

  await message.delete().catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(0x7289da)
    .setTitle('✉️ Anonymous Message')
    .setDescription(message.content)
    .setFooter({ text: `ID: ${anonId}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
});

/* ================= WELCOME FIXED ================= */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    const hadRole = oldMember.roles.cache.has(VERIFIED_ROLE_ID);
    const hasRole = newMember.roles.cache.has(VERIFIED_ROLE_ID);

    if (!hadRole && hasRole) {
      const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (!channel) return;

      const endings = [
        "We’re glad you’re here!",
        "Feel free to jump in and say hello!",
        "Welcome — we’re happy you joined us!"
      ];

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(`Welcome to ${newMember.guild.name}!`)
        .setDescription(endings[Math.floor(Math.random() * endings.length)])
        .setThumbnail(newMember.user.displayAvatarURL({ size: 1024 }))
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await channel.send(`<@${newMember.id}>`);

      console.log(`✅ Welcome sent for ${newMember.user.tag}`);
    }
  } catch (err) {
    console.error("Welcome error:", err);
  }
});

/* ================= YOUTUBE FIXED ================= */

async function checkYouTube() {
  try {
    const feed = await parser.parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
    );

    const latest = feed.items[0];
    if (!latest) return;

    const published = new Date(latest.pubDate).getTime();
    if (!lastVideoDate || published > lastVideoDate) {
      saveLastVideoDate(published);

      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const videoId = latest.id.split(':').pop();
      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(latest.title)
        .setURL(latest.link)
        .setDescription("📢 New video uploaded! Go check it out!")
        .setImage(thumbnail)
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      await channel.send(`<@&${MEDIA_ROLE_ID}>`);

      console.log("📺 New YouTube video posted");
    }
  } catch (err) {
    console.error('YouTube check failed:', err);
  }
}

client.login(TOKEN);
