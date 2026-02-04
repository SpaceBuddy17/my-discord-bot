const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  REST, 
  Routes 
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

// Role IDs
const WELCOME_CHANNEL_ID = "1135971664132313243";
const MEDIA_ROLE_ID = "1467324932965929033";
const BOTPOST_ALLOWED_ROLES = ["1318997119566090270", "1136004041395159140"];

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a custom embed message via the bot')
    .addStringOption(option => 
      option.setName('title')
            .setDescription('Title of the embed')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('description')
            .setDescription('Primary description of the embed (multi-line allowed)')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('description2')
            .setDescription('Secondary description of the embed (optional, multi-line allowed)')
            .setRequired(false))
    .addStringOption(option => 
      option.setName('link')
            .setDescription('Optional URL link to include in embed')
            .setRequired(false))
    .addChannelOption(option =>
      option.setName('channel')
            .setDescription('Channel to send the embed')
            .setRequired(true))
    .addRoleOption(option =>
      option.setName('ping')
            .setDescription('Optional role to ping')
            .setRequired(false))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

// Welcome message
client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;

  // Only send if the member has the verified role
  const VERIFIED_ROLE_ID = "1137122628801405018";
  if (!member.roles.cache.has(VERIFIED_ROLE_ID)) return;

  const welcomeEmbed = new EmbedBuilder()
    .setTitle('Welcome to Destiny Church!')
    .setDescription('We’re glad to have you here!')
    .setColor(0xFFFFFF)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

  await channel.send({ embeds: [welcomeEmbed] });

  // Ping the user separately
  await channel.send(`${member}`);
});

// BotPost command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'botpost') return;

  // Restrict to allowed roles
  if (!interaction.member.roles.cache.some(role => BOTPOST_ALLOWED_ROLES.includes(role.id))) {
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true }); // ACK the command immediately

  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description'); // primary
  const description2 = interaction.options.getString('description2'); // secondary
  const link = interaction.options.getString('link');
  const channel = interaction.options.getChannel('channel');
  const pingRole = interaction.options.getRole('ping');

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xFFFFFF)
    .setDescription(description); // primary description

  if (description2) {
    embed.addFields({ name: "\u200b", value: description2 }); // secondary description
  }

  if (link) {
    embed.addFields({ name: "\u200b", value: `[Link](${link})` }); // optional link
  }

  await channel.send({ embeds: [embed] });

  if (pingRole) {
    await channel.send(`${pingRole}`);
  }

  await interaction.editReply({ content: '✅ Embed sent!' });
});

// YouTube notifications (simplified, using RSS feed)
const YOUTUBE_CHANNEL_ID = "UC4qOOlisAkrU5T1aJmwqDbA";
const YOUTUBE_POST_CHANNEL_ID = "1135971664132313240";
const YOUTUBE_ROLE_ID = MEDIA_ROLE_ID;
let latestVideoId = null;

async function checkYoutube() {
  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
    const res = await fetch(feedUrl);
    const text = await res.text();

    // Simple regex to get the latest video ID from RSS
    const match = text.match(/<yt:videoId>(.+)<\/yt:videoId>/);
    if (!match) return;

    const videoId = match[1];
    if (videoId === latestVideoId) return; // Already posted
    latestVideoId = videoId;

    const videoTitleMatch = text.match(/<title>(.+)<\/title>/);
    const videoTitle = videoTitleMatch ? videoTitleMatch[1] : 'New Video';

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(videoTitle)
      .setDescription("📢 New video uploaded! Go check it out!")
      .setColor(0xFF0000) // YouTube red
      .setImage(thumbnailUrl);

    await channel.send({ embeds: [embed] });

    // Ping @Media separately
    if (YOUTUBE_ROLE_ID) {
      const role = channel.guild.roles.cache.get(YOUTUBE_ROLE_ID);
      if (role) await channel.send(`${role}`);
    }

  } catch (err) {
    console.error("Error checking YouTube:", err);
  }
}

// Poll YouTube every 5 minutes
setInterval(checkYoutube, 5 * 60 * 1000);

// Login
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);
