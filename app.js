import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from '@discordjs/voice';
import play from 'play-dl';
import yt from 'youtube-dl-exec';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ],
});

// A simple queue system per guild
const queues = new Map();

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song or playlist from YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The YouTube URL or search query')
                .setRequired(true)),
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
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const guildId = interaction.guildId;

    if (commandName === 'play') {
        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

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
    } else if (commandName === 'stop') {
        const queue = queues.get(guildId);
        if (!queue) return interaction.reply({ content: 'There is no music playing right now.', ephemeral: true });
        
        queue.songs = [];
        queue.player.stop();
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

