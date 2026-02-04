require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const Parser = require('rss-parser');
const parser = new Parser();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

/* =======================
   CONFIG
======================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const ALLOWED_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

// Welcome
const WELCOME_CHANNEL_ID = '1135971664132313243';
const VERIFIED_ROLE_ID = '1137122628801405018';

// YouTube
const YOUTUBE_CHANNEL_ID = 'UC4qOOlisAkrU5T1aJmwqDbA';
const YOUTUBE_POST_CHANNEL_ID = '1135971664132313240';
const MEDIA_ROLE_ID = '1467324932965929033';

let lastVideoId = null;

/* =======================
   SLASH COMMANDS
======================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a message via the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Message to send')
        .setRequired(true))
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Target channel')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('botpostembed')
    .setDescription('Send an embed via the bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o =>
      o.setName('title')
        .setDescription('Embed title')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('description')
        .setDescription('Embed description')
        .setRequired(true))
    .addRoleOption(o =>
      o.setName('ping')
        .setDescription('Optional role to ping')
        .setRequired(false))
    .addStringOption(o =>
      o.setName('image')
        .setDescription('Optional image URL')
        .setRequired(false))
    .addChannelOption(o =>
      o.setName('channel')
        .setDescription('Target channel')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('forceyoutube')
    .setDescription('Force post the latest YouTube upload')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c => c.toJSON());

/* =======================
   REGISTER COMMANDS
======================= */

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

/* =======================
   ROLE CHECK HELPER
======================= */

function hasAllowedRole(member) {
  return ALLOWED_ROLES.some(r => member.roles.cache.has(r));
}

/* =======================
   INTERACTIONS
======================= */

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (!hasAllowedRole(interaction.member)) {
    await interaction.reply({
      content: '❌ You do not have permission to use this command.',
      ephemeral: true
    });
    return;
  }

  /* ---- /botpost ---- */
  if (interaction.commandName === 'botpost') {
    const message = interaction.options.getString('message');
    const channel =
      interaction.options.getChannel('channel') || interaction.channel;

    await channel.send(message);
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
  }

  /* ---- /botpostembed ---- */
  if (interaction.commandName === 'botpostembed') {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const pingRole = interaction.options.getRole('ping');
    const image = interaction.options.getString('image');
    const channel =
      interaction.options.getChannel('channel') || interaction.channel;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0xffffff)
      .setTimestamp();

    if (image) embed.setImage(image);

    await channel.send({
      content: pingRole ? `<@&${pingRole.id}>` : null,
      embeds: [embed]
    });

    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
  }

  /* ---- /forceyoutube ---- */
  if (interaction.commandName === 'forceyoutube') {
    await postLatestYouTubeVideo(true);
    await interaction.deferReply({ ephemeral: true });
    await interaction.deleteReply();
  }
});

/* =======================
   WELCOME MESSAGE
======================= */

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (
    !oldMember.roles.cache.has(VERIFIED_ROLE_ID) &&
    newMember.roles.cache.has(VERIFIED_ROLE_ID)
  ) {
    const channel = newMember.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xffffff)
      .setTitle('Welcome!')
      .setDescription('We’re glad you’re here.')
      .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await channel.send(`<@${newMember.id}>`);
  }
});

/* =======================
   YOUTUBE WATCHER
======================= */

async function postLatestYouTubeVideo(force = false) {
  const feed = await parser.parseURL(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
  );

  const video = feed.items[0];
  if (!video) return;

  if (!force && video.id === lastVideoId) return;

  lastVideoId = video.id;

  // Skip livestreams until VOD
  if (video.itunes?.duration === undefined) return;

  const channel = await client.channels.fetch(YOUTUBE_POST_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle(video.title.replace(/\|\|/g, '｜｜'))
    .setURL(video.link)
    .setDescription('📢 New video uploaded! Go check it out!')
    .setColor(0xff0000)
    .setImage(video.media?.thumbnail?.url)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await channel.send(`<@&${MEDIA_ROLE_ID}>`);
}

setInterval(() => postLatestYouTubeVideo(false), 5 * 60 * 1000);

/* =======================
   READY
======================= */

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
