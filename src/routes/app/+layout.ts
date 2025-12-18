import type { LayoutLoad } from './$types';

import { getAllMyPlaylists, getMe } from '$lib/spotify/api';

export const load: LayoutLoad = async () => {
  const token = sessionStorage.getItem('spotify_access_token');
  if (!token) {
    return {}
  };

  const me = await getMe(token);
  const playlists = await getAllMyPlaylists(token);

  return {
    token,
    me,
    playlists
  }
};