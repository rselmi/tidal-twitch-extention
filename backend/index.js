const axios = require('axios');
const jwt = require('jsonwebtoken');

const getEnv = (key) => (process.env[key] || "").trim();

const CONFIG = {
  LASTFM_API_KEY: getEnv('LASTFM_API_KEY'),
  LASTFM_USER: getEnv('LASTFM_USER'),
  TWITCH_CLIENT_ID: getEnv('TWITCH_CLIENT_ID'),
  TWITCH_EXTENSION_SECRET: getEnv('TWITCH_EXTENSION_SECRET'),
  TWITCH_CHANNEL_ID: getEnv('TWITCH_CHANNEL_ID'),
  TIDAL_CLIENT_ID: getEnv('TIDAL_CLIENT_ID'),
  TIDAL_CLIENT_SECRET: getEnv('TIDAL_CLIENT_SECRET'),
  TIDAL_REFRESH_TOKEN: getEnv('TIDAL_REFRESH_TOKEN'),
  TIDAL_PLAYLIST_ID: getEnv('TIDAL_PLAYLIST_ID')
};

exports.checkMusic = async (event, context) => {
  console.log("🚀 [INÍCIO] v1.1.5");

  let trackToRequest = null;
  try {
    const rawData = event.data || event;
    if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(Buffer.from(rawData, 'base64').toString());
        trackToRequest = parsed.requestTrack || (parsed.data && parsed.data.requestTrack);
      } catch (e) { trackToRequest = rawData; }
    } else {
      trackToRequest = rawData.requestTrack || (rawData.data && rawData.data.requestTrack);
    }
  } catch (err) { console.log("⚠️ Erro payload:", err.message); }

  const tasks = [];
  tasks.push(syncLastFmToTwitch().catch(e => console.error("❌ Erro Last.fm:", e.message)));

  if (trackToRequest && trackToRequest !== "undefined" && trackToRequest !== "") {
    console.log(`🎵 Pedido: "${trackToRequest}"`);
    tasks.push(addTrackToTidal(trackToRequest).catch(e => console.error("❌ Erro Tidal:", e.message)));
  }

  await Promise.all(tasks);
  console.log("🏁 [FIM]");
};

async function getTidalToken() {
  const auth = Buffer.from(`${CONFIG.TIDAL_CLIENT_ID}:${CONFIG.TIDAL_CLIENT_SECRET}`).toString('base64');
  try {
    const res = await axios.post('https://auth.tidal.com/v1/oauth2/token', 
      new URLSearchParams({ 'grant_type': 'refresh_token', 'refresh_token': CONFIG.TIDAL_REFRESH_TOKEN }), 
      { headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Erro Token Tidal. Verifique ClientID/Secret e RefreshToken.");
    return null;
  }
}

async function addTrackToTidal(query) {
  const token = await getTidalToken();
  if (!token) return;

  try {
    // 1. Validar acesso à Playlist antes de tudo
    console.log(`🔎 Verificando acesso à playlist: ${CONFIG.TIDAL_PLAYLIST_ID}`);
    try {
        await axios.get(`https://openapi.tidal.com/v2/playlists/${CONFIG.TIDAL_PLAYLIST_ID}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("✅ Playlist encontrada e acessível!");
    } catch (e) {
        console.error("❌ O TIDAL NÃO ENCONTROU ESTA PLAYLIST. Verifique se ela é PÚBLICA.");
        return;
    }

    // 2. Busca a música
    const searchRes = await axios.get(`https://openapi.tidal.com/v2/search?query=${encodeURIComponent(query)}&types=TRACKS&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const track = searchRes.data.tracks?.[0];
    if (!track) {
      console.log(`⚠️ Música "${query}" não encontrada.`);
      return;
    }

    // 3. Adiciona
    await axios.post(`https://openapi.tidal.com/v2/playlists/${CONFIG.TIDAL_PLAYLIST_ID}/items`, 
      { resourceIds: [track.id] }, 
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/vnd.tidal.v1+json' } }
    );

    console.log(`✅ DJ Mode: "${track.title}" adicionada!`);
  } catch (err) {
    console.error("❌ Erro API Tidal:", JSON.stringify(err.response?.data) || err.message);
  }
}

async function syncLastFmToTwitch() {
    if (!CONFIG.LASTFM_API_KEY) return;
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${CONFIG.LASTFM_USER}&api_key=${CONFIG.LASTFM_API_KEY}&format=json&limit=1`;
    const response = await axios.get(url);
    const track = response.data.recenttracks?.track[0];
    const isPlaying = track?.['@attr']?.nowplaying === 'true';
    const payload = isPlaying ? { track: track.name, artist: track.artist['#text'], image: track.image[2]['#text'] } : { track: "", artist: "", image: "" };
    
    const twitchToken = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + 60,
        channel_id: CONFIG.TWITCH_CHANNEL_ID,
        role: 'external',
        pubsub_perms: { send: ['broadcast'] }
    }, Buffer.from(CONFIG.TWITCH_EXTENSION_SECRET, 'base64'), { algorithm: 'HS256' });

    await axios.post('https://api.twitch.tv/helix/extensions/pubsub', {
        target: ['broadcast'], broadcaster_id: CONFIG.TWITCH_CHANNEL_ID, is_unauthenticated: false, message: JSON.stringify(payload)
    }, { headers: { 'Client-ID': CONFIG.TWITCH_CLIENT_ID, 'Authorization': `Bearer ${twitchToken}` } });
}