const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
  REST,
  Routes,
  PermissionsBitField
} = require('discord.js');
const Parser = require('rss-parser');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* ======================
   ENV / CONFIG
====================== */

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Welcome system
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

// YouTube system
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';

const parser = new Parser();

// BotPost allowed roles (2 roles)
const BOTPOST_ROLES = ['1318997119566090270', '1136004041395159140'];

/* ======================
   LAST VIDEO TRACKING
====================== */

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
  fs.writeFileSync(
    LAST_VIDEO_FILE,
    JSON.stringify({ lastVideoDate: date })
  );
}

/* ======================
   SLASH COMMANDS
====================== */

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  new SlashCommandBuilder()
    .setName('testyoutube')
    .setDescription('Send a test YouTube notification'),

  new SlashCommandBuilder()
    .setName('forceyoutube')
    .setDescription('Force post the most recent YouTube upload'),

  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a message via the bot')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Message to send through the bot')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel to post in')
        .setRequired(false))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

/* ======================
   SLASH HANDLER
====================== */

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // Admin guard for forceyoutube
  if (
    interaction.commandName === 'forceyoutube' &&
    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return interaction.reply({
      content: '❌ Admins only.',
      ephemeral: true
    });
  }

  // botpost role check (2 roles)
  if (
    interaction.commandName === 'botpost' &&
    !BOTPOST_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))
  ) {
    return interaction.reply({
      content: '❌ You do not have permission to use this command.',
      ephemeral: true
    });
  }

  try {
    switch (interaction.commandName) {
      case 'ping':
        return interaction.reply('🏓 Pong!');

      case 'testyoutube': {
        const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
        if (!channel) return;

        const embed = {
          color: 0xFF0000,
          title: "The Holy Who wk4 [11.23.25] Pastor Terry Jimmerson",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          description: "📢 New video uploaded! Go check it out!",
          image: {
            url: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
          },
          timestamp: new Date()
        };

        await channel.send({ embeds: [embed] });
        await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });

        return interaction.reply({
          content: '✅ Test YouTube message sent.',
          ephemeral: true
        });
      }

      case 'forceyoutube':
        await interaction.deferReply({ ephemeral: true });
        await checkYouTube(true);
        return interaction.editReply('✅ Forced YouTube check complete.');

      case 'botpost': {
        const msg = interaction.options.getString('message');
        const channelOption = interaction.options.getChannel('channel');
        const targetChannel = channelOption || interaction.channel;

        await targetChannel.send(msg);
        // Removed the confirmation reply to keep it silent
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: '❌ Command failed.',
      ephemeral: true
    });
  }
});

/* ======================
   WELCOME MESSAGE
====================== */

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  if (
    !oldMember.roles.cache.has(VERIFIED_ROLE_ID) &&
    newMember.roles.cache.has(VERIFIED_ROLE_ID)
  ) {
    const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const endings = [
      "We’re glad you’re here!",
      "Feel free to jump in and say hello!",
      "Welcome — we’re happy you joined us!"
    ];

    const embed = {
      color: 0xFFFFFF,
      title: `Welcome to ${newMember.guild.name}!`,
      description: endings[Math.floor(Math.random() * endings.length)],
      thumbnail: {
        url: newMember.user.displayAvatarURL({ size: 1024, dynamic: true })
      },
      timestamp: new Date()
    };

    await channel.send({ embeds: [embed] });
    await channel.send({ content: `<@${newMember.id}>` });
  }
});

/* ======================
   YOUTUBE CHECK
====================== */

async function checkYouTube(force = false) {
  try {
    const feed = await parser.parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
    );

    const latest = feed.items[0];
    if (!latest || !latest.pubDate) return;

    const published = new Date(latest.pubDate).getTime();

    if (force || !lastVideoDate || published > lastVideoDate) {
      saveLastVideoDate(published);

      const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
      if (!channel) return;

      const embed = {
        color: 0xFF0000,
        title: latest.title,
        url: latest.link,
        description: "📢 New video uploaded! Go check it out!",
        image: {
          url: latest['media:group']['media:thumbnail']['$'].url
        },
        timestamp: new Date()
      };

      await channel.send({ embeds: [embed] });
      await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });
    }
  } catch (err) {
    console.error('YouTube check failed:', err);
  }
}

/* ======================
   READY
====================== */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // Immediate check on startup
  await checkYouTube();

  // Repeat every 5 minutes
  setInterval(() => checkYouTube(), 5 * 60 * 1000);
});

client.login(token);
