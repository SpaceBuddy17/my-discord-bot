const { 
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Events,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

const fetch = require('node-fetch');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

// YouTube config
const YT_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YT_POST_CHANNEL = '1135971664132313240';
const YT_ROLE_ID = '1467324932965929033';

// Role-restricted commands
const COMMAND_ROLES = ['1318997119566090270','1136004041395159140'];

// In-memory store to prevent duplicates
let postedVideoIds = new Set();

// --- Slash commands ---
const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a custom bot message')
    .addStringOption(option =>
      option.setName('title')
            .setDescription('Title for the embed')
            .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
            .setDescription('Description for the embed')
            .setRequired(true))
    .addRoleOption(option =>
      option.setName('pingrole')
            .setDescription('Optional role to ping')
            .setRequired(false)),
  new SlashCommandBuilder()
    .setName('forceyoutube')
    .setDescription('Force post the latest YouTube video')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

// --- Welcome message ---
client.on(Events.GuildMemberAdd, async member => {
  try {
    const verifiedRole = member.guild.roles.cache.get('1137122628801405018');
    if (!verifiedRole) return;
    if (!member.roles.cache.has(verifiedRole.id)) return; // Only send if verified

    const welcomeEmbed = new EmbedBuilder()
      .setTitle('WELCOME TO DESTINY CHURCH!')
      .setDescription('We’re so glad you’re here.')
      .setColor(0xFFFFFF)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    const channel = member.guild.channels.cache.get('1135971664132313243');
    if (!channel) return;

    await channel.send({ embeds: [welcomeEmbed] });
    await channel.send({ content: `<@${member.id}>` }); // Ping after embed
  } catch(err) {
    console.error('Welcome message error:', err);
  }
});

// --- Interaction handler ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!COMMAND_ROLES.some(r => interaction.member.roles.cache.has(r))) {
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  const { commandName } = interaction;

  if (commandName === 'botpost') {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const pingRole = interaction.options.getRole('pingrole');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xFFFFFF);

    const channel = interaction.channel;
    await channel.send({ embeds: [embed] });
    if (pingRole) await channel.send({ content: `<@&${pingRole.id}>` });

    // Completely silent: no ephemeral reply
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
  }

  if (commandName === 'forceyoutube') {
    try {
      const video = await getLatestYouTubeVideo();
      if (!video) return interaction.reply({ content: 'No recent video found.', ephemeral: true });

      if (!postedVideoIds.has(video.id)) {
        await postYouTubeVideo(interaction.guild, video);
        postedVideoIds.add(video.id);
      }

      await interaction.reply({ content: 'YouTube video posted.', ephemeral: true });
    } catch(err) {
      console.error('Force YouTube error:', err);
      await interaction.reply({ content: 'Error posting YouTube video.', ephemeral: true });
    }
  }
});

// --- YouTube polling ---
async function checkYouTubeUpdates() {
  try {
    const video = await getLatestYouTubeVideo();
    if (!video) return;
    if (postedVideoIds.has(video.id)) return; // Already posted
    postedVideoIds.add(video.id);

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    await postYouTubeVideo(guild, video);

  } catch(err) {
    console.error('YouTube polling error:', err);
  }
}

// Poll every 5 minutes
setInterval(checkYouTubeUpdates, 5 * 60 * 1000);

// --- Helper: fetch latest video ---
async function getLatestYouTubeVideo() {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${youtubeApiKey}&channelId=${YT_CHANNEL_ID}&part=snippet&order=date&maxResults=1&type=video`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;

  const video = data.items[0];
  const liveStatus = video.snippet.liveBroadcastContent; // live, upcoming, none

  // Only post if live now or regular upload
  if (liveStatus === 'upcoming') return null;

  return {
    id: video.id.videoId,
    title: video.snippet.title,
    thumbnail: video.snippet.thumbnails.high.url,
    url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
    isLive: liveStatus === 'live'
  };
}

// --- Helper: post YouTube video ---
async function postYouTubeVideo(guild, video) {
  const channel = guild.channels.cache.get(YT_POST_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(video.title)
    .setURL(video.url)
    .setDescription(video.isLive ? '🔴 LIVE NOW! Go watch!' : '📢 New video uploaded! Go check it out!')
    .setImage(video.thumbnail)
    .setColor(0xFF0000); // YouTube red

  await channel.send({ embeds: [embed] });
  await channel.send({ content: `<@&${YT_ROLE_ID}>` }); // Ping role after embed
}

// --- Ready ---
client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  checkYouTubeUpdates(); // Check immediately on startup
});

client.login(token);
