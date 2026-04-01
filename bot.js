const { Client, GatewayIntentBits } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
require("dotenv").config();

// =============================================
//  KONFIGURASI - Diambil dari file .env
// =============================================
const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const PREFIX = "!";
// =============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let targetChannelId = VOICE_CHANNEL_ID;
let isActive = true;

// Fungsi join voice channel
async function joinVoice(channelId) {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(channelId);

    if (!channel || channel.type !== 2) {
      console.log("❌ Channel tidak ditemukan atau bukan voice channel!");
      return false;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,  // Bot bisu (tidak dengar), hemat resource
      selfMute: true,  // Bot bisu (tidak bicara)
    });

    console.log(`✅ Bot berhasil join: ${channel.name}`);
    return true;
  } catch (err) {
    console.error("❌ Gagal join voice:", err.message);
    return false;
  }
}

// Auto-reconnect jika bot keluar dari voice
function startAutoReconnect() {
  setInterval(async () => {
    if (!isActive) return;

    const connection = getVoiceConnection(GUILD_ID);
    if (!connection) {
      console.log("🔄 Koneksi terputus, reconnecting...");
      await joinVoice(targetChannelId);
    }
  }, 10000); // Cek setiap 10 detik
}

// Event: Bot siap
client.once("ready", async () => {
  console.log(`\n🤖 Bot aktif: ${client.user.tag}`);
  console.log(`📡 Server ID  : ${GUILD_ID}`);
  console.log(`🔊 Channel ID : ${targetChannelId}`);
  console.log(`\n⏳ Menghubungkan ke voice channel...\n`);

  await joinVoice(targetChannelId);
  startAutoReconnect();
});

// Event: Baca perintah chat
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args[0].toLowerCase();

  // !join - bot join ke voice channel kamu sekarang
  if (command === "join") {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply("❌ Kamu harus masuk ke voice channel dulu!");
    }
    targetChannelId = voiceChannel.id;
    isActive = true;
    const ok = await joinVoice(voiceChannel.id);
    message.reply(ok ? `✅ Bot join ke **${voiceChannel.name}**!` : "❌ Gagal join!");
  }

  // !leave - bot keluar dari voice
  else if (command === "leave") {
    isActive = false;
    const connection = getVoiceConnection(GUILD_ID);
    if (connection) {
      connection.destroy();
      message.reply("👋 Bot keluar dari voice channel.");
    } else {
      message.reply("❌ Bot tidak sedang di voice channel.");
    }
  }

  // !status - cek status bot
  else if (command === "status") {
    const connection = getVoiceConnection(GUILD_ID);
    const status = connection ? "🟢 Aktif di voice channel" : "🔴 Tidak di voice channel";
    message.reply(`**Status Bot:** ${status}\n**Auto-reconnect:** ${isActive ? "✅ ON" : "❌ OFF"}`);
  }

  // !help - daftar perintah
  else if (command === "help") {
    message.reply(
      "**📋 Daftar Perintah:**\n" +
      `\`${PREFIX}join\` - Bot ikut ke voice channel kamu\n` +
      `\`${PREFIX}leave\` - Bot keluar dari voice\n` +
      `\`${PREFIX}status\` - Cek status bot\n` +
      `\`${PREFIX}help\` - Tampilkan bantuan ini`
    );
  }
});

// Handle error biar bot tidak crash
process.on("unhandledRejection", (err) => {
  console.error("⚠️ Error tidak tertangani:", err.message);
});

// Login bot
client.login(TOKEN);