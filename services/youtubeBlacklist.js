const YOUTUBE_REGEX = /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/[^\s]+/gi;
const youtubeStore = require('./BlacklistStore.js');

async function youtubeBlacklistMain(message) {
    if (message.author.bot || !message.content) return;

    const urls = message.content.match(YOUTUBE_REGEX);
    if (!urls) return;

    for (const url of urls) {
        const videoId = extractVideoId(url);
        let channelId = null;
        if (videoId) {
            channelId = await getChannelIdFromVideo(videoId);
        } else {
            channelId = await getChannelIdFromUrl(url);
        }
        if (!channelId) continue;

        if (youtubeStore.has(channelId)) {
            try {
                await message.delete();
            } catch (err) {
                console.error('Failed to delete message:', err);
            }
            break;
        }
    }
}

function extractVideoId(url) {
    try {
        const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
        if (parsed.hostname === 'youtu.be') {
            return parsed.pathname.slice(1);
        }
        if (parsed.hostname.includes('youtube.com')) {
            return new URLSearchParams(parsed.search).get('v');
        }
    } catch (e) {
        return null;
    }
}

async function getChannelIdFromVideo(videoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
            return data.items[0].snippet.channelId;
        }
    } catch (err) {
        console.error('YouTube API error (video):', err);
        return null;
    }
}

async function getChannelIdFromUrl(urlStr) {
    try {
        const url = new URL(urlStr.startsWith('http') ? urlStr : 'https://' + urlStr);
        const parts = url.pathname.split('/').filter(Boolean);
        // /channel/CHANNEL_ID
        if (parts[0] === 'channel' && parts[1]) return parts[1];
        // /user/USERNAME -> use forUsername
        if (parts[0] === 'user' && parts[1]) return await getChannelIdForUsername(parts[1]);
        // /c/CUSTOMNAME -> fall back to search
        if (parts[0] === 'c' && parts[1]) return await findChannelIdByQuery(parts[1]);
        // sometimes the URL is a channel home with no path type - try to detect 'watch' query or other patterns
        // if it's not a channel path, attempt to search the hostname+pathname as a query
        return await findChannelIdByQuery(parts.join(' '));
    } catch (err) {
        return null;
    }
}

async function getChannelIdForUsername(username) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;
    const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(username)}&key=${apiKey}`;
    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.items && data.items.length > 0) return data.items[0].id;
    } catch (err) {
        console.error('YouTube API error (forUsername):', err);
    }
    return null;
}

async function findChannelIdByQuery(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${apiKey}`;
    try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.items && data.items.length > 0 && data.items[0].id && data.items[0].id.channelId) {
            return data.items[0].id.channelId;
        }
    } catch (err) {
        console.error('YouTube API error (search):', err);
        return null;
    }
}

async function newBlacklistChannel(message, input) {
    if (!input) {
        message.channel.send('Provide a YouTube channel URL, channel ID, or video URL.');
        return;
    }

    let channelId = null;
    if (input.match(/^https?:\/\//) || input.match(/youtube\.com|youtu\.be/)) {
        // try to extract from URL
        const videoId = extractVideoId(input);
        console.log('extracted video id: ' + videoId)
        if (videoId) channelId = await getChannelIdFromVideo(videoId);
        else channelId = await getChannelIdFromUrl(input);
    } else {
        // if plain channel id pasted
        channelId = input;
    }

    if (!channelId) {
        message.channel.send('Unable to resolve channel ID. Try a different URL / provide the channel ID directly.');
        return;
    }

    if (youtubeStore.has(channelId)) {
        message.channel.send(`Channel ID ${channelId} is already blacklisted.`);
        return;
    }

    await youtubeStore.add(channelId);
    message.channel.send(`Channel ID ${channelId} has been added to the blacklist.`);
}

module.exports = {
    youtubeBlacklistMain,
    newBlacklistChannel
};