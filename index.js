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
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= CONFIG ================= */

const TOKEN = process.env.BOT_TOKEN;

const ADMIN_ROLES = [
  '1318997119566090270',
  '1136004041395159140'
];

const ANON_CHANNELS = [
  '1135983739843915846',
  '1468476714626711643'
];

/* ========================================== */

const pendingBotposts = new Map();
const scheduledPosts = [];

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

/* ===== PACIFIC TIME HELPERS ===== */

function pacificToUTC(mmddyyyy, time24) {
  const [m, d, y] = mmddyyyy.split('-').map(Number);
  const [hh, mm] = time24.split(':').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const offset = new Date(base.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
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
    .addStringOption(o => o.setName('description').setDescription('Primary description of the embed').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description of the embed (optional)'))
    .addStringOption(o => o.setName('link').setDescription('Optional website link'))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping')),

  new SlashCommandBuilder()
    .setName('schedulebotpost')
    .setDescription('Schedule a botpost (Pacific Time)')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)'))
    .addStringOption(o => o.setName('link').setDescription('Optional website link'))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping'))
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
    .addStringOption(o => o.setName('title').setDescription('New title (optional)'))
    .addStringOption(o => o.setName('description').setDescription('New description (optional)'))
    .addStringOption(o => o.setName('description2').setDescription('New secondary description (optional)'))
    .addStringOption(o => o.setName('link').setDescription('New website link (optional)'))
    .addRoleOption(o => o.setName('ping').setDescription('New role to ping (optional)'))
    .addStringOption(o => o.setName('date').setDescription('New date MM-DD-YYYY (optional)'))
    .addStringOption(o => o.setName('time').setDescription('New time HH:MM 24h (optional)')),

  new ContextMenuCommandBuilder()
    .setName('Lookup Anonymous Sender')
    .setType(ApplicationCommandType.Message)
];

/* ============== READY ================= */

client.once('clientReady', async () => {
  await client.application.commands.set(commands);
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ============ INTERACTIONS ============== */

client.on('interactionCreate', async interaction => {
  if ((interaction.isChatInputCommand() || interaction.isMessageContextMenuCommand()) &&
      !hasAdminRole(interaction.member)) {
    return interaction.reply({ content: '❌ No permission.', ephemeral: true });
  }

  // ---------- CREATE / SCHEDULE ----------
  if (interaction.isChatInputCommand() &&
      ['botpost', 'schedulebotpost'].includes(interaction.commandName)) {

    const o = interaction.options;

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

    return interaction.reply({
      content: when ? `⏰ ${formatPacific(when)} • ID: ${data.id}` : '📋 Preview',
      embeds: [embed],
      components: [buttons],
      ephemeral: true
    });
  }

  // ---------- EDIT SCHEDULED ----------
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'editscheduledpost') {

    const id = interaction.options.getString('id');
    const post = scheduledPosts.find(p => p.id === id);

    if (!post) {
      return interaction.reply({ content: '❌ Scheduled post not found.', ephemeral: true });
    }

    if (interaction.options.getString('title'))
      post.embed.setTitle(interaction.options.getString('title'));

    let desc = interaction.options.getString('description');
    if (desc) {
      if (interaction.options.getString('description2'))
        desc += `\n\n${interaction.options.getString('description2')}`;
      if (interaction.options.getString('link'))
        desc += `\n\n[Website Link](${interaction.options.getString('link')})`;
      post.embed.setDescription(desc);
    }

    if (interaction.options.getRole('ping'))
      post.ping = interaction.options.getRole('ping');

    if (interaction.options.getString('date') && interaction.options.getString('time'))
      post.when = pacificToUTC(
        interaction.options.getString('date'),
        interaction.options.getString('time')
      );

    pendingBotposts.set(interaction.user.id, post);

    return interaction.reply({
      content: `✏️ **Editing ${id}** — confirm changes`,
      embeds: [post.embed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
        )
      ],
      ephemeral: true
    });
  }

  // ---------- CONFIRM ----------
  if (interaction.isButton()) {
    const data = pendingBotposts.get(interaction.user.id);
    if (!data) return;

    if (interaction.customId === 'cancel') {
      pendingBotposts.delete(interaction.user.id);
      return interaction.update({ content: '❌ Canceled.', embeds: [], components: [] });
    }

    if (interaction.customId === 'confirm') {
      if (data.when && !scheduledPosts.includes(data)) {
        scheduledPosts.push(data);
      } else if (!data.when) {
        await data.channel.send({
          content: data.ping ? `<@&${data.ping.id}>` : null,
          embeds: [data.embed]
        });
      }

      pendingBotposts.delete(interaction.user.id);
      return interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
    }
  }

  // ---------- LIST ----------
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'listscheduledposts') {

    if (!scheduledPosts.length) {
      return interaction.reply({ content: 'No scheduled posts.', ephemeral: true });
    }

    const text = scheduledPosts.map(p =>
      `🆔 **${p.id}** — ${p.embed.data.title}\n<#${p.channel.id}> • ${formatPacific(p.when)}`
    ).join('\n\n');

    return interaction.reply({ content: text, ephemeral: true });
  }

  // ---------- CANCEL ----------
  if (interaction.isChatInputCommand() &&
      interaction.commandName === 'cancelscheduledpost') {

    const id = interaction.options.getString('id');
    const idx = scheduledPosts.findIndex(p => p.id === id);

    if (idx === -1) {
      return interaction.reply({ content: '❌ ID not found.', ephemeral: true });
    }

    scheduledPosts.splice(idx, 1);
    return interaction.reply({ content: `✅ Canceled ${id}`, ephemeral: true });
  }
});

/* ============ SCHEDULER LOOP ============== */

setInterval(async () => {
  const now = Date.now();
  for (let i = scheduledPosts.length - 1; i >= 0; i--) {
    if (scheduledPosts[i].when <= now) {
      const p = scheduledPosts[i];
      await p.channel.send({
        content: p.ping ? `<@&${p.ping.id}>` : null,
        embeds: [p.embed]
      });
      scheduledPosts.splice(i, 1);
    }
  }
}, 30_000);

/* =============== LOGIN ================= */

client.login(TOKEN);
