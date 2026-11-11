// Nguồn nhạc: Audius (miễn phí, công khai). Đổi sang nguồn khác bằng cách sửa file này.
const BASE = 'https://api.audius.co/v1';
const APP = 'sonara';

async function get(path, params = {}) {
  const qs = new URLSearchParams({ ...params, app_name: APP }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`);
  if (!res.ok) throw new Error('Lỗi máy chủ nhạc (' + res.status + ')');
  const json = await res.json();
  return json.data || [];
}

const normalize = (t) => ({
  id: t.id,
  title: t.title,
  artist: t.user?.name || 'Không rõ nghệ sĩ',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || null,
  duration: t.duration || 0,
});

export const streamUrl = (id) => `${BASE}/tracks/${id}/stream?app_name=${APP}`;
export const getTrending = async () => (await get('/tracks/trending', { limit: 30 })).map(normalize);
export const searchTracks = async (q) => (await get('/tracks/search', { query: q, limit: 30 })).map(normalize);
