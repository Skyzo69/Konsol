const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();  // Untuk mengambil token dari .env

// Membuat instance client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Event saat bot siap
client.once('ready', () => {
    console.log(`Bot berhasil login sebagai ${client.user.tag}`);
});

// Event error untuk menangani jika login gagal
client.on('error', (error) => {
    console.error('Terjadi kesalahan:', error);
});

// Login menggunakan token yang ada di .env
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Login Discord berhasil!');
    })
    .catch((error) => {
        console.error('Gagal login dengan token yang diberikan:', error);
    });
