# Command Reference

Fish Bot uses Discord's modern **Slash Commands**. To use them, simply type `/` in any text channel where the bot has access, and select the command from the pop-up menu.

---

### `/play <query>`
**Description:** Plays a song, searches for a track, or queues an entire playlist from YouTube or YouTube Music.
**Usage Examples:**
- **By Name:** `/play query: never gonna give you up` (Searches YouTube for the best match).
- **By URL:** `/play query: https://www.youtube.com/watch?v=dQw4w9WgXcQ` (Plays the specific video).
- **By YouTube Music URL:** `/play query: https://music.youtube.com/watch?v=...` (Plays high-quality YouTube Music audio).
- **Playlists:** `/play query: https://music.youtube.com/playlist?list=...` (Instantly adds every song in the playlist to the queue).

*Note: You must be inside a Voice Channel to use this command! If the bot is not already in the channel, it will join automatically.*

---

### `/playlist <action>`
**Description:** Save and manage your favorite playlists so you don't have to keep copying their links.
**Subcommands:**
- `/playlist save name: myvibes url: https://...` (Saves a YouTube/YouTube Music URL to your bot).
- `/playlist play name: myvibes` (Plays the saved playlist).
- `/playlist list` (Shows all your saved playlists).
- `/playlist delete name: myvibes` (Deletes a saved playlist).

---

### 🔊 Soundboard Commands

Fish Bot replicates Discord's Soundboard with interactive buttons and custom video/audio conversion!

#### `/soundboard [sound]`
**Description:** Opens the interactive Soundboard panel with clickable buttons for all uploaded sounds. Clicking any button instantly plays the sound effect in your voice channel!
- If music is actively playing, the bot smoothly pauses your song, plays the sound effect, and resumes your song right where it left off!
- *Optional:* Provide the `sound` parameter (e.g. `/soundboard sound: ding`) to play a sound immediately without opening the menu.

#### `/sound-add <name> <file> [start] [duration]`
**Description:** Upload any video or audio file to add to your soundboard! Fish Bot automatically extracts the audio and converts it to high-quality soundboard MP3s.
- `name` *(Required)*: Name for the sound (e.g. `bruh`, `vineboom`, `metalpipe`).
- `file` *(Required)*: Attach any video (MP4, WEBM, MOV, MKV) or audio (MP3, WAV, OGG, M4A) file directly from your computer or phone.
- `start` *(Optional)*: Start timestamp in seconds or MM:SS (e.g. `5` or `0:12`) so you can clip the exact meme moment from a video!
- `duration` *(Optional)*: Clip duration in seconds (default is up to 15s, maximum 30s).

*Tip:* You can also drop `.mp3` files directly into the `sounds/` folder on your computer!

#### `/sound-list`
**Description:** Displays a list of all sounds currently installed on your soundboard.

#### `/sound-delete <name>`
**Description:** Deletes a sound from the soundboard.

---

### `/skip`
**Description:** Skips the currently playing song.
**Details:** If there are more songs in the queue, the bot will immediately begin playing the next one. If it was the last song, the bot will go idle and wait for more requests.

---

### `/stop`
**Description:** Completely stops the music, clears the queue, stops any sound effects, and forces the bot to leave the voice channel.
**Details:** Use this when you are done listening for the day to clear out the bot's memory and disconnect it.

---

### `/queue`
**Description:** Displays the current music queue.
**Details:** Shows you the song that is currently playing, followed by the next 10 upcoming songs in the queue (along with their durations). If the queue is longer than 11 songs, it will tell you how many additional songs are waiting.
