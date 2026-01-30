const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  PermissionsBitField,
  REST,
  Routes
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// Environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Role IDs
const MEN_ROLE = "1319394099643809832";
const WOMEN_ROLE = "1463018695046725705";

const INTEREST_ROLES = {
  DEVOTIONALS: "1466294642139074763",
  CHURCH: "1466294700507140259",
  GAMING: "1463018476309577865",
};

const FOYER_ROLES = {
  FOYER: "1463044307274694840",
  FOYAY: "1463044533909717074",
};

const SYSTEM_ROLES = {
  PC: "1463017870630981779",
  XBOX: "1463017911798202368",
  PLAYSTATION: "1463018307971190928",
  NINTENDO: "1463017956903616668",
};

const GAME_ROLES = {
  HELLDIVER: "1463054662574932039",
  COD: "1463054757882101881",
  DAYZ: "1463055675100758183",
};

const COLOR_ROLES = {
  RED: "1463058233940901892",
  ORANGE: "1463058244921589770",
  YELLOW: "1463058237996662950",
  GREEN: "1463058235748782256",
  BLUE: "1463058251787669577",
  PURPLE: "1463058240307990548",
  PINK: "1466296912758968485",
  BROWN: "1463058259266240734",
};

const COLOR_ROLE_IDS = Object.values(COLOR_ROLES);

// Slash commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('selfroles').setDescription('Clear and repost self-role panels')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );
  console.log('✅ Slash commands registered');
})();

// Role categories
const roleCategories = [
  {
    title: 'MALE OR FEMALE',
    description: 'Choose your gender by selecting one of the buttons!',
    color: 0xFFFFFF,
    roles: [
      { id: MEN_ROLE, label: '♂️ MALE', style: ButtonStyle.Secondary },
      { id: WOMEN_ROLE, label: '♀️ FEMALE', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'WHAT ARE YOUR INTERESTS?',
    description: 'Select what you would like to be notified for!',
    color: 0x9702D4,
    roles: [
      { id: INTEREST_ROLES.DEVOTIONALS, label: '📖 DEVOTIONALS', style: ButtonStyle.Secondary },
      { id: INTEREST_ROLES.CHURCH, label: '⛪ CHURCH WITHOUT WALLS', style: ButtonStyle.Secondary },
      { id: INTEREST_ROLES.GAMING, label: '🎮 GAMING', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'FOYER VS FOYAY',
    description: 'How should this word be pronounced?',
    color: 0xFFFFFF,
    roles: [
      { id: FOYER_ROLES.FOYER, label: 'FOYER', style: ButtonStyle.Secondary },
      { id: FOYER_ROLES.FOYAY, label: 'FOYAY', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'GAMING SYSTEMS',
    description: 'If you play videogames, which console(s) do you play on?',
    color: 0xFFA500,
    roles: [
      { id: SYSTEM_ROLES.PC, label: '💻 PC', style: ButtonStyle.Secondary },
      { id: SYSTEM_ROLES.XBOX, label: '❎ XBOX', style: ButtonStyle.Secondary },
      { id: SYSTEM_ROLES.PLAYSTATION, label: '⭕ PLAYSTATION', style: ButtonStyle.Secondary },
      { id: SYSTEM_ROLES.NINTENDO, label: '🕹️ NINTENDO', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'GAMES',
    description: 'Which games do you own that you would like to play with others?',
    color: 0xFFA500,
    roles: [
      { id: GAME_ROLES.HELLDIVER, label: '🌎 HECKDIVER', style: ButtonStyle.Secondary },
      { id: GAME_ROLES.COD, label: '🪂 COD NOOB', style: ButtonStyle.Secondary },
      { id: GAME_ROLES.DAYZ, label: '🆘 DAYZ SURVIVOR', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'PICK YOUR COLOR',
    description: 'Choose how your name appears!',
    color: 0xFFFFFF,
    roles: [
      { id: COLOR_ROLES.RED, label: '🔴 RED', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.ORANGE, label: '🟠 ORANGE', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.YELLOW, label: '🟡 YELLOW', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.GREEN, label: '🟢 GREEN', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.BLUE, label: '🔵 BLUE', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.PURPLE, label: '🟣 PURPLE', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.PINK, label: '🎀 PINK', style: ButtonStyle.Secondary },
      { id: COLOR_ROLES.BROWN, label: '🟤 BROWN', style: ButtonStyle.Secondary }
    ]
  }
];

// Slash command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'selfroles') return;

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: 'Admins only.', ephemeral: true });
  }

  await interaction.reply({ content: '♻️ Clearing and reposting self-roles…', ephemeral: true });

  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const botMessages = messages.filter(m => m.author.id === client.user.id);
  for (const msg of botMessages.values()) await msg.delete().catch(() => {});

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

// Button handler with green flash effect
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const member = interaction.member;
  const roleId = interaction.customId;

  const multiSelect = [
    INTEREST_ROLES.DEVOTIONALS,
    INTEREST_ROLES.CHURCH,
    INTEREST_ROLES.GAMING,
    SYSTEM_ROLES.PC,
    SYSTEM_ROLES.XBOX,
    SYSTEM_ROLES.PLAYSTATION,
    SYSTEM_ROLES.NINTENDO,
    GAME_ROLES.HELLDIVER,
    GAME_ROLES.COD,
    GAME_ROLES.DAYZ
  ];

  const singleSelect = [
    ...COLOR_ROLE_IDS,
    FOYER_ROLES.FOYER,
    FOYER_ROLES.FOYAY
  ];

  try {
    // --- Male/Female: permanent lock, only selected button green ---
    if (roleId === MEN_ROLE || roleId === WOMEN_ROLE) {
      if (roleId === MEN_ROLE) {
        await member.roles.add(MEN_ROLE);
        await member.roles.remove(WOMEN_ROLE);
      } else {
        await member.roles.add(WOMEN_ROLE);
        await member.roles.remove(MEN_ROLE);
      }

      const updatedRows = interaction.message.components.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components = newRow.components.map(btn => {
          const button = ButtonBuilder.from(btn);
          if (button.data.custom_id === roleId) button.setStyle(ButtonStyle.Success);
          else button.setStyle(ButtonStyle.Secondary);
          button.setDisabled(true);
          return button;
        });
        return newRow;
      });

      await interaction.update({ components: updatedRows });
      return;
    }

    // --- Multi-select: toggle green/grey instantly ---
    if (multiSelect.includes(roleId)) {
      if (member.roles.cache.has(roleId)) await member.roles.remove(roleId);
      else await member.roles.add(roleId);

      const updatedRows = interaction.message.components.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components = newRow.components.map(btn => {
          const button = ButtonBuilder.from(btn);
          if (multiSelect.includes(button.data.custom_id)) {
            button.setStyle(member.roles.cache.has(button.data.custom_id) ? ButtonStyle.Success : ButtonStyle.Secondary);
          }
          return button;
        });
        return newRow;
      });

      await interaction.update({ components: updatedRows });
      return;
    }

    // --- Single-select: Foyer & Colors ---
    if (singleSelect.includes(roleId)) {
      const groupRoles = COLOR_ROLE_IDS.includes(roleId) ? COLOR_ROLE_IDS : Object.values(FOYER_ROLES);

      // Remove previous role
      for (const id of groupRoles) if (id !== roleId && member.roles.cache.has(id)) await member.roles.remove(id);
      if (!member.roles.cache.has(roleId)) await member.roles.add(roleId);

      const updatedRows = interaction.message.components.map(row => {
        const newRow = ActionRowBuilder.from(row);
        newRow.components = newRow.components.map(btn => {
          const button = ButtonBuilder.from(btn);
          if (groupRoles.includes(button.data.custom_id)) {
            button.setStyle(button.data.custom_id === roleId ? ButtonStyle.Success : ButtonStyle.Secondary);
          }
          return button;
        });
        return newRow;
      });

      await interaction.update({ components: updatedRows });
      return;
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Role update failed.', ephemeral: true });
  }
});

client.once('ready', () => console.log(`🤖 Logged in as ${client.user.tag}`));
client.login(token);
