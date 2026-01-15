import requests
import base64
import json

# =================================================================
# CONFIGURAÇÃO - USE AS MESMAS CREDENCIAIS DO SCRIPT DE AUTH
# =================================================================
CLIENT_ID = 'C7PjfLUdIyOJomaA'
CLIENT_SECRET = 'ZGwKE9lK29JSz9oyvklhrFYJPmh90Zmn5X1U9AVgWf4='
REFRESH_TOKEN = 'eyJraWQiOiJoUzFKYTdVMCIsImFsZyI6IkVTNTEyIn0.eyJ0eXBlIjoibzJfcmVmcmVzaCIsInVpZCI6NDA3NjkwMjksInNjb3BlIjoicGxheWxpc3RzLndyaXRlIHBsYXlsaXN0cy5yZWFkIHVzZXIucmVhZCIsImNpZCI6MjM0MTMsInNWZXIiOjEsImdWZXIiOjAsInVndiI6MCwiaXNzIjoiaHR0cHM6Ly9hdXRoLnRpZGFsLmNvbS92MSJ9.AHDh9cWQ9WGRwcBXNn7XrCDqiIIcjqbr2NfjHE8KiB4vG2jrTMq8Fn1nnBFKvy1ZUVkwIhVbLp4WYo_10O8BzRkkAC8G98rk41JsQy6JQVWL7CsNNJQAE9sxULF7E5neZDXnZbT7im4ArwMA3xwioMco_Lq1y1lSn51Ayc7LmQ1Pw1sN'

def verify_scopes():
    print("\n" + "="*60)
    print(" 🔍 DIAGNÓSTICO DE ESCOPOS (FINAL FIX)")
    print("="*60)
    
    token_url = "https://auth.tidal.com/v1/oauth2/token"
    
    # O Tidal WEB exige autenticação Basic no Header para Refresh Tokens
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_b64 = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    # Na renovação, NÃO enviaremos o parâmetro 'scope'. 
    # O OAuth2 especifica que, se omitido, o servidor deve devolver os 
    # escopos originais que foram autorizados no momento do login.
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': REFRESH_TOKEN,
        'client_id': CLIENT_ID
    }
    
    print(f"[LOG] Validando Refresh Token com o servidor...")
    
    try:
        response = requests.post(token_url, data=payload, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            # O Tidal pode retornar em 'scope' (espaços) ou 'user_scope' (vírgulas)
            scopes = data.get('scope', data.get('user_scope', ''))
            
            print(f"\n✅ TOKEN VALIDADO COM SUCESSO!")
            print(f"🔑 ESCÓPOS ATIVOS NESTE TOKEN: \n   {scopes if scopes else '[VAZIO]'}")
            print("-" * 60)
            
            if not scopes:
                print("❌ ERRO: O token não possui permissões associadas.")
                print("CAUSA: O Refresh Token foi gerado sem pedir os escopos no login.")
                print("SOLUÇÃO: Você deve rodar o 'backend/tidal_auth_pkce.py' novamente.")
            else:
                # Verifica os dois formatos possíveis (snake_case ou ponto)
                has_write = 'playlists.write' in scopes or 'WRITE_PLAYLISTS' in scopes
                if has_write:
                    print("💎 STATUS: TUDO PRONTO! O bot tem permissão de escrita.")
                else:
                    print("⚠️ STATUS: O token funciona, mas não tem permissão 'playlists.write'.")
            
            print(f"\n[INFO] Access Token para testes no Postman:\n{data.get('access_token')[:60]}...")
            
        else:
            print(f"\n❌ FALHA NA VALIDAÇÃO (Status {response.status_code})")
            print(f"Resposta: {response.text}")
            print("\n[DICA] Se o erro for 'invalid_scope', o Tidal não reconhece os escopos marcados no painel.")

    except Exception as e:
        print(f"\n❌ ERRO AO EXECUTAR: {e}")

if __name__ == "__main__":
    if "SUBSTITUA" in CLIENT_ID or "COLE_AQUI" in REFRESH_TOKEN:
        print("Preencha CLIENT_ID, CLIENT_SECRET e REFRESH_TOKEN no código.")
    else:
        verify_scopes()