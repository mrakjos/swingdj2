import type { Track } from '../../routes/app/components/types.ts';

type SpotifyPlaylist = { id: string; name: string; tracks: { total: number } };
type Paging<T> = { items: T[]; next: string | null };

const SPOTIFY_API_URI = 'https://api.spotify.com/v1';

async function spotifyFetch<T>(accessToken: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function getMe(accessToken: string) {
  return spotifyFetch<{ id: string; display_name: string }>(accessToken, `${SPOTIFY_API_URI}/me`);
}

export async function getAllMyPlaylists(accessToken: string) {
  const all: SpotifyPlaylist[] = [];
  let url = `${SPOTIFY_API_URI}/me/playlists?limit=50`;

  while (url) {
    const page = await spotifyFetch<Paging<SpotifyPlaylist>>(accessToken, url);
    all.push(...page.items);
    url = page.next || '';
  }
  return all;
}

export async function getAllPlaylistTracks(accessToken: string, playlistId: string): Promise<Track[]> {
  const tracks: Array<Track> = [];

  let url =
    `${SPOTIFY_API_URI}/playlists/${playlistId}/tracks` +
    `?limit=100&fields=items(track(uri,name,artists(name),duration_ms,is_local)),next`;

  while (url) {
    const page = await spotifyFetch<{
      items: Array<{
        track: {
          uri: string;
          name: string;
          artists: Array<{ name: string }>;
          duration_ms: number;
          is_local?: boolean;
        } | null;
      }>;
      next: string | null;
    }>(accessToken, url);

    for (const it of page.items) {
      const t = it.track;
      if (!t?.uri || t.is_local) {
        continue;
      }
      tracks.push({

        uri: t.uri,
        name: t.name,
        artists: (t.artists ?? []).map((a) => a.name),
        duration_ms: t.duration_ms,
        sourcePlaylistId: playlistId
      });
    }

    url = page.next || '';
  }

  return tracks;
}

async function getAllPlaylistTrackUris(accessToken: string, playlistId: string) {
  const uris: string[] = [];
  // only request track uri to reduce payload
  let url = `${SPOTIFY_API_URI}/playlists/${playlistId}/tracks?limit=100&fields=items(track(uri,is_local)),next`;

  while (url) {
    const page = await spotifyFetch<{ items: Array<{ track: { uri: string; is_local?: boolean } | null }>; next: string | null }>(
      accessToken,
      url
    );
    for (const it of page.items) {
      const uri = it.track?.uri;
      const isLocal = it.track?.is_local;
      if (uri && !isLocal) uris.push(uri); // Spotify cannot add local files via API
    }
    url = page.next || '';
  }

  return uris;
}

export async function createPlaylist(accessToken: string, userId: string, name: string, description?: string, isPublic = false) {
  return spotifyFetch<{ id: string; external_urls: { spotify: string } }>(
    accessToken,
    `${SPOTIFY_API_URI}/users/${userId}/playlists`,
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description ?? '',
        public: isPublic
      })
    }
  );
}

export async function addTracksToPlaylist(accessToken: string, playlistId: string, uris: string[]) {
  // Spotify: max 100 tracks per request
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    await spotifyFetch(accessToken, `${SPOTIFY_API_URI}/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ uris: chunk })
    });
  }
}
