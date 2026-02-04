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

// Role IDs
const WELCOME_CHANNEL_ID = "1135971664132313243";
const MEDIA_ROLE_ID = "1467324932965929033";
const BOTPOST_ALLOWED_ROLES = ["1318997119566090270", "1136004041395159140"];
const VERIFIED_ROLE_ID = "1137122628801405018";

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a custom embed message via the bot')
    // REQUIRED options first
    .addStringOption(option => 
      option.setName('title')
            .setDescription('Title of the embed')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('description')
            .setDescription('Primary description of the embed (multi-line allowed)')
            .setRequired(true))
    // OPTIONAL options next
    .addStringOption(option => 
      option.setName('description2')
            .setDescription('Secondary description of the embed (optional, multi-line allowed)')
            .setRequired(false))
    .addStringOption(option => 
      option.setName('link')
            .setDescription('Optional URL link to include in embed')
            .setRequired(false))
    .addRoleOption(option =>
      option.setName('ping')
            .setDescription('Optional role to ping')
            .setRequired(false))
].map(c => c.toJSON());

// Register slash commands
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

  if (!member.roles.cache.has(VERIFIED_ROLE_ID)) return;

  const welcomeEmbed = new EmbedBuilder()
    .setTitle('Welcome to Destiny Church!')
    .setDescription('We’re glad to have you here!')
    .setColor(0xFFFFFF)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

  await channel.send({ embeds: [welcomeEmbed] });
  await channel.send(`${member}`);
});

// BotPost command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'botpost') return;

  if (!interaction.member.roles.cache.some(role => BOTPOST_ALLOWED_ROLES.includes(role.id))) {
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const description2 = interaction.options.getString('description2');
    const link = interaction.options.getString('link');
    const pingRole = interaction.options.getRole('ping');

    const embedChannel = interaction.channel; // send in the same channel

    // Use raw strings to preserve line breaks exactly
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(0xFFFFFF)
      .setDescription(description);

    if (description2) embed.addFields({ name: "\u200b", value: description2 });
    if (link) embed.addFields({ name: "\u200b", value: `[Link](${link})` });

    await embedChannel.send({ embeds: [embed] });
    if (pingRole) await embedChannel.send(`${pingRole}`);

    await interaction.editReply({ content: '✅ Embed sent!' });

  } catch (err) {
    console.error('Error in /botpost:', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Failed to send embed. Check console for errors.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Failed to send embed. Check console for errors.', ephemeral: true });
    }
  }
});

// YouTube notifications
const YOUTUBE_CHANNEL_ID = "UC4qOOlisAkrU5T1aJmwqDbA";
const YOUTUBE_POST_CHANNEL_ID = "1135971664132313240";
let latestVideoId = null;

async function checkYoutube() {
  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
    const res = await fetch(feedUrl);
    const text = await res.text();

    const match = text.match(/<yt:videoId>(.+)<\/yt:videoId>/);
    if (!match) return;

    const videoId = match[1];
    if (videoId === latestVideoId) return;
    latestVideoId = videoId;

    const videoTitleMatch = text.match(/<title>(.+)<\/title>/);
    const videoTitle = videoTitleMatch ? videoTitleMatch[1] : 'New Video';

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(videoTitle)
      .setDescription("📢 New video uploaded! Go check it out!")
      .setColor(0xFF0000)
      .setImage(thumbnailUrl);

    await channel.send({ embeds: [embed] });

    if (MEDIA_ROLE_ID) {
      const role = channel.guild.roles.cache.get(MEDIA_ROLE_ID);
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

