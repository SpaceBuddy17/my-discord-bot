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
    .addRoleOption(option =>
      option.setName('ping')
            .setDescription('Optional role to ping after sending the embed')
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
  const pingRole = interaction.options.getRole('ping');

  // Build preview embed
  const previewEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xFFFFFF)
    .setDescription(description);

  if (description2) {
    previewEmbed.addFields({ name: "\u200b", value: description2 });
  }

  // Only add the link if it's not already in description or description2
  if (link && !description.includes(link) && !(description2 && description2.includes(link))) {
    previewEmbed.addFields({ name: "\u200b", value: `[Website Link](${link})` });
  }

  // Buttons for confirm/cancel
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_post')
        .setLabel('✅ Send Embed')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_post')
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Danger)
    );

  await interaction.reply({ 
    embeds: [previewEmbed], 
    ephemeral: true, 
    components: [row] 
  });

  const filter = i => i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async i => {
    if (i.customId === 'confirm_post') {
      try {
        await interaction.channel.send({ embeds: [previewEmbed] });
        if (pingRole) await interaction.channel.send(`${pingRole}`);
        await i.update({ content: '✅ Embed sent!', embeds: [], components: [], ephemeral: true });
      } catch (err) {
        console.error('Error sending embed:', err);
        await i.update({ content: '❌ Failed to send embed. Check console.', embeds: [], components: [], ephemeral: true });
      }
      collector.stop();
    } else if (i.customId === 'cancel_post') {
      await i.update({ content: '❌ Posting cancelled.', embeds: [], components: [], ephemeral: true });
      collector.stop();
    }
  });

  collector.on('end', collected => {
    if (collected.size === 0) {
      interaction.editReply({ content: '⌛ Time expired. Preview no longer available.', embeds: [], components: [], ephemeral: true });
    }
  });
});

// YouTube notifications for live streams only
const YOUTUBE_CHANNEL_ID = "UC4qOOlisAkrU5T1aJmwqDbA";
const YOUTUBE_POST_CHANNEL_ID = "1135971664132313240";
let latestVideoId = null;

// Load last posted video ID
if (fs.existsSync('lastVideo.json')) {
  const data = JSON.parse(fs.readFileSync('lastVideo.json', 'utf8'));
  latestVideoId = data.latestVideoId || null;
}

async function checkYoutube() {
  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
    const res = await fetch(feedUrl);
    const text = await res.text();

    const match = text.match(/<yt:videoId>(.+)<\/yt:videoId>/);
    if (!match) return;

    const videoId = match[1];
    if (videoId === latestVideoId) return; // already posted
    latestVideoId = videoId;

    // Save latest video ID
    fs.writeFileSync('lastVideo.json', JSON.stringify({ latestVideoId }));

    const videoTitleMatch = text.match(/<title>(.+)<\/title>/);
    const videoTitle = videoTitleMatch ? videoTitleMatch[1] : 'New Video';
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    const channel = client.channels.cache.get(YOUTUBE_POST_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(videoTitle)
      .setDescription("📢 New live stream! Go check it out!")
      .setColor(0xFF0000)
      .setImage(thumbnailUrl);

    await channel.send({ embeds: [embed] });

    if (MEDIA_ROLE_ID) {
      const role = channel.guild.roles.cache.get(MEDIA_ROLE_ID);
      if (role) await channel.send(`${role}`);
    }

    // Add separate message with the channel link
    await channel.send(`[Website Link](https://www.youtube.com/@destinychurchlv)`);

  } catch (err) {
    console.error("Error checking YouTube:", err);
  }
}

// Poll YouTube every 5 minutes
setInterval(checkYoutube, 5 * 60 * 1000);

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);
