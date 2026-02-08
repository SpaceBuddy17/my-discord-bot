const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= CONFIG ================= */

const TOKEN = process.env.BOT_TOKEN;

// Admin roles allowed to use bot commands
const ADMIN_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

// Anonymous channels
const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643',
  '1469852593235824812'
];

// Guild ID for instant command registration
const TEST_GUILD_ID = '1135971663050199142'; // your Discord server ID

/* ========================================== */

const pendingBotposts = new Map();
const scheduledPosts = [];
const anonMessages = new Map(); // id -> { content, userId, channel, messageId }

/* =============== HELPERS ================= */

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

function pacificToUTC(mmddyyyy, time24) {
  const [m, d, y] = mmddyyyy.split('-').map(Number);
  const [hh, mm] = time24.split(':').map(Number);
  const pacific = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = new Date(pacific.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return offset;
}

function formatPacific(date) {
  return date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function makeId() {
  return 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* =============== COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description (multi-line allowed)').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('schedulebotpost')
    .setDescription('Schedule a botpost (Pacific Time)')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false))
    .addStringOption(o => o.setName('date').setDescription('MM-DD-YYYY').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('HH:MM 24h').setRequired(true)),

  new SlashCommandBuilder()
    .setName('listscheduledposts')
    .setDescription('List scheduled botposts'),

  new SlashCommandBuilder()
    .setName('cancelscheduledpost')
    .setDescription('Cancel a scheduled post')
    .addStringOption(o => o.setName('id').setDescription('Scheduled post ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('editscheduledpost')
    .setDescription('Edit a scheduled post')
    .addStringOption(o => o.setName('id').setDescription('Scheduled post ID').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('New title (optional)').setRequired(false))
    .addStringOption(o => o.setName('description').setDescription('New description (optional)').setRequired(false))
    .addStringOption(o => o.setName('description2').setDescription('New secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('New website link (optional)').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('New role to ping (optional)').setRequired(false))
    .addStringOption(o => o.setName('date').setDescription('New date MM-DD-YYYY (optional)').setRequired(false))
    .addStringOption(o => o.setName('time').setDescription('New time HH:MM 24h (optional)').setRequired(false)),

  new ContextMenuCommandBuilder()
    .setName('Lookup Anonymous Sender')
    .setType(ApplicationCommandType.Message)
];

/* ============== READY ================= */

client.once('ready', async () => {
  const guild = client.guilds.cache.get(TEST_GUILD_ID);
  if (guild) {
    await guild.commands.set(commands); // instant guild registration
    console.log('✅ Commands registered in test server');
  } else {
    console.warn('⚠️ Test guild not found, commands not registered');
  }
  console.log(`Logged in as ${client.user.tag}`);
});

/* ============ INTERACTIONS ============== */

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.member) return;

    const o = interaction.options;

    // Admin check
    if ((interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) &&
        !hasAdminRole(interaction.member)) {
      return await interaction.reply({ content: '❌ No permission.', ephemeral: true });
    }

    /* ---------- BOTPOST & SCHEDULE PREVIEW ---------- */
    if (interaction.isChatInputCommand() &&
        ['botpost', 'schedulebotpost'].includes(interaction.commandName)) {

      let description = o.getString('description');
      if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
      if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(o.getString('title'))
        .setDescription(description)
        .setTimestamp();

      const when = interaction.commandName === 'schedulebotpost'
        ? pacificToUTC(o.getString('date'), o.getString('time'))
        : null;

      const data = {
        id: when ? makeId() : null,
        embed,
        channel: interaction.channel,
        ping: o.getRole('ping'),
        when
      };

      pendingBotposts.set(interaction.user.id, data);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
      );

      return await interaction.reply({
        content: when ? `⏰ ${formatPacific(when)} • ID: ${data.id}` : '📋 Preview',
        embeds: [embed],
        components: [buttons],
        ephemeral: true
      });
    }

    /* ---------- EDIT SCHEDULED ---------- */
    if (interaction.isChatInputCommand() &&
        interaction.commandName === 'editscheduledpost') {

      const id = o.getString('id');
      const post = scheduledPosts.find(p => p.id === id);
      if (!post) return await interaction.reply({ content: '❌ Scheduled post not found.', ephemeral: true });

      if (o.getString('title')) post.embed.setTitle(o.getString('title'));
      let desc = o.getString('description');
      if (desc) {
        if (o.getString('description2')) desc += `\n\n${o.getString('description2')}`;
        if (o.getString('link')) desc += `\n\n[Website Link](${o.getString('link')})`;
        post.embed.setDescription(desc);
      }
      if (o.getRole('ping')) post.ping = o.getRole('ping');
      if (o.getString('date') && o.getString('time')) post.when = pacificToUTC(o.getString('date'), o.getString('time'));

      pendingBotposts.set(interaction.user.id, post);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
      );

      return await interaction.reply({
        content: `✏️ **Editing ${id}** — confirm changes`,
        embeds: [post.embed],
        components: [buttons],
        ephemeral: true
      });
    }

    /* ---------- CONFIRM/CANCEL BUTTONS ---------- */
    if (interaction.isButton()) {
      const data = pendingBotposts.get(interaction.user.id);
      if (!data) return;

      if (interaction.customId === 'cancel') {
        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
      }

      if (interaction.customId === 'confirm') {
        if (data.when && !scheduledPosts.includes(data)) scheduledPosts.push(data);
        else if (!data.when) {
          await data.channel.send({
            content: data.ping ? `<@&${data.ping.id}>` : undefined,
            embeds: [data.embed]
          });
        }

        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
      }
    }

    /* ---------- LIST SCHEDULED ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'listscheduledposts') {
      if (!scheduledPosts.length) return await interaction.reply({ content: 'No scheduled posts.', ephemeral: true });

      const text = scheduledPosts.map(p =>
        `🆔 **${p.id}** — ${p.embed.data.title}\n<#${p.channel.id}> • ${formatPacific(p.when)}`
      ).join('\n\n');

      return await interaction.reply({ content: text, ephemeral: true });
    }

    /* ---------- CANCEL SCHEDULED ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'cancelscheduledpost') {
      const id = o.getString('id');
      const idx = scheduledPosts.findIndex(p => p.id === id);
      if (idx === -1) return await interaction.reply({ content: '❌ ID not found.', ephemeral: true });
      scheduledPosts.splice(idx, 1);
      return await interaction.reply({ content: `✅ Canceled ${id}`, ephemeral: true });
    }

    /* ---------- LOOKUP ANONYMOUS ---------- */
    if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Lookup Anonymous Sender') {
      const messageId = interaction.targetId;
      const record = Array.from(anonMessages.entries()).find(([id, msg]) => msg.messageId === messageId);
      if (!record) return await interaction.reply({ content: '❌ Could not find sender.', ephemeral: true });
      const [anonId, msg] = record;
      return await interaction.reply({ content: `🕵️ Sender: <@${msg.userId}> • ID: ${anonId}`, ephemeral: true });
    }

  } catch (err) {
    console.error('Interaction error:', err);
    if (!interaction.replied) await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true });
  }
});

/* ---------- ANONYMOUS MESSAGE HANDLER (EMBED) ---------- */
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!ANON_CHANNELS.includes(message.channel.id)) return;

  const anonId = makeId();
  anonMessages.set(anonId, { content: message.content, userId: message.author.id, channel: message.channel, messageId: message.id });

  // Delete the original user message
  await message.delete().catch(() => {});

  // Repost anonymously as an embed
  const embed = new EmbedBuilder()
    .setColor(0x7289da) // Discord blurple
    .setTitle('✉️ Anonymous Message')
    .setDescription(message.content)
    .setFooter({ text: `ID: ${anonId}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
});

/* ============ SCHEDULER LOOP ============== */

setInterval(async () => {
  const now = Date.now();
  for (let i = scheduledPosts.length - 1; i >= 0; i--) {
    if (scheduledPosts[i].when <= now) {
      const p = scheduledPosts[i];
      await p.channel.send({
        content: p.ping ? `<@&${p.ping.id}>` : undefined,
        embeds: [p.embed]
      });
      scheduledPosts.splice(i, 1);
    }
  }
}, 30_000);

/* =============== LOGIN ================= */

client.login(TOKEN);
