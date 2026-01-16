/**
 * TidalWave Viewer v2.0.1
 * Suporte Robusto: Twitch Extension e Polling para Kick/OBS
 */

let history = [];
let currentTrackName = "";
const BACKEND_URL = "https://us-central1-seu-projeto.cloudfunctions.net/checkMusic"; // CERTIFIQUE-SE DE QUE ESTA URL ESTÁ CORRETA

// Função para processar a atualização da UI (Sua lógica original do ZIP)
function updateOverlayUI(data) {
    const container = document.getElementById('player-container');
    if (!container) return;
    
    if (!data || !data.track || data.track === "") {
        container.classList.remove('visible');
        currentTrackName = "";
        return;
    }

    if (data.track !== currentTrackName) {
        if (currentTrackName !== "") {
            updateHistory({
                track: document.getElementById('track-title').innerText,
                artist: document.getElementById('artist-name').innerText,
                image: document.getElementById('album-art').src
            });
        }

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

// Lógica de Inicialização
window.onload = () => {
    // Verifica se estamos na Twitch
    if (window.Twitch && window.Twitch.ext) {
        const twitch = window.Twitch.ext;

        twitch.onAuthorized((auth) => {
            console.log("TidalWave: Autorizado pela Twitch");
        });

        // Escuta o PubSub
        twitch.listen('broadcast', (target, contentType, message) => {
            try {
                const data = JSON.parse(message);
                updateOverlayUI(data);
            } catch (e) {
                console.error("Erro no PubSub:", e);
            }
        });
    }

    // SEMPRE ativa o Polling como segurança (Fallback)
    // Isso garante que se o PubSub falhar, o Polling assume em 5 segundos
    async function runPolling() {
        try {
            const response = await fetch(BACKEND_URL);
            if (response.ok) {
                const data = await response.json();
                updateOverlayUI(data);
            }
        } catch (e) {
            console.error("Erro no Polling de segurança:", e);
        }
    }

    setInterval(runPolling, 5000);
    runPolling(); // Primeira execução
};