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
} = require("discord.js");

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
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('selfroles').setDescription('Clear and repost self-role panels')
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

// 5️⃣ Role definitions
const roleCategories = [
  {
    title: 'MALE OR FEMALE',
    description: 'Choose your gender by selecting one of the buttons!',
    color: 0xFFFFFF,
    roles: [
      { id: '1319394099643809832', label: '♂️ MALE' },
      { id: '1463018695046725705', label: '♀️ FEMALE' }
    ],
    singleSelect: true,
    lockAfterSelect: true // permanently lock both after selection
  },
  {
    title: 'WHAT ARE YOUR INTERESTS?',
    description: 'Select what you would like to be notified for!',
    color: 0x9702D4,
    roles: [
      { id: '1466294642139074763', label: '📖 DEVOTIONALS' },
      { id: '1466294700507140259', label: '⛪ CHURCH WITHOUT WALLS' },
      { id: '1463018476309577865', label: '🎮 GAMING' }
    ],
    singleSelect: false,
    lockAfterSelect: false
  },
  {
    title: 'FOYER VS FOYAY',
    description: 'Select your preferred pronunciation!',
    color: 0xFFFFFF,
    roles: [
      { id: '1463044307274694840', label: 'FOYER' },
      { id: '1463044533909717074', label: 'FOYAY' }
    ],
    singleSelect: true,
    lockAfterSelect: false
  },
  {
    title: 'GAMING SYSTEMS',
    description: 'If you play videogames, which console(s) do you play on?',
    color: 0xFFA500,
    roles: [
      { id: '1463017870630981779', label: '💻 PC' },
      { id: '1463017911798202368', label: '❎ XBOX' },
      { id: '1463018307971190928', label: '⭕ PLAYSTATION' },
      { id: '1463017956903616668', label: '🕹️ NINTENDO' }
    ],
    singleSelect: false,
    lockAfterSelect: false
  },
  {
    title: 'GAMES',
    description: 'Which games do you own that you would like to play with others?',
    color: 0xFFA500,
    roles: [
      { id: '1463054662574932039', label: '🌎 HECKDIVER' },
      { id: '1463054757882101881', label: '🪂 COD NOOB' },
      { id: '1463055675100758183', label: '🆘 DAYZ SURVIVOR' }
    ],
    singleSelect: false,
    lockAfterSelect: false
  },
  {
    title: 'PICK YOUR COLOR',
    description: 'Choose how your name appears!',
    color: 0xFFFFFF,
    roles: [
      { id: '1463058233940901892', label: '🔴 RED' },
      { id: '1463058244921589770', label: '🟠 ORANGE' },
      { id: '1463058237996662950', label: '🟡 YELLOW' },
      { id: '1463058235748782256', label: '🟢 GREEN' },
      { id: '1463058251787669577', label: '🔵 BLUE' },
      { id: '1463058240307990548', label: '🟣 PURPLE' },
      { id: '1466296912758968485', label: '🎀 PINK' },
      { id: '1463058259266240734', label: '🟤 BROWN' }
    ],
    singleSelect: true,
    lockAfterSelect: false
  }
];

// track permanently locked users for male/female
const lockedMaleFemale = new Set();

// track per-user selected roles for grey/green display
const userSelections = {};

// 6️⃣ Slash handler — clear & repost
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'selfroles') return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admins only.', ephemeral: true });
  }

  await interaction.reply({ content: '♻️ Clearing and reposting self-roles…', ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const botMessages = messages.filter(m => m.author.id === client.user.id);
  for (const msg of botMessages.values()) {
    await msg.delete().catch(() => {});
  }

  // Intro embed
  const introEmbed = new EmbedBuilder()
    .setTitle('WELCOME TO #SELF-ROLES')
    .setDescription('**Choose roles to join groups, receive notifications, or change your name color. Click a button below to assign yourself a role!**')
    .setColor(0xFFFFFF);

  await interaction.channel.send({ embeds: [introEmbed] });

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
      // initial style grey
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

});

// 7️⃣ Button handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const roleId = interaction.customId;

  try {
    // handle Male/Female lock
    if (lockedMaleFemale.has(member.id)) {
      return interaction.reply({ content: 'You cannot change your gender role.', ephemeral: true });
    }

    // check if this button is Male/Female
    const maleFemaleIds = roleCategories[0].roles.map(r => r.id);
    if (maleFemaleIds.includes(roleId)) {
      // remove other gender role if exists
      for (const id of maleFemaleIds) {
        if (member.roles.cache.has(id)) await member.roles.remove(id);
      }
      await member.roles.add(roleId);
      lockedMaleFemale.add(member.id); // lock permanently
      // disable both buttons
      const message = interaction.message;
      const newRows = message.components.map(r => {
        const newRow = ActionRowBuilder.from(r);
        newRow.components = newRow.components.map(b => ButtonBuilder.from(b).setDisabled(true));
        return newRow;
      });
      await interaction.update({ components: newRows });
      return;
    }

    // determine category
    let category = roleCategories.find(c => c.roles.some(r => r.id === roleId));
    if (!category) return;

    // Single select (Pick your color, Foyer)
    if (category.singleSelect) {
      const previous = Object.entries(userSelections[member.id] || {}).find(([k,v]) => v === category.title);
      if (previous) {
        const oldRole = previous[0];
        await member.roles.remove(oldRole);
        delete userSelections[member.id][oldRole];
      }
      await member.roles.add(roleId);
      userSelections[member.id] = userSelections[member.id] || {};
      userSelections[member.id][roleId] = category.title;
    } else {
      // multi select: toggle role
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        if (userSelections[member.id]) delete userSelections[member.id][roleId];
      } else {
        await member.roles.add(roleId);
        userSelections[member.id] = userSelections[member.id] || {};
        userSelections[member.id][roleId] = category.title;
      }
    }

    // update buttons display
    const newRows = interaction.message.components.map(r => {
      const newRow = ActionRowBuilder.from(r);
      newRow.components = newRow.components.map(b => {
        const id = b.data.custom_id;
        const selected = member.roles.cache.has(id);
        let style = selected ? ButtonStyle.Success : ButtonStyle.Secondary;
        if (lockedMaleFemale.has(member.id) && maleFemaleIds.includes(id)) style = ButtonStyle.Secondary; // keep disabled already handled
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

// 8️⃣ Login
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(token);

