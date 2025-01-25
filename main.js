const puppeteer = require("puppeteer");
const fs = require("fs");

// Fungsi untuk membaca token dari file
function loadTokens(filename) {
  try {
    const data = fs.readFileSync(filename, "utf-8");
    return data.split("\n").filter((token) => token.trim() !== ""); // Hapus baris kosong
  } catch (error) {
    console.error(`Gagal membaca file ${filename}:`, error);
    return [];
  }
}

// Memuat token Discord dan cookies Twitter dari file masing-masing
const discordTokens = loadTokens("discord_tokens.txt");
const twitterCookies = loadTokens("twitter_cookies.txt");

if (discordTokens.length === 0) {
  console.error("Tidak ada token Discord yang ditemukan di discord_tokens.txt");
  process.exit(1); // Keluar dari program jika tidak ada token Discord
}

if (twitterCookies.length === 0) {
  console.error("Tidak ada cookie Twitter yang ditemukan di twitter_cookies.txt");
  process.exit(1); // Keluar dari program jika tidak ada cookie Twitter
}

// ID channel Discord
const channelID = "1324498333758390353"; // Ganti dengan ID channel yang benar

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const [index, token] of discordTokens.entries()) {
    const page = await browser.newPage();

    try {
      console.log(`(${index + 1}/${discordTokens.length}) Mencoba login dengan token Discord: ${token}`);

      // Pastikan token tidak kosong
      if (!token || token.trim() === "") {
        console.log(`Token ${index + 1} tidak valid, melewatkan...`);
        continue; // Lewati token yang tidak valid
      }

      // Login ke Discord menggunakan token
      await page.goto("https://discord.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
      console.log("Menyimpan token ke localStorage...");
      await page.evaluate((token) => {
        if (typeof window.localStorage !== "undefined") {
          window.localStorage.setItem("token", `"${token}"`);
        }
      }, token);

      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });

      // Mengecek apakah login berhasil dengan melihat elemen user yang ada setelah login
      console.log("Memverifikasi login Discord...");
      const loggedInSelector = 'div[aria-label="User Settings"]'; // Selector untuk tombol pengaturan pengguna yang hanya muncul setelah login
      try {
        await page.waitForSelector(loggedInSelector, { timeout: 20000 });
        console.log(`Login Discord berhasil dengan token ${index + 1}`);
      } catch (error) {
        console.log(`Login Discord gagal dengan token ${index + 1}`);
        continue; // Lewati token ini dan lanjutkan ke token berikutnya
      }

      // Login ke app.drip.re dan connect Discord
      console.log("Login ke app.drip.re...");
      await page.goto(
        "https://app.drip.re/login?callbackUrl=https://app.drip.re/settings?tab=connections",
        { waitUntil: "networkidle2", timeout: 60000 }
      );

      // Menggunakan selector CSS yang diberikan untuk tombol "Connect with Discord"
      console.log("Mencari tombol Connect with Discord...");
      const connectWithDiscordButtonSelector =
        "body > div:nth-child(16) > div.flex.h-screen.w-screen.items-center.justify-center.bg-black > div > div > div > div > div > div > div:nth-child(2) > div.login-view__container > div > div > div > button > div > span > div > p";

      await page.waitForSelector(connectWithDiscordButtonSelector, { timeout: 10000 });
      console.log("Klik tombol Connect with Discord...");
      await page.click(connectWithDiscordButtonSelector);

      // Tunggu dan navigasi ke halaman OAuth
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

      // Menunggu halaman OAuth Discord dan menekan tombol "Authorize"
      console.log("Mencari tombol Authorize di halaman OAuth...");
      const authorizeButtonSelector = 'button[type="submit"]';
      const authorizeButton = await page.$(authorizeButtonSelector);

      if (authorizeButton) {
        console.log("Tombol Authorize ditemukan, klik tombol...");
        await authorizeButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });
        console.log("Tombol Authorize berhasil ditekan dan navigasi selesai.");
      } else {
        console.log("Tombol Authorize tidak ditemukan. Melewati token ini...");
        continue; // Lewati token ini dan lanjutkan ke token berikutnya
      }

    } catch (error) {
      console.error(`Terjadi kesalahan dengan token Discord (${index + 1}): ${token}`, error);
    } finally {
      await page.close();
    }
  }

  console.log("Semua token selesai diproses. Skrip dihentikan.");
  await browser.close();
  process.exit(0); // Berhenti setelah semua token selesai
})();
