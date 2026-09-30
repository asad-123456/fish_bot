# Local Setup Guide

If you want to run Fish Bot on your own computer, follow these steps!

## Prerequisites
1. **Node.js:** Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher is recommended).
2. **Discord Account:** You need a Discord account and admin access to a server where you can test the bot.

## 1. Create the Discord Application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it "Fish Bot".
3. Go to the **Bot** tab on the left sidebar and customize the bot's username and avatar.
4. Copy your **Bot Token** (you will need this later).
5. Go to the **General Information** tab and copy your **Application ID**.

## 2. Invite the Bot to your Server
1. In the Developer Portal, go to **OAuth2 > URL Generator**.
2. Under **SCOPES**, check:
   - `bot`
   - `applications.commands`
3. Under **BOT PERMISSIONS**, check:
   - `Send Messages`
   - `Connect`
   - `Speak`
4. Copy the generated URL at the bottom, paste it into your browser, and authorize the bot into your server.

## 3. Install Dependencies
Open your terminal in the `fish_bot` directory and run:
```bash
npm install
```
*This will install all necessary libraries, including `discord.js`, `youtube-dl-exec`, and the `ffmpeg-static` encoder.*

## 4. Configure Environment Variables
1. Create a new file in the root directory called `.env` (or rename the provided `.env.sample`).
2. Add your credentials to the file like this:
```env
APP_ID=your_application_id_here
DISCORD_TOKEN=your_bot_token_here
PUBLIC_KEY=your_public_key_here
```

## 5. Run the Bot
In your terminal, run:
```bash
npm start
```
You should see a message in the console saying `Logged in as Fish Bot!`. 

Hop into a voice channel in your server and type `/play` to start the music!
