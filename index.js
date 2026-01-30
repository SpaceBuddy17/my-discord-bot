const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

/* =========================
   ROLE IDS
========================= */

// Gender
const MEN_ROLE = "1319394099643809832";
const WOMEN_ROLE = "1463018695046725705";

// Interests
const INTEREST_ROLES = {
  DEVOTIONALS: "1466294642139074763",
  CHURCH: "1466294700507140259",
  GAMING: "1463018476309577865",
};

// Foyer
const FOYER_ROLES = {
  FOYER: "1463044307274694840",
  FOYAY: "1463044533909717074",
};

// Gaming Systems
const SYSTEM_ROLES = {
  PC: "1463017870630981779",
  XBOX: "1463017911798202368",
  PLAYSTATION: "1463018307971190928",
  NINTENDO: "1463017956903616668",
};

// Games
const GAME_ROLES = {
  HELLDIVER: "1463054662574932039",
  COD: "1463054757882101881",
  DAYZ: "1463055675100758183",
};

// Colors (single select)
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

/* =========================
   SLASH COMMAND
========================= */

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "selfroles") return;

  const channel = interaction.channel;

  /* -------- INTRO EMBED -------- */
  const introEmbed = new EmbedBuilder()
    .setColor("White")
    .setDescription(
      "**Welcome to the #self-roles channel! Here, you can choose roles to join groups, sign up for notifications, or change your name color! Just click a button and you will be assigned the corresponding role.**"
    );

  /* -------- MALE / FEMALE -------- */
  const genderEmbed = new EmbedBuilder()
    .setTitle("MALE OR FEMALE")
    .setColor("White")
    .setDescription("Choose your gender by selecting one of the buttons!");

  const genderRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("gender_male")
      .setLabel("♂️ MALE")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("gender_female")
      .setLabel("♀️ FEMALE")
      .setStyle(ButtonStyle.Danger)
  );

  /* -------- INTERESTS -------- */
  const interestsEmbed = new EmbedBuilder()
    .setTitle("WHAT ARE YOUR INTERESTS?")
    .setColor("#9702D4")
    .setDescription("Select what you would like to be notified for!");

  const interestsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("interest_devotionals")
      .setLabel("📖 DEVOTIONALS")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("interest_church")
      .setLabel("⛪ CHURCH WITHOUT WALLS")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("interest_gaming")
      .setLabel("🎮 GAMING")
      .setStyle(ButtonStyle.Secondary)
  );

  /* -------- FOYER -------- */
  const foyerEmbed = new EmbedBuilder()
    .setTitle("FOYER VS FOYAY")
    .setColor("White")
    .setDescription("How should this word be pronounced?");

  const foyerRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("foyer_foyer")
      .setLabel("FOYER")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("foyer_foyay")
      .setLabel("FOYAY")
      .setStyle(ButtonStyle.Secondary)
  );

  /* -------- SYSTEMS -------- */
  const systemsEmbed = new EmbedBuilder()
    .setTitle("GAMING SYSTEMS")
    .setColor("Orange")
    .setDescription(
      "If you play videogames, which console(s) do you play on?"
    );

  const systemsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("system_pc")
      .setLabel("💻 PC")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("system_xbox")
      .setLabel("❎ XBOX")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("system_playstation")
      .setLabel("⭕ PLAYSTATION")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("system_nintendo")
      .setLabel("🕹️ NINTENDO")
      .setStyle(ButtonStyle.Danger)
  );

  /* -------- GAMES -------- */
  const gamesEmbed = new EmbedBuilder()
    .setTitle("GAMES")
    .setColor("Orange")
    .setDescription(
      "Which games do you own that you would like to play with others?"
    );

  const gamesRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("game_helldiver")
      .setLabel("🌎 HELLDIVER")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("game_cod")
      .setLabel("🪂 COD NOOB")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("game_dayz")
      .setLabel("🆘 DAYZ SURVIVOR")
      .setStyle(ButtonStyle.Secondary)
  );

  /* -------- COLORS -------- */
  const colorsEmbed = new EmbedBuilder()
    .setTitle("PICK YOUR COLOR")
    .setColor("White");

  const colorsRow1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("color_red")
      .setLabel("🔴 RED")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("color_orange")
      .setLabel("🟠 ORANGE")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("color_yellow")
      .setLabel("🟡 YELLOW")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("color_green")
      .setLabel("🟢 GREEN")
      .setStyle(ButtonStyle.Secondary)
  );

  const colorsRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("color_blue")
      .setLabel("🔵 BLUE")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("color_purple")
      .setLabel("🟣 PURPLE")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("color_pink")
      .setLabel("🎀 PINK")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("color_brown")
      .setLabel("🟤 BROWN")
      .setStyle(ButtonStyle.Secondary)
  );

  /* -------- SEND EVERYTHING -------- */
  await channel.send({ embeds: [introEmbed] });
  await channel.send({ embeds: [genderEmbed], components: [genderRow] });
  await channel.send({ embeds: [interestsEmbed], components: [interestsRow] });
  await channel.send({ embeds: [foyerEmbed], components: [foyerRow] });
  await channel.send({ embeds: [systemsEmbed], components: [systemsRow] });
  await channel.send({ embeds: [gamesEmbed], components: [gamesRow] });
  await channel.send({
    embeds: [colorsEmbed],
    components: [colorsRow1, colorsRow2],
  });

  await interaction.reply({
    content: "✅ Self-roles have been posted!",
    ephemeral: true,
  });
});

/* =========================
   BUTTON HANDLER
========================= */

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const member = interaction.member;

  const addRemove = async (roleId) => {
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
    } else {
      await member.roles.add(roleId);
    }
  };

  /* Gender (single) */
  if (interaction.customId === "gender_male") {
    await member.roles.remove(WOMEN_ROLE);
    await member.roles.add(MEN_ROLE);
  }

  if (interaction.customId === "gender_female") {
    await member.roles.remove(MEN_ROLE);
    await member.roles.add(WOMEN_ROLE);
  }

  /* Interests */
  if (interaction.customId === "interest_devotionals")
    await addRemove(INTEREST_ROLES.DEVOTIONALS);
  if (interaction.customId === "interest_church")
    await addRemove(INTEREST_ROLES.CHURCH);
  if (interaction.customId === "interest_gaming")
    await addRemove(INTEREST_ROLES.GAMING);

  /* Systems */
  if (interaction.customId === "system_pc")
    await addRemove(SYSTEM_ROLES.PC);
  if (interaction.customId === "system_xbox")
    await addRemove(SYSTEM_ROLES.XBOX);
  if (interaction.customId === "system_playstation")
    await addRemove(SYSTEM_ROLES.PLAYSTATION);
  if (interaction.customId === "system_nintendo")
    await addRemove(SYSTEM_ROLES.NINTENDO);

  /* Games */
  if (interaction.customId === "game_helldiver")
    await addRemove(GAME_ROLES.HELLDIVER);
  if (interaction.customId === "game_cod")
    await addRemove(GAME_ROLES.COD);
  if (interaction.customId === "game_dayz")
    await addRemove(GAME_ROLES.DAYZ);

  /* Colors (single select) */
  if (interaction.customId.startsWith("color_")) {
    for (const role of Object.values(COLOR_ROLES)) {
      if (member.roles.cache.has(role)) {
        await member.roles.remove(role);
      }
    }
    const colorKey = interaction.customId.split("_")[1].toUpperCase();
    await member.roles.add(COLOR_ROLES[colorKey]);
  }

  await interaction.reply({ content: "✅ Role updated!", ephemeral: true });
});

/* ========================= */

client.login(process.env.DISCORD_TOKEN);
