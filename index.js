const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
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
const anonMessages = new Map(); // id -> { content, userId, channel, messageId }

/* =============== HELPERS ================= */

function hasAdminRole(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
}

function makeId() {
  return 'SP-' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/* =============== COMMANDS ================= */

const commands = [
  new SlashCommandBuilder()
    .setName('botpost')
    .setDescription('Send a bot message as an embed')
    .addStringOption(o => o.setName('title').setDescription('Title of the embed').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Primary description (multi-line allowed)').setRequired(true))
    .addStringOption(o => o.setName('description2').setDescription('Secondary description (optional)').setRequired(false))
    .addStringOption(o => o.setName('link').setDescription('Optional website link').setRequired(false))
    .addRoleOption(o => o.setName('ping').setDescription('Optional role to ping').setRequired(false)),

  new SlashCommandBuilder()
    .setName('anonlookup')
    .setDescription('Lookup the sender of an anonymous message')
    .addStringOption(o => o.setName('message_id').setDescription('ID of the anonymous message').setRequired(true))
];

/* ============== READY ================= */

client.once('ready', async () => {
  const guild = client.guilds.cache.get(TEST_GUILD_ID);
  if (!guild) {
    console.warn('⚠️ Test guild not found, commands not registered');
    return;
  }

  try {
    await guild.commands.set([]); // clear old commands
    await guild.commands.set(commands); // register current commands
    console.log('✅ Commands registered in test server');
  } catch (err) {
    console.error('Error registering commands:', err);
  }

  console.log(`Logged in as ${client.user.tag}`);
});

/* ============ INTERACTIONS ============== */

client.on('interactionCreate', async interaction => {
  try {
    if (!interaction.member) return;

    const o = interaction.options;

    // Admin check
    if (interaction.isChatInputCommand() && !hasAdminRole(interaction.member)) {
      return await interaction.reply({ content: '❌ No permission.', ephemeral: true });
    }

    /* ---------- BOTPOST (embed only) ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'botpost') {
      let description = o.getString('description');
      if (o.getString('description2')) description += `\n\n${o.getString('description2')}`;
      if (o.getString('link')) description += `\n\n[Website Link](${o.getString('link')})`;

      const embed = new EmbedBuilder()
        .setColor(0xffffff)
        .setTitle(o.getString('title'))
        .setDescription(description)
        .setTimestamp();

      const data = {
        embed,
        channel: interaction.channel,
        ping: o.getRole('ping')
      };

      pendingBotposts.set(interaction.user.id, data);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger)
      );

      return await interaction.reply({
        content: '📋 Preview',
        embeds: [embed],
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
        // Send embed first
        await data.channel.send({ embeds: [data.embed] });

        // Send ping after embed
        if (data.ping) {
          await data.channel.send(`<@&${data.ping.id}>`);
        }

        pendingBotposts.delete(interaction.user.id);
        return await interaction.update({ content: '✅ Confirmed.', embeds: [], components: [] });
      }
    }

    /* ---------- ANONLOOKUP ---------- */
    if (interaction.isChatInputCommand() && interaction.commandName === 'anonlookup') {
      const msgId = o.getString('message_id');
      const record = Array.from(anonMessages.entries()).find(([id, msg]) => msg.messageId === msgId);
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
    .setColor(0x7289da)
    .setTitle('✉️ Anonymous Message')
    .setDescription(message.content)
    .setFooter({ text: `ID: ${anonId}` })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] });
});

/* =============== LOGIN ================= */

client.login(TOKEN);
