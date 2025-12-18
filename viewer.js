/**
 * viewer.js - Lógica final para a Extensão em modo Video Overlay
 */

const container = document.getElementById('player-container');
const trackTitle = document.getElementById('track-title');
const artistName = document.getElementById('artist-name');
const albumArt = document.getElementById('album-art');
const historyList = document.getElementById('history-list');

// Lista para armazenar o histórico na sessão do espectador
let musicHistory = [];
const MAX_HISTORY = 2; // Quantas músicas anteriores mostrar além da atual

// Inicialização da Twitch Extension Helper
if (window.Twitch && window.Twitch.ext) {
    
    // Log para depuração inicial
    console.log("📡 Extensão Tidal carregada em modo Overlay.");

    // Escuta as transmissões do seu EBS (Google Cloud ou Local)
    window.Twitch.ext.listen('broadcast', (target, contentType, message) => {
        try {
            const data = JSON.parse(message);
            
            // Se o payload indicar que a música parou
            if (!data || !data.track || data.track.trim() === "") {
                console.log("⏹️ Música interrompida.");
                container.classList.remove('visible');
                return;
            }

            // Evita duplicados (se o polling enviar a mesma música várias vezes)
            if (musicHistory.length > 0 && data.track === musicHistory[0].track && data.artist === musicHistory[0].artist) {
                return;
            }

            // Adiciona a nova música ao topo do histórico
            musicHistory.unshift({
                track: data.track,
                artist: data.artist,
                image: data.image
            });

            // Mantém o limite de histórico para não poluir a tela
            if (musicHistory.length > (MAX_HISTORY + 1)) {
                musicHistory.pop();
            }

            // Atualiza a interface visual
            renderOverlayUI();
            
        } catch (err) {
            console.error('❌ Erro ao processar dados:', err);
        }
    });
}

/**
 * Reconstrói a interface com a música principal e o histórico idêntico
 */
function renderOverlayUI() {
    if (musicHistory.length === 0) return;

    // 1. Música Principal (Primeiro item do array)
    const current = musicHistory[0];
    trackTitle.innerText = current.track;
    artistName.innerText = current.artist;
    // Fallback caso não haja imagem
    albumArt.src = current.image || 'https://via.placeholder.com/400/111111/00f3ff?text=Tidal';

    // 2. Histórico (Demais itens do array)
    historyList.innerHTML = "";
    
    for (let i = 1; i < musicHistory.length; i++) {
        const item = musicHistory[i];
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item track-card';
        
        // Estrutura idêntica à principal (conforme solicitado)
        historyItem.innerHTML = `
            <img class="album-art" src="${item.image}" alt="Capa Anterior">
            <h1 class="title-text">${item.track}</h1>
            <h2 class="artist-text">${item.artist}</h2>
        `;
        
        historyList.appendChild(historyItem);
    }

    // Exibe o widget com a animação de opacidade definida no CSS
    container.style.display = 'flex';
    setTimeout(() => {
        container.classList.add('visible');
    }, 100);
}