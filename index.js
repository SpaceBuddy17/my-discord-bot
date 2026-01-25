require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

/* ===================== CLIENT ===================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* ===================== ENV ===================== */

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

/* ===================== SLASH COMMANDS ===================== */

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Sends a branded welcome message'),

  new SlashCommandBuilder()
    .setName('selfroles') // renamed here
    .setDescription('Posts the role selection panel')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error(error);
  }
})();

/* ===================== ROLE CONFIG ===================== */

const roleMap = {
  role_man: 'Man',
  role_woman: 'Woman',

  color_red: 'Red',
  color_orange: 'Orange',
  color_yellow: 'Yellow',
  color_green: 'Green',
  color_blue: 'Blue',
  color_purple: 'Purple',
  color_pink: 'Pink',
  color_brown: 'Brown',

  role_foyer: 'FoYER',
  role_foyay: 'FoYAY',

  role_gaming: 'Gaming',
  role_pc: 'PC',
  role_xbox: 'Xbox',
  role_playstation: 'Playstation',
  role_nintendo: 'Nintendo',

  role_helldiver: 'Helldiver',
  role_cod: 'COD Noob',
  role_dayz: 'DayZ Survivor'
};

const exclusiveGroups = {
  gender: ['Man', 'Woman'],
  colors: ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Brown'],
  foyer: ['FoYER', 'FoYAY']
};

const gamingSystems = [
  'Gaming',
  'PC',
  'Xbox',
  'Playstation',
  'Nintendo'
];

const games = [
  'Helldiver',
  'COD Noob',
  'DayZ Survivor'
];

/* ===================== SEND ROLE EMBEDS ===================== */

async function sendRoleEmbeds(channel) {
  // 👤 Gender
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('👤 Man or Woman')
        .setDescription('Choose one')
        .setColor(0x5865F2)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_man').setLabel('Man').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('role_woman').setLabel('Woman').setStyle(ButtonStyle.Primary)
      )
    ]
  });

  // 🎨 Colors
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🎨 Name Color')
        .setDescription('Pick **one** color')
        .setColor(0xEB459E)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('color_red').setLabel('Red').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('color_orange').setLabel('Orange').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('color_yellow').setLabel('Yellow').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('color_green').setLabel('Green').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('color_blue').setLabel('Blue').setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('color_purple').setLabel('Purple').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('color_pink').setLabel('Pink').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('color_brown').setLabel('Brown').setStyle(ButtonStyle.Secondary)
      )
    ]
  });

  // 🔥 FOYER
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🔥 FOYER vs FOYAY')
        .setDescription('Choose wisely')
        .setColor(0xED4245)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_foyer').setLabel('FoYER').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('role_foyay').setLabel('FoYAY').setStyle(ButtonStyle.Danger)
      )
    ]
  });

  // 🎮 Systems
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🎮 Gaming Systems')
        .setDescription('Pick what you play on')
        .setColor(0x57F287)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_gaming').setLabel('Gaming').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_pc').setLabel('PC').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_xbox').setLabel('Xbox').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_playstation').setLabel('Playstation').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_nintendo').setLabel('Nintendo').setStyle(ButtonStyle.Secondary)
      )
    ]
  });

  // 🕹️ Games
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('🕹️ Games')
        .setDescription('Unlocked after choosing a Gaming System')
        .setColor(0xFEE75C)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_helldiver').setLabel('Helldiver').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('role_cod').setLabel('COD Noob').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('role_dayz').setLabel('DayZ Survivor').setStyle(ButtonStyle.Success)
      )
    ]
  });
}

/* ===================== INTERACTIONS ===================== */

client.on('interactionCreate', async interaction => {

  /* ---- SLASH COMMANDS ---- */
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'ping') {
      return interaction.reply('Pong!');
    }

    if (interaction.commandName === 'welcome') {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('👋 Welcome!')
            .setDescription('Welcome to the server! We’re happy to have you here 😄')
            .setColor(0xFF9900)
            .setFooter({ text: 'Your Brand Name' })
        ]
      });
    }

    if (interaction.commandName === 'selfroles') { // renamed here
      await interaction.reply({ content: '📌 Posting role panel…', ephemeral: true });
      await sendRoleEmbeds(interaction.channel);
      return;
    }
  }

  /* ---- BUTTON ROLES ---- */
  if (!interaction.isButton()) return;

  const roleName = roleMap[interaction.customId];
  if (!roleName) return;

  const role = interaction.guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    return interaction.reply({ content: 'Role not found.', ephemeral: true });
  }

  const member = interaction.member;

  // Lock games until system chosen
  if (games.includes(roleName)) {
    const hasSystem = member.roles.cache.some(r =>
      gamingSystems.includes(r.name)
    );
    if (!hasSystem) {
      return interaction.reply({
        content: '🎮 Choose a **Gaming System** first.',
        ephemeral: true
      });
    }
  }

  // Handle exclusive roles
  for (const group of Object.values(exclusiveGroups)) {
    if (group.includes(roleName)) {
      const toRemove = member.roles.cache.filter(r => group.includes(r.name));
      for (const r of toRemove.values()) {
        await member.roles.remove(r);
      }
    }
  }

  // Toggle role
  if (member.roles.cache.has(role.id)) {
    await member.roles.remove(role);
    await interaction.reply({ content: `❌ Removed **${roleName}**`, ephemeral: true });
  } else {
    await member.roles.add(role);
    await interaction.reply({ content: `✅ Added **${roleName}**`, ephemeral: true });
  }
});

/* ===================== READY ===================== */

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(token);

