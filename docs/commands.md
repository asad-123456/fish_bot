# Command Reference

Fish Bot uses Discord's modern **Slash Commands**. To use them, simply type `/` in any text channel where the bot has access, and select the command from the pop-up menu.

---

### `/play <query>`
**Description:** Plays a song, searches for a track, or queues an entire playlist.
**Usage Examples:**
- **By Name:** `/play query: never gonna give you up` (Searches YouTube for the best match).
- **By URL:** `/play query: https://www.youtube.com/watch?v=dQw4w9WgXcQ` (Plays the specific video).
- **By YouTube Music URL:** `/play query: https://music.youtube.com/watch?v=...` (Plays high-quality YouTube Music audio).
- **Playlists:** `/play query: https://music.youtube.com/playlist?list=...` (Instantly adds every song in the playlist to the queue).

*Note: You must be inside a Voice Channel to use this command! If the bot is not already in the channel, it will join automatically.*

---

### `/skip`
**Description:** Skips the currently playing song.
**Details:** If there are more songs in the queue, the bot will immediately begin playing the next one. If it was the last song, the bot will go idle and wait for more requests.

---

### `/stop`
**Description:** Completely stops the music, clears the queue, and forces the bot to leave the voice channel.
**Details:** Use this when you are done listening for the day to clear out the bot's memory and disconnect it.

---

### `/queue`
**Description:** Displays the current music queue.
**Details:** Shows you the song that is currently playing, followed by the next 10 upcoming songs in the queue (along with their durations). If the queue is longer than 11 songs, it will tell you how many additional songs are waiting.
