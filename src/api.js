// Nguồn nhạc: Audius (miễn phí, công khai). Đổi sang nguồn khác bằng cách sửa file này.
const BASE = 'https://api.audius.co/v1';
const APP = 'sonara';

export const GENRES = ['Pop', 'Electronic', 'Hip-Hop/Rap', 'Rock', 'Lo-Fi', 'R&B/Soul', 'Jazz', 'Acoustic', 'Ambient', 'Classical', 'Latin', 'Folk'];

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
  genre: t.genre || '',
  userId: t.user?.id || null,
});

const normalizeUser = (u) => ({
  id: u.id,
  name: u.name || u.handle || 'Không rõ',
  avatar: u.profile_picture?.['480x480'] || u.profile_picture?.['150x150'] || null,
  followers: u.follower_count || 0,
  tracks: u.track_count || 0,
});

export const streamUrl = (id) => `${BASE}/tracks/${id}/stream?app_name=${APP}`;

export const getTrending = async (genre) =>
  (await get('/tracks/trending', { limit: 30, ...(genre ? { genre } : {}) })).map(normalize);

export const searchTracks = async (q) => (await get('/tracks/search', { query: q, limit: 30 })).map(normalize);

export const searchArtists = async (q) => (await get('/users/search', { query: q, limit: 20 })).map(normalizeUser);

export const getArtistTracks = async (userId) =>
  (await get(`/users/${userId}/tracks`, { limit: 50, sort: 'plays' })).map(normalize);

// Gợi ý dựa trên thể loại và nghệ sĩ xuất hiện nhiều nhất trong bài đã thích / đã nghe.
export async function getRecommendations(seed) {
  const top = (key) => {
    const m = {};
    seed.forEach((t) => { const k = t[key]; if (k) m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]);
  };
  const jobs = [...top('genre').map((g) => getTrending(g)), ...top('userId').map((u) => getArtistTracks(u))];
  if (!jobs.length) return [];
  const lists = (await Promise.allSettled(jobs)).filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const seen = new Set(seed.map((t) => t.id));
  const out = [];
  for (let i = 0; i < 20; i++) {
    for (const l of lists) {
      const t = l[i];
      if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
    }
  }
  return out.slice(0, 24);
}

// Các mục nhạc Việt: mỗi mục chạy nhiều từ khóa (có dấu / không dấu), gộp và loại trùng.
export const VIET_TAGS = [
  { label: 'Vinahouse', queries: ['vinahouse', 'viet house', 'vinahouse remix'] },
  { label: 'Nonstop', queries: ['nonstop', 'nonstop vinahouse', 'dj nonstop'] },
  { label: 'Mashup', queries: ['mashup viet', 'mashup vpop', 'mashup nhạc việt'] },
  { label: 'Remix Việt', queries: ['remix viet', 'vpop remix', 'nhạc việt remix'] },
  { label: 'Mix dài', queries: ['vinahouse mix', 'nonstop mix', 'dj mix viet', 'viet mix'], minDuration: 900 },
  { label: 'Lofi Việt', queries: ['lofi viet', 'lofi vietnam', 'lofi nhạc việt'] },
  { label: 'V-Pop', queries: ['vpop', 'nhạc trẻ', 'nhac tre'] },
  { label: 'Rap Việt', queries: ['rap viet', 'rap việt', 'vietnamese rap'] },
];

export async function searchMany(queries, minDuration = 0) {
  const lists = (await Promise.allSettled(queries.map((q) => searchTracks(q))))
    .filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!lists.length) throw new Error('Không tìm được');
  const seen = new Set();
  const out = [];
  for (let i = 0; i < 30; i++) {
    for (const l of lists) {
      const t = l[i];
      if (t && !seen.has(t.id) && t.duration >= minDuration) { seen.add(t.id); out.push(t); }
    }
  }
  return out;
}

export const getViet = (label) => {
  const tag = VIET_TAGS.find((t) => t.label === label) || VIET_TAGS[0];
  return searchMany(tag.queries, tag.minDuration || 0);
};

// ---- SoundCloud (cần client_id của bạn, nhập trong Cài đặt) ----
const SC = 'https://api.soundcloud.com';
export const soundcloudStream = (rawId, clientId) => `${SC}/tracks/${rawId}/stream?client_id=${encodeURIComponent(clientId)}`;

const mapSC = (t) => ({
  id: `sc:${t.id}`,
  rawId: t.id,
  source: 'soundcloud',
  title: t.title,
  artist: t.user?.username || 'Không rõ nghệ sĩ',
  artwork: (t.artwork_url || t.user?.avatar_url || '').replace('-large', '-t500x500') || null,
  duration: Math.round((t.duration || 0) / 1000),
  genre: t.genre || '',
  userId: null,
  link: t.permalink_url || null,
});

async function scFetch(params, clientId) {
  if (!clientId) throw new Error('NO_CLIENT_ID');
  const run = async (p) => {
    const qs = new URLSearchParams({ limit: '30', access: 'playable', ...p, client_id: clientId }).toString();
    return fetch(`${SC}/tracks?${qs}`);
  };
  let res = await run(params);
  // Nếu máy chủ từ chối tham số sắp xếp thì thử lại không có nó.
  if (!res.ok && params.order) { const { order, ...rest } = params; res = await run(rest); }
  if (!res.ok) throw new Error('SoundCloud ' + res.status);
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.collection || [];
  return list.filter((t) => t && t.id && t.streamable !== false).map(mapSC);
}

export const searchSoundCloud = (q, clientId) => scFetch({ q }, clientId);
export const scTrending = (clientId) => scFetch({ order: 'hotness' }, clientId);
export const scGenre = (genre, clientId) => scFetch({ genres: genre, order: 'hotness' }, clientId);

// Danh sách nhạc Việt (Vinahouse, Nonstop, Mashup...) lấy từ kho SoundCloud.
export async function scViet(label, clientId) {
  const tag = VIET_TAGS.find((t) => t.label === label) || VIET_TAGS[0];
  const lists = (await Promise.allSettled(tag.queries.map((q) => scFetch({ q }, clientId))))
    .filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!lists.length) throw new Error('Không tìm được');
  const seen = new Set();
  const out = [];
  for (let i = 0; i < 30; i++) {
    for (const l of lists) {
      const t = l[i];
      if (t && !seen.has(t.id) && t.duration >= (tag.minDuration || 0)) { seen.add(t.id); out.push(t); }
    }
  }
  return out;
}
