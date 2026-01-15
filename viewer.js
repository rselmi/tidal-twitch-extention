const twitch = window.Twitch.ext;
let history = [];

twitch.onAuthorized((auth) => {
    console.log("TidalWave: Autorizado");
});

twitch.listen('broadcast', (target, contentType, message) => {
    try {
        const data = JSON.parse(message);
        console.log("Mensagem recebida:", data);

        const container = document.getElementById('player-container');
        
        // Se a mensagem for vazia, esconde o overlay
        if (!data.track || data.track === "") {
            container.classList.remove('visible');
            return;
        }

        // Se for uma música nova (diferente da atual)
        const currentTitle = document.getElementById('track-title').innerText;
        if (data.track !== currentTitle && currentTitle !== "") {
            updateHistory({
                track: document.getElementById('track-title').innerText,
                artist: document.getElementById('artist-name').innerText,
                image: document.getElementById('album-art').src
            });
        }

        // Atualiza o Card Principal
        document.getElementById('track-title').innerText = data.track;
        document.getElementById('artist-name').innerText = data.artist;
        document.getElementById('album-art').src = data.image || 'https://via.placeholder.com/300/111/00f3ff?text=Tidal';
        
        container.classList.add('visible');

    } catch (e) {
        console.error("Erro ao processar PubSub:", e);
    }
});

function updateHistory(oldTrack) {
    // Adiciona ao início do array
    history.unshift(oldTrack);
    // Mantém apenas as últimas 3
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