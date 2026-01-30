const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  Events
} = require('discord.js');

// 1️⃣ Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// 2️⃣ Env
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// 3️⃣ Slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('selfroles')
    .setDescription('Clear and repost self-role panels')
].map(c => c.toJSON());

// 4️⃣ Register commands
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

// 5️⃣ Role IDs
const COLOR_ROLE_IDS = [
  '1463058233940901892','1463058244921589770','1463058237996662950',
  '1463058235748782256','1463058251787669577','1463058240307990548',
  '1466296912758968485','1463058259266240734'
];

// 6️⃣ Role categories
const roleCategories = [
  {
    title: 'MALE OR FEMALE',
    description: 'Choose your gender by selecting one of the buttons!',
    color: 0xFFFFFF,
    singleSelect: true,
    roles: [
      { id: '1319394099643809832', label: '♂️ MALE' },
      { id: '1463018695046725705', label: '♀️ FEMALE' }
    ]
  },
  {
    title: 'WHAT ARE YOUR INTERESTS?',
    description: 'Select what you would like to be notified for!',
    color: 0x9702D4,
    multiSelect: true,
    roles: [
      { id: '1466294642139074763', label: '📖 DEVOTIONALS' },
      { id: '1466294700507140259', label: '⛪ CHURCH WITHOUT WALLS' },
      { id: '1463018476309577865', label: '🎮 GAMING' }
    ]
  },
  {
    title: 'FOYER VS FOYAY',
    description: 'How should this word be pronounced?',
    color: 0xFFFFFF,
    singleSelect: true,
    roles: [
      { id: '1463044307274694840', label: 'FOYER' },
      { id: '1463044533909717074', label: 'FOYAY' }
    ]
  },
  {
    title: 'GAMING SYSTEMS',
    description: 'If you play videogames, which console(s) do you play on?',
    color: 0xFFA500,
    multiSelect: true,
    roles: [
      { id: '1463017870630981779', label: '💻 PC' },
      { id: '1463017911798202368', label: '❎ XBOX' },
      { id: '1463018307971190928', label: '⭕ PLAYSTATION' },
      { id: '1463017956903616668', label: '🕹️ NINTENDO' }
    ]
  },
  {
    title: 'GAMES',
    description: 'Which games do you own that you would like to play with others?',
    color: 0xFFA500,
    multiSelect: true,
    roles: [
      { id: '1463054662574932039', label: '🌎 HECKDIVER' },
      { id: '1463054757882101881', label: '🪂 COD NOOB' },
      { id: '1463055675100758183', label: '🆘 DAYZ SURVIVOR' }
    ]
  },
  {
    title: 'PICK YOUR COLOR',
    description: 'Choose how your name appears!',
    color: 0xFFFFFF,
    singleSelect: true,
    roles: [
      { id: '1463058233940901892', label: '🔴 RED' },
      { id: '1463058244921589770', label: '🟠 ORANGE' },
      { id: '1463058237996662950', label: '🟡 YELLOW' },
      { id: '1463058235748782256', label: '🟢 GREEN' },
      { id: '1463058251787669577', label: '🔵 BLUE' },
      { id: '1463058240307990548', label: '🟣 PURPLE' },
      { id: '1466296912758968485', label: '🎀 PINK' },
      { id: '1463058259266240734', label: '🟤 BROWN' }
    ]
  }
];

// 7️⃣ Slash command handler — CLEAR & REPOST
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'selfroles') return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admins only.', ephemeral: true });
  }

  await interaction.reply({ content: '♻️ Clearing and reposting self-roles…', ephemeral: true });

  // Delete old messages
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const botMessages = messages.filter(m => m.author.id === client.user.id);
  for (const msg of botMessages.values()) await msg.delete().catch(() => {});

  // Intro embed
  const introEmbed = new EmbedBuilder()
    .setTitle('WELCOME TO #SELF-ROLES')
    .setDescription('**Choose roles to join groups, receive notifications, or change your name color. Click a button below to assign yourself a role!**')
    .setColor(0xFFFFFF);

  await interaction.channel.send({ embeds: [introEmbed] });

  // Send role categories
  for (const category of roleCategories) {
    const embed = new EmbedBuilder()
      .setTitle(category.title)
      .setDescription(category.description)
      .setColor(category.color);

    const rows = [];
    let row = new ActionRowBuilder();

    for (const role of category.roles) {
      if (row.components.length === 5) {
        rows.push(row);
        row = new ActionRowBuilder();
      }

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(role.id)
          .setLabel(role.label)
          .setStyle(ButtonStyle.Secondary)
      );
    }
    if (row.components.length) rows.push(row);

    await interaction.channel.send({ embeds: [embed], components: rows });
  }

  await interaction.followUp({ content: '✅ Self-roles posted!', ephemeral: true });
});

// 8️⃣ Button interaction handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const roleId = interaction.customId;

  const category = roleCategories.find(cat => cat.roles.some(r => r.id === roleId));
  if (!category) return;

  try {
    if (category.singleSelect) {
      // Remove all roles in this category
      for (const role of category.roles) {
        if (member.roles.cache.has(role.id) && role.id !== roleId) {
          await member.roles.remove(role.id);
        }
      }
      // Toggle clicked role
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      } else {
        await member.roles.add(roleId);
      }
    } else if (category.multiSelect) {
      // Toggle clicked role
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
      } else {
        await member.roles.add(roleId);
      }
    }

    // Update button labels with ✅ emoji for selected roles
    const newRows = interaction.message.components.map(row => {
      const newRow = ActionRowBuilder.from(row);
      newRow.components = newRow.components.map(btn => {
        const hasRole = member.roles.cache.has(btn.customId);
        const label = category.singleSelect || category.multiSelect
          ? (hasRole ? `✅ ${btn.label}` : btn.label.replace(/^✅ /, ''))
          : btn.label;
        return ButtonBuilder.from(btn).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(false);
      });
      return newRow;
    });

    await interaction.update({ components: newRows });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Role update failed.', ephemeral: true });
  }
});

// 9️⃣ Login
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});
client.login(token);
