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

// 5️⃣ State tracking
const lockedMaleFemale = new Set();
const userSelections = {}; // { userId: { roleId: categoryTitle } }

// 6️⃣ Color exclusivity
const COLOR_ROLE_IDS = [
  '1463058233940901892', // RED
  '1463058244921589770', // ORANGE
  '1463058237996662950', // YELLOW
  '1463058235748782256', // GREEN
  '1463058251787669577', // BLUE
  '1463058240307990548', // PURPLE
  '1466296912758968485', // PINK
  '1463058259266240734'  // BROWN
];

// 7️⃣ Role categories
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
    singleSelect: false,
    roles: [
      { id: '1466294642139074763', label: '📖 DEVOTIONALS' },
      { id: '1466294700507140259', label: '⛪ CHURCH WITHOUT WALLS' },
      { id: '1463018476309577865', label: '🎮 GAMING' }
    ]
  },
  {
    title: 'FOYER VS. FOYAY',
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
    singleSelect: false,
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
    singleSelect: false,
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

// 8️⃣ Slash command — Clear & repost
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'selfroles') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: 'Admins only.', ephemeral: true });
    }

    await interaction.reply({ content: '♻️ Clearing and reposting self-roles…', ephemeral: true });

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    for (const msg of botMessages.values()) await msg.delete().catch(() => {});

    // Intro
    const introEmbed = new EmbedBuilder()
      .setTitle('WELCOME TO #SELF-ROLES')
      .setDescription(
        '**Choose roles to join groups, receive notifications, or change your name color. Click a button below to assign yourself a role!**'
      )
      .setColor(0xFFFFFF);
    await interaction.channel.send({ embeds: [introEmbed] });

    // Post categories
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
  }
});

// 9️⃣ Button handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const roleId = interaction.customId;

  try {
    // Male/Female
    const maleFemaleIds = roleCategories[0].roles.map(r => r.id);
    if (maleFemaleIds.includes(roleId)) {
      if (lockedMaleFemale.has(member.id)) {
        return interaction.reply({ content: 'You cannot change your gender role.', ephemeral: true });
      }

      for (const id of maleFemaleIds) if (member.roles.cache.has(id)) await member.roles.remove(id);
      await member.roles.add(roleId);
      lockedMaleFemale.add(member.id);

      const newRows = interaction.message.components.map(r => {
        const newRow = ActionRowBuilder.from(r);
        newRow.components = newRow.components.map(b =>
          maleFemaleIds.includes(b.data.custom_id)
            ? ButtonBuilder.from(b).setDisabled(true).setStyle(ButtonStyle.Success)
            : ButtonBuilder.from(b)
        );
        return newRow;
      });
      return await interaction.update({ components: newRows });
    }

    // Category
    const category = roleCategories.find(c => c.roles.some(r => r.id === roleId));
    if (!category) return;

    userSelections[member.id] = userSelections[member.id] || {};

    if (category.singleSelect) {
      // remove previous
      const previous = Object.entries(userSelections[member.id]).find(([k, v]) => v === category.title);
      if (previous) {
        await member.roles.remove(previous[0]);
        delete userSelections[member.id][previous[0]];
      }

      await member.roles.add(roleId);
      userSelections[member.id][roleId] = category.title;
    } else {
      // multi-select toggle
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        delete userSelections[member.id][roleId];
      } else {
        await member.roles.add(roleId);
        userSelections[member.id][roleId] = category.title;
      }
    }

    // Update button styles
    const newRows = interaction.message.components.map(r => {
      const newRow = ActionRowBuilder.from(r);
      newRow.components = newRow.components.map(b => {
        const id = b.data.custom_id;
        const hasRole = member.roles.cache.has(id);
        const style = hasRole ? ButtonStyle.Success : ButtonStyle.Secondary; // green if selected
        return ButtonBuilder.from(b).setStyle(style);
      });
      return newRow;
    });

    await interaction.update({ components: newRows });

  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Role update failed. Check bot permissions and role hierarchy.', ephemeral: true });
  }
});

// 10️⃣ Login
client.once('ready', () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(token);
