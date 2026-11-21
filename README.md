Have you ever invited a discord bot to play music in your voice channel but it only supports spotify and your music taste is niche which is why your
music doesn't exist on spotify?

Well have no fear because fish bot is here.

# Fish Bot 🐟🎵

Fish Bot is a fully-featured Discord music bot built with [discord.js](https://discord.js.org/). It streams high-quality audio directly into your Discord Voice Channels using the powerful `yt-dlp` backend, allowing you to play single tracks, search for songs, and queue up massive YouTube Music playlists effortlessly.

## Features
- **YouTube & YouTube Music Support:** Paste any standard YouTube or YouTube Music link.
- **Playlist Parsing:** Paste a playlist link and Fish Bot will automatically queue every song.
- **Search:** Don't have a link? Just type the name of the song (`/play lofi hip hop`) and the bot will find and play it.
- **Interactive Soundboard:** Built-in Discord soundboard with clickable button panels. Upload video or audio clips directly through Discord (with auto video-to-audio extraction) or drop MP3s in the sounds folder!
- **Persistent Queue:** The bot remains in the voice channel after the queue finishes, waiting for you to add more songs.
- **Robust Audio Extraction:** Bypasses common YouTube bot-blocks by leveraging the industry-standard `youtube-dl-exec` (`yt-dlp`).

## Documentation
For detailed guides on how to use and host Fish Bot, check out the documentation in the `/docs` folder:
- [Command Reference](docs/commands.md) - Learn how to use `/play`, `/stop`, `/skip`, and `/queue`.
- [Local Setup Guide](docs/setup.md) - Instructions for running the bot on your own computer.
- [Hosting Guide](docs/hosting.md) - How to keep the bot online 24/7 on a cloud server.

## Quick Start
1. Clone this repository.
2. Run `npm install` to install all dependencies (including `ffmpeg`).
3. Create a `.env` file based on `.env.sample` and add your Discord Application credentials.
4. Run `npm start` to bring the bot online!


If you liked fish bot, consider leaving a star to help others discover it!
