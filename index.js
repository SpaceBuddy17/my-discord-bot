const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder, 
  REST, 
  Routes
} = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
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

// Admins allowed for anonymous lookup (added new role)
const ADMIN_ROLES = ["1318997119566090270", "1136004041395159140"];

// Storage files
const LAST_LIVE_FILE = './lastLiveVideo.json';
const ANON_LOG_FILE = './anonLogs.json';

// Load last posted live video
let latestLiveVideoId = null;
if (fs.existsSync(LAST_LIVE_FILE)) {
  try {
    const data = fs.readFileSync(LAST_LIVE_FILE, 'utf8');
    latestLiveVideoId = JSON.parse(data).latestLiveVideoId || null;
  } catch (err) { console.error(err); }
}

// Anonymous channels
const ANON_CHANNELS = ["1135983739843915846","1468476714626711643"];

// Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a custom embed message via the bot')
    .addStringOption(opt => opt.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Primary description of the embed (multi-line allowed)').setRequired(true))
    .addStringOption(opt => opt.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(opt => opt.setName('link').setDescription('Optional URL link').setRequired(false))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Admin: Lookup who sent an anonymous message')
    .addStringOption(opt => opt.setName('messageid').setDescription('ID of the anonymous message').setRequired(true))
    .toJSON(),

  new ContextMenuCommandBuilder()
    .setName('Lookup Anonymous Sender')
    .setType(ApplicationCommandType.Message)
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log('✅ Slash commands and context menu registered');
})();

// Welcome message
client.on('guildMemberAdd', async member => {
  const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
  if (!channel) return;
  if (!member.roles.cache.has(VERIFIED_ROLE_ID)) return;

  const embed = new EmbedBuilder()
    .setTitle('Welcome to Destiny Church!')
    .setDescription('We’re glad to have you here!')
    .setColor(0xFFFFFF)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

  await channel.send({ embeds: [embed] });
  await channel.send(`${member}`); // ping separately
});

// BotPost command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

  // BotPost
  if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
    if (!interaction.member.roles.cache.some(r => BOTPOST_ALLOWED_ROLES.includes(r.id))) {
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

    if (description2) embed.addFields({ name: "\u200b", value: description2 });
    if (link) embed.addFields({ name: "\u200b", value: `[Website Link](${link})` });

    try { await interaction.channel.send({ embeds: [embed] }); }
    catch (err) { console.error(err); await interaction.reply({ content: 'Failed to send embed', ephemeral: true }); }
  }

  // Anonymous Lookup by slash
  if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
    if (!interaction.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
    }

    const messageId = interaction.options.getString('messageid');
    if (!fs.existsSync(ANON_LOG_FILE)) return interaction.reply({ content: 'No logs found', ephemeral: true });

    const logs = JSON.parse(fs.readFileSync(ANON_LOG_FILE, 'utf8'));
    const entry = logs.find(l => l.messageId === messageId);
    if (!entry) return interaction.reply({ content: 'Message not found in logs', ephemeral: true });

    interaction.reply({ content: `The anonymous message was sent by <@${entry.userId}>`, ephemeral: true });
  }

  // Anonymous Lookup via context menu (one-click)
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Lookup Anonymous Sender') {
    if (!interaction.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id))) {
      return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
    }

    const messageId = interaction.targetId; // clicked message
    if (!fs.existsSync(ANON_LOG_FILE)) return interaction.reply({ content: 'No logs found', ephemeral: true });

    const logs = JSON.parse(fs.readFileSync(ANON_LOG_FILE, 'utf8'));
    const entry = logs.find(l => l.messageId === messageId);
    if (!entry) return interaction.reply({ content: 'Message not found in logs', ephemeral: true });

    interaction.reply({ content: `The anonymous message was sent by <@${entry.userId}>`, ephemeral: true });
  }
});

// Anonymous messages
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channel.id)) return;

  try {
    const channel = message.channel;
    await message.delete();

    const embed = {
      color: 0xFFFFFF,
      description: message.content || "\u200b",
      timestamp: new Date(),
      footer: { text: "Anonymous message" }
    };

    const files = [];
    message.attachments.forEach(att => files.push(att.url));

    const sentMessage = await channel.send({ embeds: [embed], content: files.length ? files.join("\n") : null });

    // Log the sender for admin lookup
    let logs = [];
    if (fs.existsSync(ANON_LOG_FILE)) logs = JSON.parse(fs.readFileSync(ANON_LOG_FILE, 'utf8'));
    logs.push({ messageId: sentMessage.id, userId: message.author.id, channelId: channel.id, timestamp: new Date().toISOString() });
    fs.writeFileSync(ANON_LOG_FILE, JSON.stringify(logs, null, 2));

  } catch (err) { console.error("Error sending anonymous message:", err); }
});

// YouTube live notifications (poll every 2 minutes)
const YOUTUBE_CHANNEL_ID = "UC4qOOlisAkrU5T1aJmwqDbA";
const YOUTUBE_POST_CHANNEL_ID = "1135971664132313240";

async function checkYoutubeLive() {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items || data.items.length === 0) return;

    const video = data.items[0];
    const videoId = video.id.videoId;
    if (videoId === latestLiveVideoId) return;

    latestLiveVideoId = videoId;
    fs.writeFileSync(LAST_LIVE_FILE, JSON.stringify({ latestLiveVideoId }));

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

  } catch (err) { console.error("Error checking YouTube live:", err); }
}

setInterval(checkYoutubeLive, 2 * 60 * 1000);

client.once('ready', () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(token);
