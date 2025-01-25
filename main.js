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
      console.log(`(${index + 1}/${discordTokens.length}) Login dengan token Discord: ${token}`);

      // Pastikan token tidak kosong
      if (!token || token.trim() === "") {
        console.log(`Token ${index + 1} tidak valid, melewatkan...`);
        continue; // Lewati token yang tidak valid
      }

      // Login ke Discord menggunakan token
      await page.goto("https://discord.com/login", { waitUntil: "networkidle2" });
      console.log("Menyimpan token ke localStorage...");
      await page.evaluate((token) => {
        if (typeof window.localStorage !== "undefined") {
          window.localStorage.setItem("token", `"${token}"`);
        }
      }, token);

      await page.reload({ waitUntil: "networkidle2" });

      // Login ke app.drip.re dan connect Discord
      console.log("Login ke app.drip.re...");
      await page.goto(
        "https://app.drip.re/login?callbackUrl=https://app.drip.re/settings?tab=connections",
        { waitUntil: "networkidle2" }
      );

      // Menggunakan selector CSS yang diberikan untuk tombol "Connect with Discord"
      console.log("Mencari tombol Connect with Discord...");
      const connectWithDiscordButtonSelector =
        "body > div:nth-child(16) > div.flex.h-screen.w-screen.items-center.justify-center.bg-black > div > div > div > div > div > div > div:nth-child(2) > div.login-view__container > div > div > div > button > div > span > div > p";

      await page.waitForSelector(connectWithDiscordButtonSelector, { timeout: 5000 });
      console.log("Klik tombol Connect with Discord...");
      await page.click(connectWithDiscordButtonSelector);
      await page.waitForNavigation({ waitUntil: "networkidle2" });

      // Menunggu halaman OAuth Discord dan menekan tombol "Authorize"
      console.log("Mencari tombol Authorize di halaman OAuth...");
      await page.waitForSelector('button[type="submit"]'); // Tunggu tombol submit (Authorize) muncul
      const authorizeButton = await page.$('button[type="submit"]');
      if (authorizeButton) {
        console.log("Klik tombol Authorize...");
        await authorizeButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" });
      } else {
        console.log("Tombol Authorize tidak ditemukan.");
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
