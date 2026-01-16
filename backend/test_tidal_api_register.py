import requests
import json

# =================================================================
# CONFIGURAÇÕES (Use as credenciais que funcionaram no debug)
# =================================================================
CLIENT_ID = 'EfccOGFfZelf7KQg'
CLIENT_SECRET = 'nu3zUdBnxMXhYUb72eZ5y3vwYUw1f6Y2Bu0FFTmkCLg='
REFRESH_TOKEN = 'eyJraWQiOiJoUzFKYTdVMCIsImFsZyI6IkVTNTEyIn0.eyJ0eXBlIjoibzJfcmVmcmVzaCIsInVpZCI6NDA3NjkwMjksInNjb3BlIjoic2VhcmNoLndyaXRlIHVzZXIucmVhZCBwbGF5bGlzdHMucmVhZCBzZWFyY2gucmVhZCBwbGF5YmFjayBwbGF5bGlzdHMud3JpdGUiLCJjaWQiOjIzNDQ1LCJzVmVyIjoxLCJnVmVyIjowLCJ1Z3YiOjAsImlzcyI6Imh0dHBzOi8vYXV0aC50aWRhbC5jb20vdjEifQ.AHcM7mVxYuYZll-NDKIOQ0n2RZo-7g0uJAa2hvBNob1Fo8xNI6VM-FEWMeeoGqVcb2P3-rpVmgGdgT3NCy1_3fEnAZmuCoaC9vIIsyAYZ4k6_hXvEgBDm8eEwcOPLxeGn8_LUC8DZM3eWHtS4X0fXjnpAdmLknpFNq2QxTV5nHlS-pJn'

def get_access_token():
    """Renova o token para garantir que a sessão seja registrada agora."""
    url = "https://auth.tidal.com/v1/oauth2/token"
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': REFRESH_TOKEN,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }
    response = requests.post(url, data=payload)
    if response.status_code == 200:
        return response.json()['access_token']
    return None

def trigger_activity(token):
    headers = {'Authorization': f'Bearer {token}'}
    print("🚀 Iniciando sequência de atividade para o Dashboard...")

    # 1. TESTE DE SESSÃO (user.read)
    print("\n[ATIVIDADE 1] Consultando informações da sessão atual...")
    res_session = requests.get("https://api.tidal.com/v1/sessions", headers=headers)
    if res_session.status_code == 200:
        user_id = res_session.json().get('userId')
        print(f"✅ Sessão ativa para o Usuário ID: {user_id}")
    else:
        print(f"❌ Falha na sessão: {res_session.text}")
        return

    # 2. TESTE DE LEITURA (playlists.read)
    print("\n[ATIVIDADE 2] Listando suas playlists privadas...")
    res_list = requests.get(f"https://api.tidal.com/v1/users/{user_id}/playlists?countryCode=BR", headers=headers)
    if res_list.status_code == 200:
        items = res_list.json().get('items', [])
        print(f"✅ Sucesso! Você possui {len(items)} playlists.")
    else:
        print(f"❌ Falha ao ler playlists: {res_list.text}")

    # 3. TESTE DE ESCRITA (playlists.write) - O MAIS IMPORTANTE PARA LOGS
    print("\n[ATIVIDADE 3] Criando playlist 'LOG_TEST_BOT' para forçar registro...")
    create_url = f"https://api.tidal.com/v1/users/{user_id}/playlists?countryCode=BR"
    payload = {
        'title': 'API ACTIVITY LOG TEST',
        'description': 'Testando registro de atividade no painel do desenvolvedor'
    }
    res_create = requests.post(create_url, data=payload, headers=headers)
    
    if res_create.status_code in [200, 201]:
        playlist_id = res_create.json().get('uuid')
        print(f"✅ PLAYLIST CRIADA COM SUCESSO!")
        print(f"🆔 UUID da Playlist: {playlist_id}")
        print("\n--- VERIFICAÇÃO ---")
        print("1. Abra seu app do Tidal (Celular/PC).")
        print(f"2. Procure pela playlist: '{payload['title']}'.")
        print("3. Se ela estiver lá, a API está 100% funcional para o seu usuário.")
        print("4. Aguarde de 5 a 15 minutos e cheque o Dashboard do Tidal.")
    else:
        print(f"❌ Falha na escrita: {res_create.text}")

if __name__ == "__main__":
    access_token = get_access_token()
    if access_token:
        trigger_activity(access_token)
    else:
        print("❌ Não foi possível renovar o token. Verifique as credenciais.")