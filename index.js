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

// 5️⃣ Color exclusivity
const COLOR_ROLE_IDS = [
  '1463058233940901892', // Red
  '1463058244921589770', // Orange
  '1463058237996662950', // Yellow
  '1463058235748782256', // Green
  '1463058251787669577', // Blue
  '1463058240307990548', // Purple
  '1466296912758968485', // Pink
  '1463058259266240734'  // Brown
];

// 6️⃣ Role categories
const roleCategories = [
  {
    title: 'MALE OR FEMALE',
    description: 'Choose your gender by selecting one of the buttons!',
    color: 0xFFFFFF,
    roles: [
      { id: '1319394099643809832', label: '♂️ MALE', style: ButtonStyle.Primary, singleSelect: true },
      { id: '1463018695046725705', label: '♀️ FEMALE', style: ButtonStyle.Danger, singleSelect: true }
    ]
  },
  {
    title: 'WHAT ARE YOUR INTERESTS?',
    description: 'Select what you would like to be notified for!',
    color: 0x9702D4,
    roles: [
      { id: '1466294642139074763', label: '📖 DEVOTIONALS', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1466294700507140259', label: '⛪ CHURCH WITHOUT WALLS', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1463018476309577865', label: '🎮 GAMING', style: ButtonStyle.Secondary, multiSelect: true }
    ]
  },
  {
    title: 'FOYER VS. FOYAY',
    description: 'How should this word be pronounced?',
    color: 0xFFFFFF,
    roles: [
      { id: '1463044307274694840', label: 'FOYER', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463044533909717074', label: 'FOYAY', style: ButtonStyle.Secondary, singleSelect: true }
    ]
  },
  {
    title: 'GAMING SYSTEMS',
    description: 'If you play videogames, which console(s) do you play on?',
    color: 0xFFA500,
    roles: [
      { id: '1463017870630981779', label: '💻 PC', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1463017911798202368', label: '❎ XBOX', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1463018307971190928', label: '⭕ PLAYSTATION', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1463017956903616668', label: '🕹️ NINTENDO', style: ButtonStyle.Secondary, multiSelect: true }
    ]
  },
  {
    title: 'GAMES',
    description: 'Which games do you own that you would like to play with others?',
    color: 0xFFA500,
    roles: [
      { id: '1463054662574932039', label: '🌎 HECKDIVER', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1463054757882101881', label: '🪂 COD NOOB', style: ButtonStyle.Secondary, multiSelect: true },
      { id: '1463055675100758183', label: '🆘 DAYZ SURVIVOR', style: ButtonStyle.Secondary, multiSelect: true }
    ]
  },
  {
    title: 'PICK YOUR COLOR',
    description: 'Choose how your name appears!',
    color: 0xFFFFFF,
    roles: [
      { id: '1463058233940901892', label: '🔴 RED', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463058244921589770', label: '🟠 ORANGE', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463058237996662950', label: '🟡 YELLOW', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463058235748782256', label: '🟢 GREEN', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463058251787669577', label: '🔵 BLUE', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463058240307990548', label: '🟣 PURPLE', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1466296912758968485', label: '🎀 PINK', style: ButtonStyle.Secondary, singleSelect: true },
      { id: '1463058259266240734', label: '🟤 BROWN', style: ButtonStyle.Secondary, singleSelect: true }
    ]
  }
];

// 7️⃣ Slash handler — CLEAR & REPOST
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'selfroles') return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admins only.', ephemeral: true });
  }

  await interaction.reply({ content: '♻️ Clearing and reposting self-roles…', ephemeral: true });

  // Delete bot messages in channel
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const botMessages = messages.filter(m => m.author.id === client.user.id);
  for (const msg of botMessages.values()) {
    await msg.delete().catch(() => {});
  }

  // ✅ Intro embed
  const introEmbed = new EmbedBuilder()
    .setTitle('WELCOME TO #SELF-ROLES')
    .setDescription(
      '**Choose roles to join groups, receive notifications, or change your name color. Click a button below to assign yourself a role!**'
    )
    .setColor(0xFFFFFF);

  await interaction.channel.send({ embeds: [introEmbed] });

  // Send all role embeds
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
          .setStyle(role.style)
      );
    }

    if (row.components.length) rows.push(row);

    await interaction.channel.send({ embeds: [embed], components: rows });
  }

  await interaction.followUp({ content: '✅ Self-roles reposted!', ephemeral: true });
});

// 8️⃣ Button handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const member = interaction.member;
  const roleId = interaction.customId;

  try {
    // Single-select sections (Color, Foyer, Male/Female)
    let isSingle = false;
    for (const category of roleCategories) {
      const found = category.roles.find(r => r.id === roleId && r.singleSelect);
      if (found) {
        isSingle = true;
        // Remove other roles in the category
        for (const r of category.roles) {
          if (r.id !== roleId && member.roles.cache.has(r.id)) {
            await member.roles.remove(r.id);
          }
        }
      }
    }

    // Add/remove role
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
    } else {
      await member.roles.add(roleId);
    }

    // Update buttons (selected = green)
    const newRows = interaction.message.components.map(row => {
      const newRow = ActionRowBuilder.from(row);
      newRow.components = newRow.components.map(btn => {
        const newBtn = ButtonBuilder.from(btn);
        const hasRole = member.roles.cache.has(btn.customId);

        // Male/Female lock
        if (roleCategories[0].roles.some(r => r.id === btn.customId) && member.roles.cache.has(btn.customId)) {
          newBtn.setDisabled(true); // lock permanently
        } else if (hasRole) {
          newBtn.setStyle(ButtonStyle.Success); // selected
        } else {
          newBtn.setStyle(ButtonStyle.Secondary); // default
          newBtn.setDisabled(false);
        }

        return newBtn;
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
client.once('ready', () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(token);

