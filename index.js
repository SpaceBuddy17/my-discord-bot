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
  );

// options + emojis (1–5)
for (let i = 1; i <= 5; i++) {
  pollCommand
    .addStringOption(o =>
      o.setName(`option${i}`)
        .setDescription(`Option ${i}`)
        .setRequired(i <= 2) // require at least 2 options
    )
    .addStringOption(o =>
      o.setName(`emoji${i}`)
        .setDescription(`Emoji for option ${i}`)
        .setRequired(i <= 2)
    );
}

const reregisterCommand = new SlashCommandBuilder()
  .setName("reregister")
  .setDescription("Re-register slash commands");

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

    const options = [];
    const emojis = [];

    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      const emo = interaction.options.getString(`emoji${i}`);

      if (opt && emo) {
        options.push(opt);
        emojis.push(emo);
      }
    }

    if (options.length < 2)
      return interaction.reply({
        content: "❌ You need at least 2 options.",
        ephemeral: true
      });

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
    if (!data)
      return interaction.reply({ content: "❌ Poll expired.", ephemeral: true });

    if (interaction.customId === "poll_cancel") {
      interaction.client.pollCache.delete(interaction.user.id);
      return interaction.update({
        content: "❌ Poll cancelled.",
        embeds: [],
        components: []
      });
    }

    if (interaction.customId === "poll_confirm") {
      const msg = await interaction.channel.send({ embeds: [data.embed] });

      for (const emoji of data.emojis) {
        await msg.react(emoji);
      }

      interaction.client.pollCache.delete(interaction.user.id);
      await interaction.update({
        content: "✅ Poll posted!",
        embeds: [],
        components: []
      });
    }
  }

  /* ---------- /reregister ---------- */
  if (interaction.isChatInputCommand() && interaction.commandName === "reregister") {
    await registerSlashCommands();
    await interaction.reply({
      content: "✅ Commands re-registered.",
      ephemeral: true
    });
  }
});

/* -------------------- LOGIN -------------------- */

client.login(process.env.TOKEN);
