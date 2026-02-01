const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Events,
  REST,
  Routes
} = require('discord.js');
const Parser = require('rss-parser'); // RSS parser for YouTube feeds

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// Environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Channels & roles
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';
const YOUTUBE_DISCORD_CHANNEL_ID = '1135971664132313240'; // Channel for YouTube updates
const MEDIA_ROLE_ID = 'YOUR_MEDIA_ROLE_ID_HERE'; // Replace with your @media role ID

// YouTube channel
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA'; // Destiny Church YouTube
const parser = new Parser();
let lastVideoId = null; // Tracks last posted video

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('testyoutube')
    .setDescription('Send a test YouTube notification message')
].map(c => c.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Failed to register commands', err);
  }
})();

// Slash command handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong!');
  }

  if (interaction.commandName === 'testyoutube') {
    const channel = client.channels.cache.get(YOUTUBE_DISCORD_CHANNEL_ID);
    if (!channel) return interaction.reply({ content: 'Channel not found.', ephemeral: true });

    const rolePing = `<@&${MEDIA_ROLE_ID}>`;

    // Simulated video
    const latestVideo = {
      title: "Test Video Title",
      link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    };

    // Send ping above embed
    await channel.send({
      content: `${rolePing}, we just posted a new video! Check it out: ${latestVideo.link}`
    });

    // Send embed
    const youtubeEmbed = {
      color: 0xFF0000, // YouTube red
      title: latestVideo.title,
      url: latestVideo.link,
      description: "📢 New video uploaded!",
      thumbnail: { url: latestVideo.thumbnail },
      footer: {
        text: "Destiny Church",
        icon_url: channel.guild.iconURL({ dynamic: true })
      },
      timestamp: new Date()
    };

    await channel.send({ embeds: [youtubeEmbed] });

    await interaction.reply({ content: '✅ Test YouTube message sent!', ephemeral: true });
  }
});

// 🔔 Welcome message after Verified role is assigned
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  if (
    !oldMember.roles.cache.has(VERIFIED_ROLE_ID) &&
    newMember.roles.cache.has(VERIFIED_ROLE_ID)
  ) {
    const welcomeEndings = [
      "We’re thrilled to have you in our community!",
      "Feel free to jump in and say hi to everyone!",
      "Glad you joined us — we hope you enjoy your time here!"
    ];
    const randomEnding = welcomeEndings[Math.floor(Math.random() * welcomeEndings.length)];

    const welcomeEmbed = {
      color: 0xFFFFFF, // White
      title: `Welcome to ${newMember.guild.name}, ${newMember.displayName}!`,
      description: randomEnding,
      thumbnail: { url: newMember.user.displayAvatarURL({ dynamic: true, size: 1024 }) },
      footer: {
        text: newMember.guild.name,
        icon_url: newMember.guild.iconURL({ dynamic: true })
      },
      timestamp: new Date()
    };

    // Embed first, ping underneath
    channel.send({
      content: `<@${newMember.id}>`,
      embeds: [welcomeEmbed]
    });
  }
});

// 📢 YouTube Upload Notifications
async function checkYouTube() {
  try {
    const feed = await parser.parseURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
    const latest = feed.items[0];
    if (!latest) return;

    if (latest.id !== lastVideoId) {
      lastVideoId = latest.id;

      const channel = client.channels.cache.get(YOUTUBE_DISCORD_CHANNEL_ID);
      if (!channel) return;

      // Notification message above the embed
      const rolePing = `<@&${MEDIA_ROLE_ID}>`; 
      await channel.send({
        content: `${rolePing}, we just posted a new video! Check it out: ${latest.link}`
      });

      // Embed with YouTube red color, thumbnail, clickable title
      const youtubeEmbed = {
        color: 0xFF0000, // YouTube red
        title: latest.title,
        url: latest.link, // Makes title clickable
        description: "📢 New video uploaded!",
        thumbnail: { url: latest['media:group']['media:thumbnail']['$'].url },
        footer: {
          text: "Destiny Church",
          icon_url: client.guilds.cache.get(guildId)?.iconURL({ dynamic: true }) || undefined
        },
        timestamp: new Date()
      };

      await channel.send({ embeds: [youtubeEmbed] });
    }
  } catch (err) {
    console.error('Error checking YouTube feed:', err);
  }
}

// Check YouTube every 5 minutes
setInterval(checkYouTube, 5 * 60 * 1000);

// Ready event
client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);
