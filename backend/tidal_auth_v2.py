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
CLIENT_ID = 'C7PjfLUdIyOJomaA'
CLIENT_SECRET = 'ZGwKE9lK29JSz9oyvklhrFYJPmh90Zmn5X1U9AVgWf4='
REDIRECT_URI = 'http://localhost:8080'

def generate_pkce():
    """Gera o verifier e o challenge necessários para o PKCE"""
    verifier = secrets.token_urlsafe(64)
    sha256_hash = hashlib.sha256(verifier.encode('ascii')).digest()
    challenge = base64.urlsafe_b64encode(sha256_hash).decode('ascii').rstrip('=')
    return verifier, challenge

CODE_VERIFIER, CODE_CHALLENGE = generate_pkce()

class TidalAuthHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass

    def do_GET(self):
        logging.info(f"Retorno detectado: {self.path}")
        parsed_path = urllib.parse.urlparse(self.path)
        query_data = urllib.parse.parse_qs(parsed_path.query)
        
        if 'error' in query_data:
            logging.error(f"❌ ERRO DO TIDAL: {query_data['error'][0]}")
            if 'error_description' in query_data:
                logging.error(f"Descrição: {query_data['error_description'][0]}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Erro detectado. Olhe o terminal.")
            return

        if 'code' in query_data:
            auth_code = query_data['code'][0]
            logging.info("✅ Código capturado! Iniciando troca por Token...")

            payload = {
                'grant_type': 'authorization_code',
                'code': auth_code,
                'redirect_uri': REDIRECT_URI,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'code_verifier': CODE_VERIFIER  # Obrigatório por causa do PKCE
            }
            
            try:
                # O Tidal exige Basic Auth no Header para clientes Web
                auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
                auth_b64 = base64.b64encode(auth_str.encode()).decode()
                headers = {'Authorization': f'Basic {auth_b64}'}

                response = requests.post("https://auth.tidal.com/v1/oauth2/token", data=payload, headers=headers)
                result = response.json()
                
                if response.status_code == 200 and 'refresh_token' in result:
                    print("\n" + "⭐"*60)
                    print(" ✅ SUCESSO! TOKEN GERADO:")
                    print(result['refresh_token'])
                    print("⭐"*60 + "\n")
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"Autenticado com sucesso! Pode fechar.")
                else:
                    logging.error(f"Falha na troca: {result}")
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
            except Exception as e:
                logging.error(f"Erro de rede: {e}")
        return

def run():
    # Estratégia: Incluir offline_access com PKCE.
    # Se o erro "Algo deu errado" voltar, remova apenas 'offline_access' novamente.
    scopes = "playlists.read playlists.write user.read"
    
    query_params = {
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'scope': scopes,
        'response_type': 'code',
        'code_challenge_method': 'S256',
        'code_challenge': CODE_CHALLENGE
    }
    
    # RFC 3986: %20 para espaços
    encoded_query = urllib.parse.urlencode(query_params, quote_via=urllib.parse.quote)
    login_url = f"https://login.tidal.com/authorize?{encoded_query}"
    
    print("\n" + "="*70)
    print(" 🛠️  VERSÃO RESTAURADA - PKCE + OFFLINE_ACCESS")
    print("="*70)
    print(f"[*] URL Gerada:\n{login_url}")
    print("="*70 + "\n")
    
    webbrowser.open(login_url)
    
    try:
        socketserver.TCPServer.allow_reuse_address = True
        server = socketserver.TCPServer(("", 8080), TidalAuthHandler)
        print("[STATUS] Aguardando o Tidal abrir a tela de permissoes...")
        server.handle_request()
        server.server_close()
    except Exception as e:
        print(f"Erro no servidor: {e}")

if __name__ == "__main__":
    if "SUBSTITUA" in CLIENT_SECRET:
        print("❌ Preencha o CLIENT_SECRET.")
    else:
        run()