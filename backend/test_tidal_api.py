import requests
import json

# =================================================================
# CONFIGURAÇÕES
# =================================================================
CLIENT_ID = 'EfccOGFfZelf7KQg'
CLIENT_SECRET = 'nu3zUdBnxMXhYUb72eZ5y3vwYUw1f6Y2Bu0FFTmkCLg='
REFRESH_TOKEN = 'eyJraWQiOiJoUzFKYTdVMCIsImFsZyI6IkVTNTEyIn0.eyJ0eXBlIjoibzJfcmVmcmVzaCIsInVpZCI6NDA3NjkwMjksInNjb3BlIjoic2VhcmNoLndyaXRlIHVzZXIucmVhZCBwbGF5bGlzdHMucmVhZCBzZWFyY2gucmVhZCBwbGF5YmFjayBwbGF5bGlzdHMud3JpdGUiLCJjaWQiOjIzNDQ1LCJzVmVyIjoxLCJnVmVyIjowLCJ1Z3YiOjAsImlzcyI6Imh0dHBzOi8vYXV0aC50aWRhbC5jb20vdjEifQ.AHcM7mVxYuYZll-NDKIOQ0n2RZo-7g0uJAa2hvBNob1Fo8xNI6VM-FEWMeeoGqVcb2P3-rpVmgGdgT3NCy1_3fEnAZmuCoaC9vIIsyAYZ4k6_hXvEgBDm8eEwcOPLxeGn8_LUC8DZM3eWHtS4X0fXjnpAdmLknpFNq2QxTV5nHlS-pJn'

def get_access_token():
    url = "https://auth.tidal.com/v1/oauth2/token"
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': REFRESH_TOKEN,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    }
    response = requests.post(url, data=payload)
    return response.json().get('access_token') if response.status_code == 200 else None

def get_track_details(token, track_id="549301"): # ID de 'In The End'
    """
    Testa se o token consegue ler uma música diretamente pelo ID.
    Este endpoint costuma exigir apenas 'user.read'.
    """
    print(f"\n[1/2] Tentando ler detalhes da música ID: {track_id}...")
    url = f"https://api.tidal.com/v1/tracks/{track_id}?countryCode=BR"
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        track = response.json()
        print(f"✅ SUCESSO! Música: {track['title']} - {track['artist']['name']}")
        return True
    else:
        print(f"❌ Erro ao ler música: {response.status_code} - {response.text}")
        return False

def test_playlist_addition(token, track_id="549301"):
    """
    Testa se o token consegue criar uma playlist e adicionar o ID.
    """
    print("\n[2/2] Testando criação de playlist e escrita...")
    headers = {'Authorization': f'Bearer {token}'}
    
    # 1. Pegar User ID
    user_data = requests.get("https://api.tidal.com/v1/sessions", headers=headers).json()
    uid = user_data.get('userId')
    
    # 2. Criar Playlist
    create_url = f"https://api.tidal.com/v1/users/{uid}/playlists?countryCode=BR"
    res = requests.post(create_url, data={'title': 'Teste Bot Final', 'description': 'Bot'}, headers=headers)
    
    if res.status_code in [200, 201]:
        pid = res.json()['uuid']
        print(f"✅ Playlist criada: {pid}")
        
        # 3. Adicionar Música
        add_url = f"https://api.tidal.com/v1/playlists/{pid}/items?countryCode=BR"
        # Importante: trackIds deve ser uma string de IDs separados por vírgula
        add_res = requests.post(add_url, data={'trackIds': track_id, 'onArtifactNotFound': 'FAIL'}, headers=headers)
        
        if add_res.status_code in [200, 201]:
            print("✅ SUCESSO ABSOLUTO! Música adicionada à playlist.")
        else:
            print(f"❌ Erro na escrita: {add_res.text}")
    else:
        print(f"❌ Erro ao criar playlist: {res.text}")

if __name__ == "__main__":
    token = get_access_token()
    if token:
        if get_track_details(token):
            test_playlist_addition(token)