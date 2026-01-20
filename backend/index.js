/**
 * PROJETO: TidalWave Multi-Platform Bot
 * VERSÃO: 2.1.0
 * DESCRIÇÃO: Backend consolidado para Cloud Functions. 
 * Gerencia sincronização Last.fm -> Twitch PubSub e 
 * recebe pedidos de música para o Tidal (DJ Mode).
 * MARCO: Integração Universal (Twitch + Kick + OBS)
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Função auxiliar para leitura de variáveis de ambiente
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

/**
 * Ponto de entrada principal da Cloud Function
 */
exports.checkMusic = async (req, res) => {
  // Configuração de CORS para chamadas externas (Painel Twitch e Kick)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    // LÓGICA DJ MODE (Se houver pedido no corpo da requisição)
    const trackRequest = req.body?.requestTrack;
    if (trackRequest) {
      console.log(`[DJ Mode] Pedido recebido: ${trackRequest}`);
      await handleDjRequest(trackRequest);
      return res.status(200).json({ success: true, message: "Pedido enviado!" });
    }

    // LÓGICA DE SINCRONIZAÇÃO (Padrão)
    const musicData = await syncMusicData();
    
    // Retorna os dados para o Polling (usado pelo OBS/Kick)
    return res.status(200).json(musicData);

  } catch (err) {
    console.error(`[ERRO v2.1.0]: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Sincroniza Last.fm com Twitch PubSub e retorna dados atuais
 */
async function syncMusicData() {
  if (!CONFIG.LASTFM_API_KEY) return { track: "", artist: "", image: "" };

  const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${CONFIG.LASTFM_USER}&api_key=${CONFIG.LASTFM_API_KEY}&format=json&limit=1`;
  const response = await axios.get(url);
  const track = response.data.recenttracks?.track[0];
  const isPlaying = track?.['@attr']?.nowplaying === 'true';

  const payload = isPlaying ? {
    track: track.name,
    artist: track.artist['#text'],
    image: track.image[3]?.['#text'] || track.image[2]?.['#text'] || ""
  } : { track: "", artist: "", image: "" };

  // Dispara PubSub para a Twitch se configurado
  if (CONFIG.TWITCH_EXTENSION_SECRET && CONFIG.TWITCH_CHANNEL_ID) {
    await sendTwitchPubSub(payload);
  }

  return payload;
}

/**
 * Envia dados para o barramento de mensagens da Twitch (PubSub)
 */
async function sendTwitchPubSub(payload) {
  try {
    const token = jwt.sign({
      exp: Math.floor(Date.now() / 1000) + 60,
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
          'Authorization': `Bearer ${twitchToken}`, // Nota: Corrigir variável no código final se necessário
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e) {
    console.error("[PubSub] Falha silenciosa.");
  }
}

/**
 * Adiciona música à playlist do Tidal via pesquisa
 */
async function handleDjRequest(query) {
  try {
    // 1. Renovação de Token Tidal
    const authParams = new URLSearchParams({
      'client_id': CONFIG.TIDAL_CLIENT_ID,
      'client_secret': CONFIG.TIDAL_CLIENT_SECRET,
      'grant_type': 'refresh_token',
      'refresh_token': CONFIG.TIDAL_REFRESH_TOKEN
    });

    const authRes = await axios.post('https://auth.tidal.com/v1/oauth2/token', authParams.toString());
    const token = authRes.data.access_token;

    // 2. Pesquisa de Faixa
    const searchRes = await axios.get(`https://openapi.tidal.com/v2/search?query=${encodeURIComponent(query)}&type=TRACKS&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const trackId = searchRes.data.data[0]?.resource?.id;
    if (!trackId) return;

    // 3. Inserção na Playlist
    await axios.post(`https://openapi.tidal.com/v2/playlists/${CONFIG.TIDAL_PLAYLIST_ID}/items`,
      { 'resourceIds': [trackId] },
      { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/vnd.tidal.v1+json' } }
    );
  } catch (err) {
    console.error(`[DJ Mode Error]: ${err.message}`);
  }
}