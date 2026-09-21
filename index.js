const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  AuditLogEvent
} = require("discord.js");

// =======================
// AYARLAR
// =======================

const TOKEN = process.env.TOKEN;

const TICKET_YETKILI = "1551602216547389461";
const GUARD_ROLE = "1551602654944170115";
const LOG_CHANNEL = "1551603289186111598";

const TICKET_CATEGORY = "1551603429653225573";
const TICKET_PANEL_CHANNEL = "1519420528375365738";

const MOD_ROLE = "1551604307583828098";
const DUYURU_ROLE = "1551605317484282110";
const DUYURU_CHANNEL = "1551605542818943088";

// =======================
// CLIENT
// =======================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// =======================
// LOG
// =======================

async function log(guild, title, description) {
  try {
    const channel = guild.channels.cache.get(LOG_CHANNEL);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("Blue")
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch {}
}

// =======================
// YARDIMCI
// =======================

function hasRole(member, roleId) {
  return member.roles.cache.has(roleId);
}

function parseDuration(text) {
  if (!text) return null;

  const match = text.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const values = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * values[unit];
}

function cleanName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

// =======================
// BOT HAZIR
// =======================

client.once("ready", async () => {
  console.log(`${client.user.tag} aktif!`);

  client.user.setPresence({
    activities: [{ name: "!komutlar | Moderasyon" }],
    status: "online"
  });
});

// =======================
// BOT KORUMA
// =======================

client.on("guildMemberAdd", async member => {
  if (!member.user.bot) return;

  try {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const logs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.BotAdd,
      limit: 5
    });

    const entry = logs.entries.find(
      e =>
        e.target &&
        e.target.id === member.id &&
        Date.now() - e.createdTimestamp < 15000
    );

    if (!entry) return;

    const inviter = await member.guild.members
      .fetch(entry.executor.id)
      .catch(() => null);

    if (!inviter) return;

    if (!hasRole(inviter, GUARD_ROLE)) {
      await member.kick("İzinsiz bot ekleme").catch(() => {});

      await log(
        member.guild,
        "🛡️ Bot Koruması",
        `${inviter} izinsiz bot ekledi.\nBot: ${member.user.tag}\nİşlem: Bot atıldı.`
      );

      await inviter.kick("İzinsiz bot ekleme").catch(() => {});
    }
  } catch (err) {
    console.log("Bot koruma hatası:", err.message);
  }
});

// =======================
// MESAJLAR
// =======================

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const args = message.content.trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  const member = message.member;

  // =======================
  // KOMUTLAR
  // =======================

  if (command === "!komutlar") {
    const embed = new EmbedBuilder()
      .setTitle("📚 Moderasyon Komutları")
      .setDescription(
        [
          "**Moderasyon**",
          "`!ban @kişi 10m` — Kullanıcıyı yasaklar",
          "`!kick @kişi` — Kullanıcıyı atar",
          "`!warn @kişi sebep` — Uyarı verir",
          "`!clear 10` — Mesajları siler",
          "`!timeout @kişi 10m` — Timeout verir",
          "",
          "**Rol**",
          "`!rolver @kişi @rol` — Rol verir",
          "`!hra @rol` — Herkesten rolü alır",
          "`!hrv @rol` — Herkese rol verir",
          "",
          "**Ticket**",
          "`!ticketpanel` — Ticket paneli gönderir",
          "",
          "**Duyuru**",
          "`!duyuru` — Aktif kullanıcılara DM duyurusu",
          "",
          "**Sistem**",
          "🛡️ İzinsiz bot ekleme koruması",
          "📋 Log sistemi"
        ].join("\n")
      )
      .setColor("Blue");

    return message.channel.send({ embeds: [embed] });
  }

  // =======================
  // MOD YETKİ
  // =======================

  const isMod =
    hasRole(member, MOD_ROLE) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator);

  // =======================
  // KICK
  // =======================

  if (command === "!kick") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const target = message.mentions.members.first();
    if (!target)
      return message.reply("❌ Bir kullanıcı etiketle.");

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";

    await target.kick(reason).catch(() => {
      return message.reply("❌ Bu kullanıcıyı atamıyorum.");
    });

    await message.reply(`✅ ${target.user.tag} sunucudan atıldı.`);
    await log(
      message.guild,
      "👢 Kick",
      `${message.author} → ${target.user.tag}\nSebep: ${reason}`
    );
  }

  // =======================
  // BAN
  // =======================

  if (command === "!ban") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const target = message.mentions.members.first();
    if (!target)
      return message.reply("❌ Bir kullanıcı etiketle.");

    const duration = parseDuration(args[1]);
    const reason = args.slice(duration ? 2 : 1).join(" ") || "Sebep belirtilmedi.";

    await target.ban({ reason }).catch(() => {
      return message.reply("❌ Kullanıcı banlanamadı.");
    });

    await message.reply(`🔨 ${target.user.tag} banlandı.`);

    await log(
      message.guild,
      "🔨 Ban",
      `${message.author} → ${target.user.tag}\nSebep: ${reason}`
    );

    if (duration) {
      setTimeout(async () => {
        try {
          await message.guild.bans.remove(target.id, "Süreli ban sona erdi");
        } catch {}
      }, duration);
    }
  }

  // =======================
  // WARN
  // =======================

  if (command === "!warn") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const target = message.mentions.members.first();
    if (!target)
      return message.reply("❌ Bir kullanıcı etiketle.");

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi.";

    await message.reply(
      `⚠️ ${target.user.tag} uyarıldı.\nSebep: ${reason}`
    );

    await log(
      message.guild,
      "⚠️ Uyarı",
      `${message.author} → ${target.user.tag}\nSebep: ${reason}`
    );
  }

  // =======================
  // CLEAR
  // =======================

  if (command === "!clear") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const amount = Number(args[0]);

    if (!amount || amount < 1 || amount > 100)
      return message.reply("❌ 1-100 arasında sayı gir.");

    await message.channel.bulkDelete(amount, true);

    const msg = await message.channel.send(
      `🧹 ${amount} mesaj silindi.`
    );

    setTimeout(() => msg.delete().catch(() => {}), 3000);
  }

  // =======================
  // TIMEOUT
  // =======================

  if (command === "!timeout") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const target = message.mentions.members.first();
    const duration = parseDuration(args[1]);

    if (!target || !duration)
      return message.reply("❌ Kullanım: `!timeout @kişi 10m`");

    await target.timeout(duration, "Moderasyon").catch(() => {
      return message.reply("❌ Timeout verilemedi.");
    });

    await message.reply(
      `⏱️ ${target.user.tag} ${args[1]} süreyle timeout aldı.`
    );

    await log(
      message.guild,
      "⏱️ Timeout",
      `${message.author} → ${target.user.tag}\nSüre: ${args[1]}`
    );
  }

  // =======================
  // ROLVER
  // =======================

  if (command === "!rolver") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const target = message.mentions.members.first();
    const role = message.mentions.roles.first();

    if (!target || !role)
      return message.reply("❌ Kullanım: `!rolver @kişi @rol`");

    await target.roles.add(role).catch(() => {
      return message.reply("❌ Rol verilemedi.");
    });

    await message.reply(
      `✅ ${target.user.tag} kullanıcısına ${role} verildi.`
    );

    await log(
      message.guild,
      "🎭 Rol Verildi",
      `${message.author} → ${target.user.tag}\nRol: ${role}`
    );
  }

  // =======================
  // HRA
  // =======================

  if (command === "!hra") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const role = message.mentions.roles.first();
    if (!role) return message.reply("❌ Bir rol etiketle.");

    let count = 0;

    for (const [, m] of message.guild.members.cache) {
      if (m.roles.cache.has(role.id)) {
        await m.roles.remove(role).catch(() => {});
        count++;
      }
    }

    await message.reply(
      `✅ ${role} rolü ${count} kişiden alındı.`
    );
  }

  // =======================
  // HRV
  // =======================

  if (command === "!hrv") {
    if (!isMod)
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const role = message.mentions.roles.first();
    if (!role) return message.reply("❌ Bir rol etiketle.");

    let count = 0;

    for (const [, m] of message.guild.members.cache) {
      await m.roles.add(role).catch(() => {});
      count++;
    }

    await message.reply(
      `✅ ${role} rolü ${count} kişiye verildi.`
    );
  }

  // =======================
  // DUYURU
  // =======================

  if (command === "!duyuru") {
    if (!hasRole(member, DUYURU_ROLE))
      return message.reply("❌ Bu komutu kullanma yetkin yok.");

    const text = args.join(" ");

    if (!text)
      return message.reply("❌ Duyuru mesajını yaz.");

    let sent = 0;

    for (const [, m] of message.guild.members.cache) {
      if (m.user.bot) continue;

      await m.user
        .send(`📢 **Sunucu Duyurusu**\n\n${text}`)
        .then(() => sent++)
        .catch(() => {});
    }

    await message.reply(
      `✅ Duyuru gönderildi. Başarılı: ${sent}`
    );

    await log(
      message.guild,
      "📢 Duyuru",
      `${message.author} tarafından duyuru gönderildi.`
    );
  }

  // =======================
  // TICKET PANEL
  // =======================

  if (command === "!ticketpanel") {
    if (
      !hasRole(member, TICKET_YETKILI) &&
      !member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return message.reply("❌ Yetkin yok.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder("Destek kategorisi seç")
      .addOptions([
        {
          label: "Genel Destek",
          value: "genel",
          emoji: "🎫"
        },
        {
          label: "Alım-Satım",
          value: "alim-satim",
          emoji: "💰"
        },
        {
          label: "Yetkili Şikayet",
          value: "yetkili-sikayet",
          emoji: "⚠️"
        },
        {
          label: "Partnerlik",
          value: "partnerlik",
          emoji: "🤝"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setTitle("🎫 Destek Merkezi")
      .setDescription(
        "Aşağıdaki menüden destek kategorisini seçerek ticket oluşturabilirsiniz."
      )
      .setColor("Blue");

    const channel = message.guild.channels.cache.get(
      TICKET_PANEL_CHANNEL
    );

    if (!channel)
      return message.reply("❌ Ticket panel kanalı bulunamadı.");

    await channel.send({
      embeds: [embed],
      components: [row]
    });

    await message.reply("✅ Ticket paneli gönderildi.");
  }
});

// =======================
// TICKET SELECT
// =======================

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId !== "ticket_category") return;

  const guild = interaction.guild;
  const user = interaction.user;

  const names = {
    genel: "Genel destek",
    "alim-satim": "Alım-satım",
    "yetkili-sikayet": "Yetkili şikayet",
    partnerlik: "Partnerlik"
  };

  const selected = names[interaction.values[0]];

  await interaction.deferReply({ ephemeral: true });

  const existing = guild.channels.cache.find(
    c =>
      c.parentId === TICKET_CATEGORY &&
      c.name === cleanName(user.username)
  );

  if (existing) {
    return interaction.editReply(
      `❌ Zaten açık ticketın var: ${existing}`
    );
  }

  const channel = await guild.channels.create({
    name: cleanName(user.username),
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: TICKET_YETKILI,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  const close = new ButtonBuilder()
    .setCustomId("ticket_close")
    .setLabel("Ticket Kapat")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(close);

  const embed = new EmbedBuilder()
    .setTitle(`🎫 ${selected}`)
    .setDescription(
      `${user}, destek talebin oluşturuldu.\n\nYetkililer en kısa sürede ilgilenecektir.`
    )
    .setColor("Blue");

  await channel.send({
    content: `${user} <@&${TICKET_YETKILI}>`,
    embeds: [embed],
    components: [row]
  });

  await interaction.editReply(
    `✅ Ticket oluşturuldu: ${channel}`
  );

  await log(
    guild,
    "🎫 Ticket Açıldı",
    `${user} tarafından ${selected} kategorisinde ticket açıldı.\nKanal: ${channel}`
  );
});

// =======================
// TICKET KAPAT
// =======================

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "ticket_close") return;

  const channel = interaction.channel;

  await interaction.reply("🔒 Ticket 5 saniye içinde kapatılıyor...");

  await log(
    interaction.guild,
    "🔒 Ticket Kapatıldı",
    `${interaction.user} tarafından ${channel.name} kapatıldı.`
  );

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 5000);
});

// =======================
// HATALAR
// =======================

process.on("unhandledRejection", error => {
  console.log("Unhandled:", error);
});

process.on("uncaughtException", error => {
  console.log("Exception:", error);
});

// =======================
// GİRİŞ
// =======================

if (!TOKEN) {
  console.log("❌ TOKEN bulunamadı. Hosting ortamına TOKEN değişkeni ekle.");
} else {
  client.login(TOKEN);
            }
