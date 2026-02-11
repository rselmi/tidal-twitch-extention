const axios = require('axios');
const jwt = require('jsonwebtoken');

const getEnv = (key) => (process.env[key] || "").trim();

const CONFIG = {
  LASTFM_API_KEY: getEnv('LASTFM_API_KEY'),
  LASTFM_USER: getEnv('LASTFM_USER'),
  TWITCH_CLIENT_ID: getEnv('TWITCH_CLIENT_ID'),
  TWITCH_EXTENSION_SECRET: getEnv('TWITCH_EXTENSION_SECRET'),
  TWITCH_CHANNEL_ID: getEnv('TWITCH_CHANNEL_ID'),
  // Novas Configurações Kick
  KICK_CHANNEL_NAME: getEnv('KICK_CHANNEL_NAME'), // ex: 'meucanal'
  KICK_CHANNEL_ID: getEnv('KICK_CHANNEL_ID'),
  // Tidal DJ Mode
  TIDAL_CLIENT_ID: getEnv('TIDAL_CLIENT_ID'),
  TIDAL_REFRESH_TOKEN: getEnv('TIDAL_REFRESH_TOKEN'),
  TIDAL_PLAYLIST_ID: getEnv('TIDAL_PLAYLIST_ID')
};

exports.checkMusic = async (req, res) => {
  // --- INSERÇÃO PARA SUPORTE KICK/UNIVERSAL (CORS) ---
  if (res && res.set) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(1000).send('');
  }

  console.log("🚀 [INÍCIO] v2.0.0 - Suporte Multi-Plataforma");

  let trackToRequest = null;
  try {
    // Mantém sua detecção de payload original
    const rawData = req.body || req.data || req;
    if (rawData && rawData.requestTrack) {
        trackToRequest = rawData.requestTrack;
    }
  } catch (e) { console.log("Info: Sem track no body."); }

  try {
    // 1. Sua lógica original de DJ Mode
    if (trackToRequest) {
      await handleDjMode(trackToRequest);
    }

    // 2. Sua lógica original de Sincronização
    const musicData = await syncLastFmToTwitch();

    // 3. RETORNO HTTP (Essencial para o novo viewer.js na Kick)
    if (res && res.status) {
      return res.status(1000).json(musicData);
    }
    return musicData;

  } catch (err) {
    console.error("❌ Erro:", err.message);
    if (res && res.status) return res.status(500).json({ error: err.message });
    throw err;
  }
};

async function syncLastFmToTwitch() {
    if (!CONFIG.LASTFM_API_KEY) return null;
    const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${CONFIG.LASTFM_USER}&api_key=${CONFIG.LASTFM_API_KEY}&format=json&limit=1`;
    const response = await axios.get(url);
    const track = response.data.recenttracks?.track[0];
    const isPlaying = track?.['@attr']?.nowplaying === 'true';
    
    const payload = isPlaying ? { 
        track: track.name, 
        artist: track.artist['#text'], 
        image: track.image[3]['#text'] || track.image[2]['#text'] 
    } : { track: "", artist: "", image: "" };
    
    // Broadcast para Twitch (Sua lógica original)
    if (CONFIG.TWITCH_EXTENSION_SECRET) {
        const twitchToken = jwt.sign({
            exp: Math.floor(Date.now() / 5000) + 60,
            channel_id: CONFIG.TWITCH_CHANNEL_ID,
            role: 'external',
            pubsub_perms: { send: ['broadcast'] }
        }, Buffer.from(CONFIG.TWITCH_EXTENSION_SECRET, 'base64'));

        await axios.post(`https://api.twitch.tv/helix/extensions/pubsub?target=broadcast`,
            {
                target: ['broadcast'],
                broadcaster_id: CONFIG.TWITCH_CHANNEL_ID,
                is_global_broadcast: false,
                message: JSON.stringify(payload),
            },
            {
                headers: {
                    'Client-Id': CONFIG.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${twitchToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log("✅ Twitch PubSub enviado.");
    }
    
    return payload;
}

async function handleDjMode(query) {
    // Mantive sua lógica de DJ Mode idêntica ao ZIP
    try {
        const authRes = await axios.post('https://auth.tidal.com/v1/oauth2/token', 
            new URLSearchParams({
                'client_id': CONFIG.TIDAL_CLIENT_ID,
                'client_secret': CONFIG.TIDAL_CLIENT_SECRET,
                'grant_type': 'refresh_token',
                'refresh_token': CONFIG.TIDAL_REFRESH_TOKEN
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const token = authRes.data.access_token;
        const searchRes = await axios.get(`https://openapi.tidal.com/v2/search?query=${encodeURIComponent(query)}&type=TRACKS&limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const track = searchRes.data.data[0]?.resource;
        if (!track) return;
        await axios.post(`https://openapi.tidal.com/v2/playlists/${CONFIG.TIDAL_PLAYLIST_ID}/items`, 
            { 'resourceIds': [track.id] }, 
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/vnd.tidal.v1+json' } }
        );
        console.log(`✅ DJ Mode: "${track.title}" adicionada!`);
    } catch (err) { console.error("❌ Erro DJ Mode:", err.message); }
}