const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  REST, 
  Routes, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Role IDs
const WELCOME_CHANNEL_ID = "1135971664132313243";
const MEDIA_ROLE_ID = "1467324932965929033";
const BOTPOST_ALLOWED_ROLES = ["1318997119566090270", "1136004041395159140"];
const VERIFIED_ROLE_ID = "1137122628801405018";

// JSON file to persist last live video
const STORAGE_FILE = './lastLiveVideo.json';
let latestLiveVideoId = null;

// Load last posted live video ID
if (fs.existsSync(STORAGE_FILE)) {
  try {
    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const json = JSON.parse(data);
    latestLiveVideoId = json.latestLiveVideoId || null;
  } catch (err) {
    console.error('Error reading lastLiveVideo.json:', err);
  }
}

// Anonymous channels
const ANON_CHANNELS = [
  "1135983739843915846",
  "1468476714626711643"
];

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a custom embed message via the bot with preview')
    .addStringOption(option => 
      option.setName('title')
            .setDescription('Title of the embed')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('description')
            .setDescription('Primary description of the embed (multi-line allowed, Markdown supported)')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('description2')
            .setDescription('Secondary description of the embed (optional, multi-line allowed, Markdown supported)')
            .setRequired(false))
    .addStringOption(option => 
      option.setName('link')
            .setDescription('Optional URL link to include with display text "Website Link"')
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

// BotPost command with preview and description2
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'botpost') return;

  if (!interaction.member.roles.cache.some(role => BOTPOST_ALLOWED_ROLES.includes(role.id))) {
    return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
  }

  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');
  const description2 = interaction.options.getString('description2');
  const link = interaction.options.getString('link');

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xFFFFFF)
    .setDescription(description);

  if (description2) {
    embed.addFields({ name: "\u200b", value: description2 });
  }

  if (link && !description.includes(link) && !(description2 && description2.includes(link))) {
    embed.addFields({ name: "\u200b", value: `[Website Link](${link})` });
  }

  try {
    await interaction.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Error sending embed:', err);
    await interaction.reply({ content: '❌ Failed to send embed. Check console.', ephemeral: true });
  }
});

// Anonymous message handler
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channel.id)) return;

  const channel = message.channel;
  try {
    await message.delete();

    const anonEmbed = {
      color: 0xFFFFFF,
      description: message.content || "\u200b",
      timestamp: new Date(),
      footer: { text: "Anonymous message" }
    };

    const files = [];
    message.attachments.forEach(att => files.push(att.url));

    await channel.send({ embeds: [anonEmbed], content: files.length ? files.join("\n") : null });
  } catch (err) {
    console.error("Error sending anonymous message:", err);
  }
});

// YouTube live stream notifications (only post once per live stream)
const YOUTUBE_CHANNEL_ID = "UC4qOOlisAkrU5T1aJmwqDbA";
const YOUTUBE_POST_CHANNEL_ID = "1135971664132313240";

async function checkYoutubeLive() {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) return; // no live stream
    const video = data.items[0];
    const videoId = video.id.videoId;

    if (videoId === latestLiveVideoId) return; // already posted
    latestLiveVideoId = videoId;

    // Persist latest live video ID
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ latestLiveVideoId }));

    const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(video.snippet.title)
      .setDescription("📢 New live stream! Go check it out!")
      .setColor(0xFF0000)
      .setImage(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);

    await channel.send({ embeds: [embed] });

    if (MEDIA_ROLE_ID) {
      const role = channel.guild.roles.cache.get(MEDIA_ROLE_ID);
      if (role) await channel.send(`${role}`);
    }

    await channel.send(`[Website Link](https://www.youtube.com/@destinychurchlv)`);

  } catch (err) {
    console.error("Error checking YouTube live:", err);
  }
}

// Poll every 2 minutes
setInterval(checkYoutubeLive, 2 * 60 * 1000);

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);
