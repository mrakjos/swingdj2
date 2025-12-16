import { pkceChallenge, randomString } from './pkce';

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private'
].join(' ');

export async function startLogin(clientId: string, redirectUri: string) {
  const verifier = randomString(64);
  const challenge = await pkceChallenge(verifier);
  const state = randomString(24);

  sessionStorage.setItem('spotify_pkce_verifier', verifier);
  sessionStorage.setItem('spotify_auth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES
  });

  window.location.assign(`${AUTH_URL}?${params.toString()}`);
}

export async function exchangeCodeForToken(opts: {
  clientId: string;
  redirectUri: string;
  code: string;
}) {
  const verifier = sessionStorage.getItem('spotify_pkce_verifier');
  if (!verifier) throw new Error('Missing PKCE verifier.');

  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: verifier
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}
