const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
  REST,
  Routes
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

/* ======================
   LAST VIDEO TRACKING
   (date-based for VODs)
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
    .setDescription('Send a test YouTube notification')
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

  if (interaction.commandName === 'ping') {
    return interaction.reply('🏓 Pong!');
  }

  if (interaction.commandName === 'testyoutube') {
    const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
    if (!channel) return;

    const embed = {
      color: 0xFF0000,
      title: "The Holy Who wk4 || 11.23.25 || Pastor Terry Jimmerson",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      description: "📢 New video uploaded! Go check it out!",
      image: {
        url: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
      },
      timestamp: new Date()
    };

    await channel.send({ embeds: [embed] });
    await channel.send({ content: `<@&${MEDIA_ROLE_ID}>` });

    return interaction.reply({ content: '✅ Test message sent', ephemeral: true });
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
   YOUTUBE CHECK (VOD SAFE)
====================== */

async function checkYouTube() {
  try {
    const feed = await parser.parseURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
    );

    const latest = feed.items[0];
    if (!latest || !latest.pubDate) return;

    const published = new Date(latest.pubDate).getTime();

    // Only trigger when a NEW publish date appears
    if (!lastVideoDate || published > lastVideoDate) {
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
  setInterval(checkYouTube, 5 * 60 * 1000);
});

client.login(token);
