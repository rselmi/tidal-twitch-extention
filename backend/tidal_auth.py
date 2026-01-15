import requests
import time

# =================================================================
# DADOS DO SEU NOVO APP (5TgBdjmTB9CStJ2G)
# =================================================================
CLIENT_ID = '5TgBdjmTB9CStJ2G'
CLIENT_SECRET = 'FC3Wu4WAfl1dowXuCeYQnT5z3ukmZy3EIi0vm7r3IKo='

def run_device_flow():
    print("\n" + "="*60)
    print(" 🚀 TENTATIVA FINAL: DEVICE FLOW (SEM REDIRECT URI)")
    print(" Este método ignora o navegador e fala direto com a API.")
    print("="*60)

    # 1. Solicitar código do dispositivo
    # Note que NÃO enviamos redirect_uri aqui
    auth_url = "https://auth.tidal.com/v1/oauth2/device_authorization"
    payload = {
        'client_id': CLIENT_ID,
        'scope': 'playlists.read playlists.write user.read offline_access'
    }

    try:
        resp = requests.post(auth_url, data=payload)
        if resp.status_code != 200:
            print(f"❌ O Tidal rejeitou a chave: {resp.status_code}")
            print(f"Resposta: {resp.text}")
            return

        data = resp.json()
        user_code = data['user_code']
        device_code = data['device_code']
        # Link direto para você digitar o código
        verify_url = f"https://{data['verification_uri_complete']}"
        
        print(f"\n[!] PASSO 1: Acesse este link agora:\n{verify_url}")
        print(f"\n[!] PASSO 2: Confirme se o código no site é: {user_code}")
        
        # 2. Polling (esperando você autorizar no site)
        token_url = "https://auth.tidal.com/v1/oauth2/token"
        poll_payload = {
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'device_code': device_code,
            'grant_type': 'urn:ietf:params:oauth:grant-type:device_code'
        }

        print("\n[AGUARDANDO...] Aguardando você autorizar no navegador...")
        while True:
            r_token = requests.post(token_url, data=poll_payload)
            d_token = r_token.json()

            if r_token.status_code == 200:
                print("\n" + "⭐"*40)
                print("✅ SUCESSO! TOKEN GERADO:")
                print(d_token['refresh_token'])
                print("⭐"*40)
                break
            
            error = d_token.get('error')
            if error == 'authorization_pending':
                time.sleep(5)
            else:
                print(f"❌ Erro: {d_token}")
                break

    except Exception as e:
        print(f"❌ Falha crítica: {e}")

if __name__ == "__main__":
    run_device_flow()