const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions
  ]
});

/* -------------------- SLASH COMMANDS -------------------- */

const pollCommand = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create a poll with emojis and multiple answers")
  .addStringOption(o =>
    o.setName("question")
      .setDescription("Poll question")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("options")
      .setDescription("Options separated by | (max 5)")
      .setRequired(true)
  )
  .addStringOption(o =>
    o.setName("emojis")
      .setDescription("Emojis separated by | (must match options)")
      .setRequired(true)
  );

const reregisterCommand = new SlashCommandBuilder()
  .setName("reregister")
  .setDescription("Re-register slash commands (admin only)");

const commands = [
  pollCommand.toJSON(),
  reregisterCommand.toJSON()
];

/* -------------------- REGISTER COMMANDS -------------------- */

async function registerSlashCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );
}

/* -------------------- BOT READY -------------------- */

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  await registerSlashCommands();
  console.log("✅ Slash commands registered");
});

/* -------------------- INTERACTIONS -------------------- */

client.on(Events.InteractionCreate, async interaction => {
  /* ---------- /poll ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === "poll") {
    const question = interaction.options.getString("question");
    const options = interaction.options.getString("options").split("|").map(o => o.trim());
    const emojis = interaction.options.getString("emojis").split("|").map(e => e.trim());

    if (options.length > 5)
      return interaction.reply({ content: "❌ Max 5 options.", ephemeral: true });

    if (options.length !== emojis.length)
      return interaction.reply({ content: "❌ Options and emojis must match.", ephemeral: true });

    const description = options
      .map((opt, i) => `## ${emojis[i]} ${opt}`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(question)
      .setDescription(description)
      .setFooter({ text: "You may vote for multiple options" });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("poll_confirm")
        .setLabel("Confirm")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("poll_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({
      embeds: [embed],
      components: [buttons],
      ephemeral: true
    });

    interaction.client.pollCache ??= new Map();
    interaction.client.pollCache.set(interaction.user.id, {
      embed,
      emojis
    });
  }

  /* ---------- BUTTONS ---------- */
  if (interaction.isButton()) {
    const data = interaction.client.pollCache?.get(interaction.user.id);
    if (!data) return interaction.reply({ content: "❌ Poll data expired.", ephemeral: true });

    if (interaction.customId === "poll_cancel") {
      interaction.client.pollCache.delete(interaction.user.id);
      return interaction.update({ content: "❌ Poll cancelled.", embeds: [], components: [] });
    }

    if (interaction.customId === "poll_confirm") {
      const msg = await interaction.channel.send({ embeds: [data.embed] });

      for (const emoji of data.emojis) {
        await msg.react(emoji);
      }

      interaction.client.pollCache.delete(interaction.user.id);
      await interaction.update({ content: "✅ Poll posted!", embeds: [], components: [] });
    }
  }

  /* ---------- /reregister ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === "reregister") {
    await registerSlashCommands();
    await interaction.reply({ content: "✅ Commands re-registered.", ephemeral: true });
  }
});

/* -------------------- LOGIN -------------------- */

client.login(process.env.TOKEN);
