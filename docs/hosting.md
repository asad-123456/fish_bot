# Hosting Guide (24/7 Uptime)

If you run the bot on your own computer, it will go offline as soon as you close your terminal or turn off your PC. To keep Fish Bot online 24/7, you need to host it on a cloud server.

Because Fish Bot streams live audio and uses `yt-dlp` and `ffmpeg`, it requires a stable internet connection and a bit of memory. 

Here are the most popular ways to host it:

---

## 1. Oracle Cloud (Free Tier VPS) - Recommended for advanced users
Oracle Cloud offers an "Always Free" tier that includes an ARM-based Virtual Private Server (VPS) with up to 24GB of RAM. This is absolute overkill for a music bot, but it's 100% free!

**How to set it up:**
1. Sign up for [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/).
2. Create an Ubuntu VM instance.
3. SSH into your instance.
4. Install Node.js and Git.
5. Clone your GitHub repository.
6. Create your `.env` file via the command line (`nano .env`).
7. Install [PM2](https://pm2.keymetrics.io/) (`npm install -g pm2`) to keep the bot running in the background.
8. Start the bot: `pm2 start app.js --name "fish_bot"`.

---

## 2. Dedicated Bot Hosts (Easiest & Cheap)
Many companies that host Minecraft servers also offer specialized Discord Bot hosting starting at just $1 to $3 per month (e.g., [Sparked Host](https://sparkedhost.com/discord-bot-hosting), [PebbleHost](https://pebblehost.com/bot-hosting)).

**How to set it up:**
1. Purchase a Node.js bot hosting plan.
2. Log into the provided Web Panel (usually built on Pterodactyl).
3. Drag and drop your project files into the File Manager (do NOT upload the `node_modules` folder).
4. Enter your `APP_ID` and `DISCORD_TOKEN` in the Startup or Variables tab.
5. Click the **Start** button. The panel will automatically run `npm install` and keep the bot online 24/7!

---

## 3. Platform as a Service (Render, Railway, etc.)
If you just want to push code to GitHub and have it magically run, PaaS providers are great.
* Note: Most PaaS providers no longer offer free tiers that stay awake 24/7. For example, Render's free tier will "sleep" when inactive, which causes the bot to disconnect from Voice Channels. You will likely need a $5/mo basic plan.

**How to set it up:**
1. Upload your code to a private GitHub repository.
2. Link your GitHub account to [Render](https://render.com) or [Railway](https://railway.app).
3. Create a new "Background Worker" or "Node.js Service".
4. Add your Environment Variables (`APP_ID`, `DISCORD_TOKEN`) in the service settings.
5. The platform will automatically deploy and host your bot every time you push new code to GitHub!

---

### ⚠️ Security Warning
**NEVER** upload your `.env` file to GitHub or share your `DISCORD_TOKEN` with anyone! If your token leaks, anyone can take control of your bot and use it to spam servers. Always add `.env` to your `.gitignore` file.
