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

// 1️⃣ Create bot client
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] 
});

// 2️⃣ Config from Railway environment variables
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// 3️⃣ Define slash commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  new SlashCommandBuilder().setName('welcome').setDescription('Sends a branded welcome message'),
  new SlashCommandBuilder().setName('selfroles').setDescription('Sends self-role messages with buttons')
].map(cmd => cmd.toJSON());

// 4️⃣ Register commands with Discord
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('🔁 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error(error);
  }
})();

// 5️⃣ Define self-role categories
const roleCategories = [
  {
    title: 'MALE OR FEMALE',
    description: 'Choose your gender by selecting one of the buttons!',
    color: 0xFFFFFF,
    roles: [
      { id: '1319394099643809832', label: '♂️ MALE', style: ButtonStyle.Primary },
      { id: '1463018695046725705', label: '♀️ FEMALE', style: ButtonStyle.Danger }
    ]
  },
  {
    title: 'WHAT ARE YOUR INTERESTS?',
    description: 'Select what you would like to be notified for!',
    color: 0x9702D4,
    roles: [
      { id: '1466294642139074763', label: '📖 DEVOTIONALS', style: ButtonStyle.Secondary },
      { id: '1466294700507140259', label: '⛪ CHURCH WITHOUT WALLS', style: ButtonStyle.Secondary },
      { id: '1463018476309577865', label: '🎮 GAMING', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'GAMING SYSTEMS',
    description: 'If you play videogames, which console(s) do you play on?',
    color: 0xFFA500,
    roles: [
      { id: '1463017870630981779', label: '💻 PC', style: ButtonStyle.Primary },
      { id: '1463017911798202368', label: '❎ XBOX', style: ButtonStyle.Success },
      { id: '1463018307971190928', label: '⭕ PLAYSTATION', style: ButtonStyle.Secondary },
      { id: '1463017956903616668', label: '🕹️ NINTENDO', style: ButtonStyle.Danger }
    ]
  },
  {
    title: 'FOYER VS. FOYAY',
    description: 'How should this word be pronounced?',
    color: 0xFFFFFF,
    roles: [
      { id: '1463044307274694840', label: 'FOYER', style: ButtonStyle.Secondary },
      { id: '1463044533909717074', label: 'FOYAY', style: ButtonStyle.Secondary }
    ]
  },
  {
    title: 'PICK YOUR COLOR',
    description: 'Red, Orange, Yellow, Green, Blue, Purple, Pink, Brown',
    color: 0xFF69B4,
    roles: [
      { id: '1463058233940901892', label: 'Red', style: ButtonStyle.Danger },
      { id: '1463058244921589770', label: 'Orange', style: ButtonStyle.Primary },
      { id: '1463058237996662950', label: 'Yellow', style: ButtonStyle.Secondary },
      { id: '1463058235748782256', label: 'Green', style: ButtonStyle.Success },
      { id: '1463058251787669577', label: 'Blue', style: ButtonStyle.Primary },
      { id: '1463058240307990548', label: 'Purple', style: ButtonStyle.Secondary },
      { id: '1466296912758968485', label: 'Pink', style: ButtonStyle.Primary },
      { id: '1463058235748782256', label: 'Brown', style: ButtonStyle.Secondary }
    ]
  }
];

// 6️⃣ Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
    return;
  }

  if (interaction.commandName === 'welcome') {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('👋 Welcome!')
          .setDescription('Welcome to the server! We’re so happy to have you here 😄')
          .setColor(0xFF9900)
          .setFooter({ text: 'Destiny Church' })
      ]
    });
    return;
  }

  if (interaction.commandName === 'selfroles') {
    // Top informational embed
    const infoEmbed = new EmbedBuilder()
      .setTitle('**Welcome to the #self-roles channel!**')
      .setDescription(
        'Here, you can choose roles to join groups, sign up for notifications, or change your name color! Just click a button and you will be assigned the corresponding role.'
      )
      .setColor(0x00FFFF); // cyan for info
    await interaction.reply({ embeds: [infoEmbed], ephemeral: true });

    // Send role embeds
    for (const category of roleCategories) {
      const embed = new EmbedBuilder()
        .setTitle(category.title)
        .setDescription(category.description)
        .setColor(category.color);

      const row = new ActionRowBuilder();
      for (const role of category.roles) {
        const button = new ButtonBuilder()
          .setCustomId(role.id)
          .setLabel(role.label)
          .setStyle(role.style);

        row.addComponents(button);
      }

      await interaction.followUp({ embeds: [embed], components: [row], ephemeral: true });
    }
  }
});

// 7️⃣ Handle button interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const roleId = interaction.customId;
  try {
    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      await interaction.reply({ content: 'Role removed!', ephemeral: true });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({ content: 'Role added!', ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'Failed to assign role.', ephemeral: true });
  }
});

// 8️⃣ Log bot in
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(token);
