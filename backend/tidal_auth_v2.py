import http.server
import socketserver
import webbrowser
import requests
import base64
import hashlib
import secrets
import json
import logging
import urllib.parse

# Configuração de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# =================================================================
# DADOS DO APP (C7PjfLUdIyOJomaA)
# =================================================================
CLIENT_ID = 'EfccOGFfZelf7KQg'
CLIENT_SECRET = 'nu3zUdBnxMXhYUb72eZ5y3vwYUw1f6Y2Bu0FFTmkCLg='
REDIRECT_URI = 'http://localhost:8080'

def generate_pkce():
    verifier = secrets.token_urlsafe(64)
    sha256_hash = hashlib.sha256(verifier.encode('ascii')).digest()
    challenge = base64.urlsafe_b64encode(sha256_hash).decode('ascii').rstrip('=')
    return verifier, challenge

CODE_VERIFIER, CODE_CHALLENGE = generate_pkce()

class TidalAuthHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass

    def do_GET(self):
        query_data = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        
        if 'code' in query_data:
            auth_code = query_data['code'][0]
            logging.info("✅ Código capturado! Iniciando troca...")

            payload = {
                'grant_type': 'authorization_code',
                'code': auth_code,
                'redirect_uri': REDIRECT_URI,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'code_verifier': CODE_VERIFIER
            }
            
            try:
                auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
                auth_b64 = base64.b64encode(auth_str.encode()).decode()
                headers = {'Authorization': f'Basic {auth_b64}'}

                response = requests.post("https://auth.tidal.com/v1/oauth2/token", data=payload, headers=headers)
                result = response.json()
                
                if response.status_code == 200 and 'refresh_token' in result:
                    print("\n" + "⭐"*60)
                    print(" ✅ NOVO TOKEN GERADO COM SUCESSO!")
                    print(f" REFRESH TOKEN: {result['refresh_token']}")
                    print("⭐"*60 + "\n")
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"Autenticado! Verifique o console.")
                else:
                    logging.error(f"Erro: {result}")
            except Exception as e:
                logging.error(f"Erro: {e}")
        return

def run():
    # ADICIONADO: r_usr (conforme solicitado pelo erro 403 do Tidal)
    # REMOVIDO: offline_access (conforme seu teste de sucesso anterior)
    scopes = "playlists.read playlists.write user.read search.read search.write playback"
    
    query_params = {
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': scopes,
        'response_type': 'code',
        'code_challenge_method': 'S256',
        'code_challenge': CODE_CHALLENGE
    }
    
    encoded_query = urllib.parse.urlencode(query_params, quote_via=urllib.parse.quote)
    login_url = f"https://login.tidal.com/authorize?{encoded_query}"
    
    print("\n" + "="*70)
    print(" 🛠️  RESTAURAÇÃO DE TOKEN (AJUSTE DE ESCOPOS)")
    print("="*70)
    print(f"[*] Escopos: {scopes}")
    print(f"[*] URL:\n{login_url}")
    print("="*70 + "\n")
    
    webbrowser.open(login_url)
    
    try:
        socketserver.TCPServer.allow_reuse_address = True
        server = socketserver.TCPServer(("", 8080), TidalAuthHandler)
        server.handle_request()
        server.server_close()
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    if "SUBSTITUA" in CLIENT_SECRET:
        print("❌ Preencha o CLIENT_SECRET.")
    else:
        run()