# Passo a Passo Técnico: Integração Tidal-Last.fm-Twitch

Este documento detalha o procedimento técnico para implementar uma extensão do Twitch.tv que exibe a música em reprodução no Tidal, utilizando o Last.fm como serviço intermediário. Esta abordagem é a mais recomendada por ser a única em conformidade com os Termos de Serviço (ToS) do Tidal.

## 1. Pré-requisitos e Configuração Inicial

A implementação requer a configuração de três ambientes principais: Tidal/Last.fm, Last.fm API e Twitch Extension.

### 1.1. Configuração do Usuário (Streamer)

O *streamer* deve garantir que o Tidal esteja enviando os dados de reprodução para o Last.fm.

1.  **Conexão Tidal e Last.fm:** O *streamer* deve acessar as configurações de sua conta Tidal e conectar o serviço ao Last.fm, ativando o recurso de *scrobbling*.
2.  **Obtenção do Nome de Usuário do Last.fm:** O nome de usuário do Last.fm será necessário para que o *backend* da extensão possa consultar a API.

### 1.2. Configuração da API do Last.fm

O desenvolvedor precisa de uma chave de API para consultar o status de reprodução.

1.  **Registro de Desenvolvedor:** Crie uma conta de desenvolvedor no Last.fm e registre uma nova aplicação para obter a **API Key** e o **Shared Secret** [^1].
2.  **Endpoint Principal:** O *endpoint* a ser utilizado é `user.getrecenttracks`, que retorna as faixas mais recentemente ouvidas por um usuário.

### 1.3. Configuração da Extensão do Twitch

É necessário criar a estrutura básica da extensão no Twitch Developer Console.

1.  **Criação da Extensão:** Crie uma nova extensão no Twitch Developer Console, definindo o tipo como "Video Overlay" ou "Panel", dependendo da preferência de exibição.
2.  **Configuração do EBS:** O **Extension Backend Service (EBS)** é o servidor que hospedará a lógica de comunicação com a API do Last.fm. O EBS deve ser configurado para aceitar requisições HTTPS.
3.  **Obtenção de Credenciais:** Obtenha o **Extension Client ID** e o **Extension Secret** (necessário para validar o JWT e autenticar o EBS).

## 2. Estrutura da Extensão Twitch

A extensão será dividida em dois componentes principais: o *backend* (EBS) e o *frontend* (iFrame).

### 2.1. Componente Backend (EBS)

O EBS será um servidor rodando em *background* (ex: Node.js com Express, Python com Flask) e terá duas responsabilidades principais:

1.  **Armazenamento de Credenciais:** Armazenar de forma segura a **API Key do Last.fm** e o **Nome de Usuário do Last.fm** do *streamer* (obtido durante a configuração da extensão).
2.  **Lógica de Consulta e Publicação:** Implementar a rotina de consulta à API do Last.fm e a publicação dos dados no Twitch PubSub.

### 2.2. Componente Frontend (iFrame)

O *frontend* é o código HTML/CSS/JavaScript que será executado no navegador do espectador, dentro do iFrame da extensão. Sua única responsabilidade é:

1.  **Conexão PubSub:** Conectar-se ao Twitch PubSub usando o **Extension Helper** [^2].
2.  **Exibição:** Receber as mensagens do EBS e atualizar a interface com o título da música e o artista.

## 3. Implementação da Lógica do EBS (Consulta Last.fm e PubSub)

Esta é a etapa central da integração. O EBS deve ser configurado para rodar um *loop* de consulta periódica.

### 3.1. Função de Consulta ao Last.fm

A função deve fazer uma requisição HTTP GET para o *endpoint* `user.getrecenttracks`.

**URL de Exemplo (Last.fm API):**

```
http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user={NOME_USUARIO}&api_key={API_KEY}&format=json&limit=1
```

**Parâmetros Chave:**

*   `method=user.getrecenttracks`: Método para obter as faixas recentes.
*   `user={NOME_USUARIO}`: Nome de usuário do Last.fm do *streamer*.
*   `api_key={API_KEY}`: Sua chave de API do Last.fm.
*   `format=json`: Formato de resposta desejado.
*   `limit=1`: Limita a resposta à faixa mais recente.

### 3.2. Lógica de Processamento e Publicação

O EBS deve executar a seguinte rotina a cada **10 a 15 segundos** (para evitar sobrecarga na API do Last.fm e no PubSub do Twitch):

1.  **Consulta:** Chamar a função de consulta ao Last.fm.
2.  **Verificação:** Analisar a resposta JSON. A faixa em reprodução é identificada pelo atributo `@attr.nowplaying` com valor `true` [^3].
3.  **Extração de Dados:** Se a faixa estiver em reprodução, extrair o **título da faixa**, **artista** e **álbum**.
4.  **Publicação no PubSub:** Se a música for diferente da última publicada, ou se for a primeira vez, o EBS deve enviar uma mensagem para o Twitch PubSub.

**Exemplo de Payload (JSON) para o PubSub:**

```json
{
  "track": "Título da Música",
  "artist": "Nome do Artista",
  "album": "Nome do Álbum"
}
```

A chamada de API do Twitch para enviar a mensagem PubSub deve ser autenticada com o **Extension Secret** e direcionada ao canal do *streamer* [^2].

## 4. Implementação da Lógica do Frontend (Exibição)

O código JavaScript do *frontend* deve se conectar ao Twitch PubSub e reagir às mensagens do EBS.

### 4.1. Conexão e Inicialização

O *frontend* deve carregar o **Twitch Extension Helper** e inicializar a conexão.

```javascript
// Exemplo de inicialização no frontend
Twitch.ext.onAuthorized(function(auth) {
    // Conectado e autenticado
    console.log('Extensão autorizada para o canal:', auth.channelId);
});
```

### 4.2. Recebimento de Mensagens

O método `Twitch.ext.listen` é usado para ouvir as mensagens enviadas pelo EBS.

```javascript
// Exemplo de escuta de mensagens do EBS
Twitch.ext.listen('broadcast', function (target, contentType, message) {
    const data = JSON.parse(message);
    
    // Atualizar a interface do usuário (DOM)
    document.getElementById('track-title').innerText = data.track;
    document.getElementById('artist-name').innerText = data.artist;
    
    // Lógica de animação/exibição
});
```

## 5. Documentação e Entrega

O projeto final deve incluir:

1.  **Código-Fonte do EBS:** O servidor com a lógica de consulta e PubSub.
2.  **Código-Fonte do Frontend:** O HTML, CSS e JavaScript para a interface da extensão.
3.  **Instruções de Configuração:** Um guia claro para o *streamer* sobre como conectar o Tidal ao Last.fm e como inserir o nome de usuário na configuração da extensão.

***

### Referências

[^1]: [Last.fm API - Get an API Key](https://www.last.fm/api/account/create)
[^2]: [Twitch Developers - Extensions Reference](https://dev.twitch.tv/docs/extensions/reference/)
[^3]: [Last.fm API - user.getrecenttracks](https://www.last.fm/api/show/user.getrecenttracks)
