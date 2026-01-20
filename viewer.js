// Identifica se estamos na Twitch
const twitch = (window.Twitch && window.Twitch.ext) ? window.Twitch.ext : null;
let history = [];
let currentTrackName = "";

// --- CONFIGURAÇÃO ---
// Insira aqui a URL da sua Cloud Function após o deploy
const BACKEND_URL = "https://tidal-twitch-ebs-444035856400.southamerica-east1.run.app";

// 1. LÓGICA TWITCH (ORIGINAL DO SEU ZIP)
if (twitch) {
    twitch.onAuthorized((auth) => {
        console.log("TidalWave: Autorizado na Twitch");
    });

    twitch.listen('broadcast', (target, contentType, message) => {
        try {
            const data = JSON.parse(message);
            updateOverlayUI(data);
        } catch (e) {
            console.error("Erro ao processar PubSub:", e);
        }
    });
}

// 2. LÓGICA UNIVERSAL (KICK / OBS)
if (!twitch || !window.frameElement) {
    console.log("TidalWave: Modo Universal Ativado");
    
    async function pollMusic() {
        try {
            const response = await fetch(BACKEND_URL);
            const data = await response.json();
            updateOverlayUI(data);
        } catch (e) {
            console.error("Erro no Polling:", e);
        }
    }

    setInterval(pollMusic, 5000);
    pollMusic();
}

// 3. LÓGICA DE INTERFACE (SUA LÓGICA ORIGINAL)
function updateOverlayUI(data) {
    const container = document.getElementById('player-container');
    
    if (!data.track || data.track === "") {
        container.classList.remove('visible');
        currentTrackName = "";
        return;
    }

    if (data.track !== currentTrackName) {
        // Histórico
        if (currentTrackName !== "") {
            updateHistory({
                track: document.getElementById('track-title').innerText,
                artist: document.getElementById('artist-name').innerText,
                image: document.getElementById('album-art').src
            });
        }

        // Atualização dos elementos (IDs mantidos do seu HTML)
        document.getElementById('track-title').innerText = data.track;
        document.getElementById('artist-name').innerText = data.artist;
        document.getElementById('album-art').src = data.image || 'https://via.placeholder.com/300/111/00f3ff?text=Tidal';
        
        currentTrackName = data.track;
        container.classList.add('visible');
    }
}

function updateHistory(oldTrack) {
    history.unshift(oldTrack);
    if (history.length > 3) history.pop();

    const list = document.getElementById('history-list');
    list.innerHTML = "";

    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <img src="${item.image}">
            <div class="history-info">
                <span class="history-title">${item.track}</span>
                <span class="history-artist">${item.artist}</span>
            </div>
        `;
        list.appendChild(div);
    });
}