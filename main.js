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
    executablePath: "/usr/bin/chromium-browser", // Path ke Chromium
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

      // 1. Login ke Discord menggunakan token
      await page.goto("https://discord.com/login", { waitUntil: "networkidle2" });
      await page.waitForSelector('input[type="text"]'); // Tunggu sampai elemen input muncul
      console.log("Menyimpan token ke localStorage...");
      await page.evaluate((token) => {
        if (typeof window.localStorage !== "undefined") {
          window.localStorage.setItem("token", `"${token}"`);
        }
      }, token);

      await page.reload({ waitUntil: "networkidle2" });

      // 2. Login ke app.drip.re dan connect Discord
      console.log("Login ke app.drip.re...");
      await page.goto("https://app.drip.re/login?callbackUrl=https://app.drip.re/settings?tab=connections", { waitUntil: "networkidle2" });

      console.log("Mencari tombol Connect with Discord...");
      const connectWithDiscordButton = await page.evaluate(() => {
        const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes("Connect with Discord"));
        return button ? button : null;
      });

      if (connectWithDiscordButton) {
        console.log("Klik tombol Connect with Discord...");
        await connectWithDiscordButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" });
      } else {
        console.log("Tombol 'Connect with Discord' tidak ditemukan.");
      }

      // 3. Menunggu halaman OAuth Discord dan menekan tombol "Authorize"
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

      // 4. Kembali ke halaman koneksi dan cari tombol "Link" di bawah logo Twitter
      console.log("Kembali ke https://app.drip.re/settings?tab=connections...");
      await page.goto("https://app.drip.re/settings?tab=connections", { waitUntil: "networkidle2" });

      console.log("Mencari tombol Link di bawah logo Twitter...");
      const linkButton = await page.evaluate(() => {
        // Mencari tombol Link di bawah logo Twitter
        const twitterButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes("Link"));
        return twitterButton ? twitterButton : null;
      });

      if (linkButton) {
        console.log("Klik tombol Link di bawah logo Twitter...");
        await linkButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" });
      } else {
        console.log("Tombol Link tidak ditemukan.");
      }

      // 5. Menunggu halaman OAuth Twitter untuk auto-authorization
      console.log("Mencari tombol Allow di halaman OAuth Twitter...");
      await page.waitForSelector('button[type="submit"]'); // Tunggu tombol Allow muncul di halaman OAuth Twitter
      const allowButton = await page.$('button[type="submit"]'); // Tombol "Allow" biasanya bertipe submit
      if (allowButton) {
        console.log("Klik tombol Allow...");
        await allowButton.click();
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        console.log("Berhasil mengotorisasi Twitter.");
      } else {
        console.log("Tombol Allow tidak ditemukan.");
      }

      // 6. Kembali ke halaman Drip dan selesai
      console.log("Kembali ke https://app.drip.re/settings?tab=connections untuk memverifikasi koneksi...");
      await page.goto("https://app.drip.re/settings?tab=connections", { waitUntil: "networkidle2" });

      // Menunggu hingga semua koneksi selesai
      console.log("Semua koneksi selesai.");
      
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
