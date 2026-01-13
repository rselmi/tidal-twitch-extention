import http.server
import socketserver
import webbrowser
import requests
import base64
import hashlib
import secrets
import string
import json
from urllib.parse import urlparse, parse_qs, quote

# =================================================================
# CONFIGURAÇÃO - PORTAL TIDAL DEVELOPER
# =================================================================
CLIENT_ID = 'jbkZUHICf6RZRXN5'
CLIENT_SECRET = 'YNfilqaPUAFuTLiw8eGFNFBebOBH2r7AgObAj3GANCA='
REDIRECT_URI = 'http://localhost:8080'

AUTH_ENDPOINT = "https://login.tidal.com/authorize"
TOKEN_ENDPOINT = "https://auth.tidal.com/v1/oauth2/token"

def generate_pkce():
    """Gera PKCE RFC 7636 - O segredo para o Tidal aceitar o App Web."""
    # Verifier precisa ter entre 43 e 128 caracteres
    verifier = secrets.token_urlsafe(64) 
    sha256_hash = hashlib.sha256(verifier.encode('ascii')).digest()
    # Remove padding '=' para evitar erro 'Algo deu errado'
    challenge = base64.urlsafe_b64encode(sha256_hash).decode('ascii').rstrip('=')
    return verifier, challenge

CODE_VERIFIER, CODE_CHALLENGE = generate_pkce()

class TidalAuthHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args): return
    
    def do_GET(self):
        query_data = parse_qs(urlparse(self.path).query)
        
        if 'code' in query_data:
            auth_code = query_data['code'][0]
            print(f"\n[+] Código recebido. Trocando por Token...")

            # Para Web Apps, enviamos Secret + Verifier
            payload = {
                'grant_type': 'authorization_code',
                'code': auth_code,
                'redirect_uri': REDIRECT_URI,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'code_verifier': CODE_VERIFIER
            }
            
            try:
                response = requests.post(TOKEN_ENDPOINT, data=payload)
                result = response.json()
                
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                
                if 'refresh_token' in result:
                    print("\n" + "✅"*20)
                    print("SUCESSO! COPIE O REFRESH TOKEN:")
                    print(result['refresh_token'])
                    print("✅"*20)
                    
                    self.wfile.write(b"<h1>Sucesso! Verifique o console.</h1>")
                else:
                    print(f"❌ Erro na troca: {json.dumps(result)}")
                    self.wfile.write(b"<h1>Erro na troca do token.</h1>")
            except Exception as e:
                print(f"❌ Falha: {e}")
        
        self.send_response(200)
        self.end_headers()

def run():
    # REMOVIDO: offline_access (Muitas vezes causa o erro 'Algo deu errado' em Web Apps)
    # REMOVIDO: state (Para simplificar a validação do servidor)
    scopes = "playlists.read playlists.write"
    
    login_url = (
        f"{AUTH_ENDPOINT}?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={quote(REDIRECT_URI)}&"
        f"scope={quote(scopes)}&"
        f"response_type=code&"
        f"code_challenge_method=S256&"
        f"code_challenge={CODE_CHALLENGE}"
    )
    
    print(f"\n[!] Abrindo login do Tidal...")
    print(f"[IMPORTANTE] Use uma JANELA ANONIMA se o erro persistir.")
    webbrowser.open(login_url)
    
    with socketserver.TCPServer(("", 8080), TidalAuthHandler) as httpd:
        httpd.handle_request()

if __name__ == "__main__":
    run()