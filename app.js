import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import play from 'play-dl';
import yt from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ],
});

// A simple queue system per guild
const queues = new Map();

// Saved playlists system
const playlistsFile = './playlists.json';
if (!fs.existsSync(playlistsFile)) {
    fs.writeFileSync(playlistsFile, JSON.stringify({}));
}

function getPlaylists() {
    return JSON.parse(fs.readFileSync(playlistsFile, 'utf8'));
}

function savePlaylists(data) {
    fs.writeFileSync(playlistsFile, JSON.stringify(data, null, 2));
}

// Soundboard sound storage system
const soundsDir = './sounds';
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir);
}

function getSoundList() {
    if (!fs.existsSync(soundsDir)) return [];
    const files = fs.readdirSync(soundsDir);
    return files
        .filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f) && !f.startsWith('temp_'))
        .map(f => path.parse(f).name);
}

function getSoundFilePath(name) {
    if (!fs.existsSync(soundsDir)) return null;
    const files = fs.readdirSync(soundsDir);
    const match = files.find(f => path.parse(f).name.toLowerCase() === name.toLowerCase() && !f.startsWith('temp_'));
    return match ? path.join(soundsDir, match) : null;
}

function createSoundboardComponents() {
    const sounds = getSoundList();
    if (sounds.length === 0) return { components: [], soundsCount: 0 };

    const rows = [];
    let currentRow = new ActionRowBuilder();

    // Discord allows up to 5 action rows with 5 buttons each (25 total)
    const buttonSounds = sounds.slice(0, 25);
    for (const sound of buttonSounds) {
        if (currentRow.components.length === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`sb_${sound}`)
                .setLabel(sound.length > 20 ? sound.slice(0, 20) : sound)
                .setEmoji('🔊')
                .setStyle(ButtonStyle.Secondary)
        );
    }
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }

    return { components: rows, soundsCount: sounds.length };
}

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song or playlist from YouTube or YouTube Music')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The YouTube URL or search query')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage your saved playlists')
        .addSubcommand(subcommand =>
            subcommand
                .setName('save')
                .setDescription('Save a playlist or song URL under a custom name')
                .addStringOption(option => option.setName('name').setDescription('Name of the playlist').setRequired(true))
                .addStringOption(option => option.setName('url').setDescription('YouTube URL to save').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a saved playlist')
                .addStringOption(option => option.setName('name').setDescription('Name of the saved playlist').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all saved playlists'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a saved playlist')
                .addStringOption(option => option.setName('name').setDescription('Name of the playlist to delete').setRequired(true))),
    new SlashCommandBuilder()
        .setName('soundboard')
        .setDescription('Open the interactive soundboard button menu or play a sound')
        .addStringOption(option =>
            option.setName('sound')
                .setDescription('Optional: Name of a specific sound to play immediately')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('sound-add')
        .setDescription('Upload a video or audio file to convert & add to soundboard')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name for the sound (e.g. bruh, vineboom)')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('Audio or video file (mp4, webm, mov, mp3, wav, etc.)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('start')
                .setDescription('Optional start time in seconds or MM:SS (e.g. 5 or 0:12)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Optional duration in seconds (default: up to 15s, max 30s)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('sound-delete')
        .setDescription('Delete a sound from the soundboard')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the sound to delete')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('sound-list')
        .setDescription('List all available soundboard sounds'),
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops the music, clears the queue, and leaves the voice channel'),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the current music queue'),
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(process.env.APP_ID),
            { body: commands },
        );

        // Also register directly to each guild for instant availability
        for (const [id] of client.guilds.cache) {
            await rest.put(
                Routes.applicationGuildCommands(process.env.APP_ID, id),
                { body: commands },
            );
        }
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// Catch unhandled rejections globally so the bot doesn't crash on random yt-dlp exit codes
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

client.on('interactionCreate', async interaction => {
    // 1. Handle interactive Soundboard button clicks
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('sb_')) {
            const soundName = interaction.customId.replace('sb_', '');
            await playSoundboard(interaction, soundName);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const guildId = interaction.guildId;

    if (commandName === 'play') {
        const query = interaction.options.getString('query');
        await enqueueAndPlay(interaction, query);
    } else if (commandName === 'playlist') {
        const subcommand = interaction.options.getSubcommand();
        const playlists = getPlaylists();

        if (subcommand === 'save') {
            const name = interaction.options.getString('name').toLowerCase();
            const url = interaction.options.getString('url');
            playlists[name] = url;
            savePlaylists(playlists);
            return interaction.reply({ content: `Successfully saved playlist **${name}**!`, ephemeral: true });
        } else if (subcommand === 'list') {
            const keys = Object.keys(playlists);
            if (keys.length === 0) return interaction.reply({ content: 'You have no saved playlists.', ephemeral: true });
            return interaction.reply({ content: `**Saved Playlists:**\n${keys.map(k => `- ${k}`).join('\n')}`, ephemeral: true });
        } else if (subcommand === 'delete') {
            const name = interaction.options.getString('name').toLowerCase();
            if (playlists[name]) {
                delete playlists[name];
                savePlaylists(playlists);
                return interaction.reply({ content: `Deleted playlist **${name}**!`, ephemeral: true });
            } else {
                return interaction.reply({ content: `Playlist **${name}** not found.`, ephemeral: true });
            }
        } else if (subcommand === 'play') {
            const name = interaction.options.getString('name').toLowerCase();
            const url = playlists[name];
            if (!url) {
                return interaction.reply({ content: `Playlist **${name}** not found.`, ephemeral: true });
            }
            await enqueueAndPlay(interaction, url);
        }
    } else if (commandName === 'soundboard') {
        const specificSound = interaction.options.getString('sound');
        if (specificSound) {
            await playSoundboard(interaction, specificSound);
            return;
        }

        const { components, soundsCount } = createSoundboardComponents();
        const embed = new EmbedBuilder()
            .setTitle('🐟 Fish Bot Soundboard')
            .setDescription(
                soundsCount === 0
                    ? '🔊 **No sounds found!**\nUse `/sound-add` to upload an audio or video clip, or place `.mp3` files directly into the `sounds/` folder on your PC.'
                    : `Click any button below to instantly play the sound in your voice channel!\n\n💡 *Tip: Add your own memes or video clips anytime using* \`/sound-add\``
            )
            .setColor(0x00AE86)
            .setFooter({ text: `${soundsCount} sound(s) ready` });

        await interaction.reply({ embeds: [embed], components });
    } else if (commandName === 'sound-add') {
        await interaction.deferReply();
        const rawName = interaction.options.getString('name').trim();
        const sanitizedName = rawName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const attachment = interaction.options.getAttachment('file');
        const start = interaction.options.getString('start');
        const duration = interaction.options.getInteger('duration');

        if (!attachment) {
            return interaction.editReply('Please attach a valid audio or video file.');
        }

        const outputPath = path.join(soundsDir, `${sanitizedName}.mp3`);
        const tempInput = path.join(soundsDir, `temp_${Date.now()}_${attachment.name}`);

        try {
            const res = await fetch(attachment.url);
            if (!res.ok) throw new Error(`Failed to download attachment (status ${res.status})`);
            const buffer = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(tempInput, buffer);

            const ffmpegArgs = ['-y', '-i', tempInput];
            if (start) {
                ffmpegArgs.push('-ss', start.toString());
            }
            if (duration) {
                ffmpegArgs.push('-t', Math.min(Math.max(duration, 1), 60).toString());
            } else {
                ffmpegArgs.push('-t', '20'); // Default cap to 20 seconds for soundboard snappiness
            }
            ffmpegArgs.push('-vn', '-acodec', 'libmp3lame', '-b:a', '192k', outputPath);

            await new Promise((resolve, reject) => {
                const proc = spawn(ffmpegPath, ffmpegArgs);
                proc.on('close', code => {
                    if (code === 0) resolve();
                    else reject(new Error(`FFmpeg exited with code ${code}`));
                });
                proc.on('error', reject);
            });

            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);

            await interaction.editReply(`✅ Successfully added **${sanitizedName}** to the soundboard! (Extracted & converted from \`${attachment.name}\`)\nUse \`/soundboard\` to open the menu and play it!`);
        } catch (err) {
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            console.error('Error adding sound:', err);
            await interaction.editReply(`❌ Failed to process sound: ${err.message}`);
        }
    } else if (commandName === 'sound-delete') {
        const name = interaction.options.getString('name').trim();
        const soundFile = getSoundFilePath(name);
        if (!soundFile) {
            return interaction.reply({ content: `Sound "${name}" was not found.`, ephemeral: true });
        }
        try {
            fs.unlinkSync(soundFile);
            return interaction.reply({ content: `🗑️ Deleted sound **${name}** from the soundboard!`, ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: `Error deleting sound: ${e.message}`, ephemeral: true });
        }
    } else if (commandName === 'sound-list') {
        const sounds = getSoundList();
        if (sounds.length === 0) {
            return interaction.reply({ content: 'No sounds available on the soundboard. Use `/sound-add` to upload one!', ephemeral: true });
        }
        const listString = sounds.map((s, idx) => `${idx + 1}. **${s}**`).join('\n');
        return interaction.reply({
            content: `🔊 **Available Soundboard Sounds (${sounds.length}):**\n${listString}\n\n*Use \`/soundboard\` to open the button menu!*`,
            ephemeral: true
        });
    } else if (commandName === 'stop') {
        const queue = queues.get(guildId);
        if (!queue) return interaction.reply({ content: 'There is no music playing right now.', ephemeral: true });
        
        queue.songs = [];
        queue.player.stop();
        if (queue.soundPlayer) {
            queue.soundPlayer.stop();
        }
        if (queue.connection) {
            queue.connection.destroy();
        }
        queues.delete(guildId);
        await interaction.reply('Stopped the music, cleared the queue, and left the voice channel.');
    } else if (commandName === 'skip') {
        const queue = queues.get(guildId);
        if (!queue || !queue.playing) return interaction.reply({ content: 'There is no music playing right now.', ephemeral: true });
        
        queue.player.stop(); // Triggers Idle event which plays the next song
        await interaction.reply('Skipped the current song.');
    } else if (commandName === 'queue') {
        const queue = queues.get(guildId);
        if (!queue || queue.songs.length === 0) return interaction.reply({ content: 'The queue is currently empty.', ephemeral: true });

        const nowPlaying = queue.songs[0];
        let queueString = `**Now Playing:** ${nowPlaying.title} (${nowPlaying.duration})\n\n**Up Next:**\n`;
        
        const nextSongs = queue.songs.slice(1, 11);
        if (nextSongs.length > 0) {
            queueString += nextSongs.map((song, i) => `${i + 1}. ${song.title} (${song.duration})`).join('\n');
            if (queue.songs.length > 11) {
                queueString += `\n... and ${queue.songs.length - 11} more songs.`;
            }
        } else {
            queueString += 'No more songs in the queue.';
        }
        
        await interaction.reply({ content: queueString, ephemeral: true });
    }
});

async function playSoundboard(interaction, soundName) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
        return interaction.reply({ content: 'You must be in a voice channel to use the soundboard!', ephemeral: true });
    }

    const soundFile = getSoundFilePath(soundName);
    if (!soundFile) {
        return interaction.reply({ content: `Sound "${soundName}" was not found. Use \`/sound-list\` to see available sounds.`, ephemeral: true });
    }

    const guildId = interaction.guildId;
    let queue = queues.get(guildId);

    // If bot isn't in VC or connection was disconnected, join the user's voice channel
    if (!queue || !queue.connection || queue.connection.state.status === 'destroyed' || queue.connection.state.status === 'disconnected') {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
        });

        if (!queue) {
            queue = {
                voiceChannel,
                textChannel: interaction.channel,
                connection,
                player: createAudioPlayer({
                    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
                }),
                soundPlayer: createAudioPlayer({
                    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
                }),
                songs: [],
                playing: false,
            };
            queues.set(guildId, queue);

            queue.player.on(AudioPlayerStatus.Idle, () => {
                queue.songs.shift();
                playNextSong(guildId);
            });
            queue.player.on('error', error => {
                console.error('Audio Player Error:', error.message);
                queue.songs.shift();
                playNextSong(guildId);
            });
        } else {
            queue.connection = connection;
        }
    } else if (queue.voiceChannel.id !== voiceChannel.id) {
        return interaction.reply({ content: 'You must be in the same voice channel as the bot to use the soundboard.', ephemeral: true });
    }

    if (!queue.soundPlayer) {
        queue.soundPlayer = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Play },
        });
    }

    const resource = createAudioResource(soundFile);

    // Acknowledge interaction smoothly (no spam in chat on button click)
    if (interaction.isButton()) {
        await interaction.deferUpdate().catch(() => {});
    } else {
        await interaction.reply({ content: `🔊 Playing **${soundName}** in **${voiceChannel.name}**!`, ephemeral: true });
    }

    // Clean up any pending idle event from previous sounds
    queue.soundPlayer.removeAllListeners(AudioPlayerStatus.Idle);

    // If music is actively playing, pause music, switch to sound effect, and resume music afterwards!
    if (queue.playing && queue.player.state.status === AudioPlayerStatus.Playing) {
        queue.player.pause();
        queue.connection.subscribe(queue.soundPlayer);
        queue.soundPlayer.play(resource);

        queue.soundPlayer.once(AudioPlayerStatus.Idle, () => {
            if (queue.connection && queue.connection.state.status !== 'destroyed') {
                queue.connection.subscribe(queue.player);
                queue.player.unpause();
            }
        });
    } else {
        // Music is not playing, just play sound directly
        queue.connection.subscribe(queue.soundPlayer);
        queue.soundPlayer.play(resource);
    }
}

async function enqueueAndPlay(interaction, query) {
    const voiceChannel = interaction.member.voice.channel;
    const guildId = interaction.guildId;

    if (!voiceChannel) {
        return interaction.reply({ content: 'You need to be in a voice channel to play music!', ephemeral: true });
    }

    await interaction.deferReply();

    let queue = queues.get(guildId);
    if (!queue) {
        queue = {
            voiceChannel,
            textChannel: interaction.channel,
            connection: null,
            player: createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play,
                },
            }),
            soundPlayer: createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Play,
                },
            }),
            songs: [],
            playing: false,
        };
        queues.set(guildId, queue);

        queue.player.on(AudioPlayerStatus.Idle, () => {
            queue.songs.shift();
            playNextSong(guildId);
        });
        
        queue.player.on('error', error => {
            console.error('Audio Player Error:', error.message);
            queue.songs.shift();
            playNextSong(guildId);
        });
    } else if (queue.voiceChannel.id !== voiceChannel.id) {
         return interaction.editReply({ content: 'You must be in the same voice channel as the bot.' });
    }

    try {
        const yt_info = await play.validate(query);
        
        if (yt_info === 'yt_playlist') {
            const playlistInfo = await yt(query, { dumpSingleJson: true, flatPlaylist: true });
            const videos = playlistInfo.entries || [];
            
            let added = 0;
            for (const video of videos) {
                const videoUrl = video.url || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : null);
                if (videoUrl) {
                    let durationString = 'Unknown';
                    if (video.duration) {
                        const minutes = Math.floor(video.duration / 60);
                        const seconds = Math.floor(video.duration % 60);
                        durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                    queue.songs.push({
                        title: video.title || 'Unknown Title',
                        url: videoUrl,
                        duration: durationString
                    });
                    added++;
                }
            }
            await interaction.editReply(`Added ${added} songs from playlist **${playlistInfo.title || 'YouTube Music Playlist'}** to the queue!`);
        } else {
            let videoInfo;
            if (yt_info === 'yt_video') {
                videoInfo = (await play.video_info(query)).video_details;
            } else {
                const searchResults = await play.search(query, { limit: 1 });
                if (!searchResults.length) {
                    return interaction.editReply('No results found for that query.');
                }
                videoInfo = searchResults[0];
            }
            
            if (!videoInfo || !videoInfo.url) {
                return interaction.editReply('Could not find a valid playable URL for that query.');
            }

            queue.songs.push({
                title: videoInfo.title,
                url: videoInfo.url,
                duration: videoInfo.durationRaw
            });
            await interaction.editReply(`Added **${videoInfo.title}** to the queue!`);
        }

        if (!queue.playing) {
            if (!queue.connection || queue.connection.state.status === 'destroyed' || queue.connection.state.status === 'disconnected') {
                queue.connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });
                queue.connection.subscribe(queue.player);
            }
            playNextSong(guildId);
        }
    } catch (error) {
        console.error('Play command error:', error);
        await interaction.editReply('An error occurred while trying to add the track to the queue.');
    }
}

async function playNextSong(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.songs.length === 0) {
        queue.playing = false;
        queue.textChannel.send('The queue has finished, but I am staying in the voice channel. Add more songs to keep the party going!');
        return;
    }

    queue.playing = true;
    const song = queue.songs[0];

    try {
        if (!song || !song.url) {
            throw new Error('Invalid song URL in queue');
        }
        
        const ytProcess = yt.exec(song.url, {
            output: '-',
            format: 'bestaudio/best',
            quiet: true,
        }, { stdio: ['ignore', 'pipe', 'ignore'] });
        
        ytProcess.catch(err => {
            // Ignore yt-dlp exit errors (like code 120 when stream is closed early)
        });
        
        const resource = createAudioResource(ytProcess.stdout);
        
        queue.connection.subscribe(queue.player);
        queue.player.play(resource);
        queue.textChannel.send(`🎶 Now playing: **${song.title}**`);
    } catch (error) {
        console.error('Error playing song:', error);
        queue.textChannel.send(`Error playing **${song?.title || 'Unknown'}**. Skipping to next song...`);
        queue.songs.shift();
        playNextSong(guildId);
    }
}

client.login(process.env.DISCORD_TOKEN);
