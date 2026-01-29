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
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Sends a branded welcome message'),
  new SlashCommandBuilder()
    .setName('selfroles')
    .setDescription('Sends self-role messages with buttons')
].map(cmd => cmd.toJSON());

// 4️⃣ Register commands
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

// 5️⃣ Handle slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }

  if (interaction.commandName === 'welcome') {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('👋 Welcome!')
        .setDescription('Welcome to the server! We’re so happy to have you here 😄')
        .setColor(0xFF9900)
        .setFooter({ text: 'Destiny Church' })
      ]
    });
  }

  if (interaction.commandName === 'selfroles') {
    // Each category gets its own embed and button row

    // Gender
    const genderEmbed = new EmbedBuilder()
      .setTitle('Male or Female')
      .setDescription('♂️ Man, ♀️ Female')
      .setColor(0xFF9900);
    const genderRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('role_male').setLabel('♂️ Man').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('role_female').setLabel('♀️ Female').setStyle(ButtonStyle.Primary)
      );

    // Interests
    const interestEmbed = new EmbedBuilder()
      .setTitle('WHAT ARE YOUR INTERESTS?')
      .setDescription('📖 Devotionals, ⛪ Church Without Walls, 🎮 Gaming')
      .setColor(0xFFA500);
    const interestRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('role_devotionals').setLabel('📖 Devotionals').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_cwow').setLabel('⛪ Church Without Walls').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_gaming').setLabel('🎮 Gaming').setStyle(ButtonStyle.Secondary)
      );

    // Gaming Systems
    const gamingEmbed = new EmbedBuilder()
      .setTitle('GAMING SYSTEMS')
      .setDescription('💻 PC, ❎ Xbox, ⭕ Playstation, 🕹️ Nintendo')
      .setColor(0x00FF00);
    const gamingRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('role_pc').setLabel('💻 PC').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('role_xbox').setLabel('❎ Xbox').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('role_playstation').setLabel('⭕ Playstation').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('role_nintendo').setLabel('🕹️ Nintendo').setStyle(ButtonStyle.Success)
      );

    // FOYER vs FOYAY
    const foyerEmbed = new EmbedBuilder()
      .setTitle('FOYER VS. FOYAY')
      .setDescription('FoYER, FoYAY')
      .setColor(0x0000FF);
    const foyerRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('role_foyer').setLabel('FoYER').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('role_foyay').setLabel('FoYAY').setStyle(ButtonStyle.Primary)
      );

    // Color
    const colorEmbed = new EmbedBuilder()
      .setTitle('PICK YOUR COLOR')
      .setDescription('Red, Orange, Yellow, Green, Blue, Purple, Pink, Brown')
      .setColor(0xFF69B4);
    const colorRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('color_red').setLabel('Red').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('color_orange').setLabel('Orange').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('color_yellow').setLabel('Yellow').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('color_green').setLabel('Green').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('color_blue').setLabel('Blue').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('color_purple').setLabel('Purple').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('color_pink').setLabel('Pink').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('color_brown').setLabel('Brown').setStyle(ButtonStyle.Secondary)
      );

    // Send each embed as a separate message
    await interaction.reply({ embeds: [genderEmbed], components: [genderRow], ephemeral: true });
    await interaction.followUp({ embeds: [interestEmbed], components: [interestRow], ephemeral: true });
    await interaction.followUp({ embeds: [gamingEmbed], components: [gamingRow], ephemeral: true });
    await interaction.followUp({ embeds: [foyerEmbed], components: [foyerRow], ephemeral: true });
    await interaction.followUp({ embeds: [colorEmbed], components: [colorRow], ephemeral: true });
  }
});

// 6️⃣ Handle button interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const roleMap = {
    role_male: 'ROLE_ID_MALE',
    role_female: 'ROLE_ID_FEMALE',
    role_devotionals: 'ROLE_ID_DEVOTIONALS',
    role_cwow: 'ROLE_ID_CHURCH_WITHOUT_WALLS',
    role_gaming: 'ROLE_ID_GAMING',
    role_pc: 'ROLE_ID_PC',
    role_xbox: 'ROLE_ID_XBOX',
    role_playstation: 'ROLE_ID_PLAYSTATION',
    role_nintendo: 'ROLE_ID_NINTENDO',
    role_foyer: 'ROLE_ID_FOYER',
    role_foyay: 'ROLE_ID_FOYAY',
    color_red: 'ROLE_ID_RED',
    color_orange: 'ROLE_ID_ORANGE',
    color_yellow: 'ROLE_ID_YELLOW',
    color_green: 'ROLE_ID_GREEN',
    color_blue: 'ROLE_ID_BLUE',
    color_purple: 'ROLE_ID_PURPLE',
    color_pink: 'ROLE_ID_PINK',
    color_brown: 'ROLE_ID_BROWN'
  };

  const roleId = roleMap[interaction.customId];
  if (!roleId) return;

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

// 7️⃣ Log bot in
client.once('ready', () => console.log(`Logged in as ${client.user.tag}`));
client.login(token);
