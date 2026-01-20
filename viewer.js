/**
 * PROJETO: TidalWave Overlay Viewer
 * VERSÃO: 2.1.0
 * DESCRIÇÃO: Frontend híbrido para exibição de música tocando. 
 * Suporta PubSub (Twitch) e Polling (Kick/OBS).
 * MARCO: Estabilização de Interface Universal
 */

const twitch = (window.Twitch && window.Twitch.ext) ? window.Twitch.ext : null;
let history = [];
let currentTrackName = "";

// URL para Polling (Substitua pela sua URL de trigger da Function)
const BACKEND_URL = "https://us-central1-rselmi-bot.cloudfunctions.net/checkMusic";

/**
 * Inicialização - Twitch PubSub
 */
if (twitch) {
    twitch.onAuthorized((auth) => {
        console.log("v2.1.0: Twitch Autorizada");
    });

    twitch.listen('broadcast', (target, contentType, message) => {
        try {
            const data = JSON.parse(message);
            updateUI(data);
        } catch (e) {
            console.error("Erro PubSub:", e);
        }
    });
}

/**
 * Inicialização - Modo Universal (Polling)
 * Ativado para OBS, Kick e como segurança na Twitch
 */
async function pollStatus() {
    try {
        const response = await fetch(BACKEND_URL);
        if (response.ok) {
            const data = await response.json();
            updateUI(data);
        }
    } catch (e) {
        console.log("Polling: Backend offline ou aguardando.");
    }
}

// Executa polling a cada 5 segundos se não estivermos recebendo PubSub de forma ativa
setInterval(pollStatus, 5000);
pollStatus();

/**
 * Atualiza os elementos visuais na tela
 */
function updateUI(data) {
    const container = document.getElementById('player-container');
    if (!container) return;

    if (!data.track || data.track === "") {
        container.classList.remove('visible');
        currentTrackName = "";
        return;
    }

    if (data.track !== currentTrackName) {
        // Gerencia Histórico se música mudou
        if (currentTrackName !== "") {
            const oldTrack = {
                track: document.getElementById('track-title').innerText,
                artist: document.getElementById('artist-name').innerText,
                image: document.getElementById('album-art').src
            };
            manageHistory(oldTrack);
        }

        // Atualiza novos dados
        document.getElementById('track-title').innerText = data.track;
        document.getElementById('artist-name').innerText = data.artist;
        document.getElementById('album-art').src = data.image || 'https://via.placeholder.com/300/111/00f3ff?text=Tidal';
        
        currentTrackName = data.track;
        container.classList.add('visible');
    }
}

function manageHistory(track) {
    history.unshift(track);
    if (history.length > 3) history.pop();

    const list = document.getElementById('history-list');
    if (!list) return;

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