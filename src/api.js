// Nguồn nhạc: Audius, Jamendo, Internet Archive (đều miễn phí) và SoundCloud (cần client_id).
// File này không phụ thuộc React Native; cấu hình (client_id, chất lượng) được nạp qua setApiConfig().
import { applyViet, dedupe, interleave, deaccent, isViet } from './viet';

const CFG = { scId: '', jmId: '', quality: 'high', vn: 'first' };
export const setApiConfig = (c) => Object.assign(CFG, c);

export const SOURCES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'audius', label: 'Audius' },
  { key: 'jamendo', label: 'Jamendo' },
  { key: 'archive', label: 'Internet Archive' },
  { key: 'soundcloud', label: 'SoundCloud' },
];
export const sourceReady = (k) => (k === 'jamendo' ? !!CFG.jmId : k === 'soundcloud' ? !!CFG.scId : true);
export const sourceName = (k) => (SOURCES.find((s) => s.key === k) || {}).label || 'Audius';

export const GENRES = ['Pop', 'Electronic', 'Hip-Hop/Rap', 'Rock', 'Lo-Fi', 'R&B/Soul', 'Jazz', 'Acoustic', 'Ambient', 'Classical', 'Latin', 'Folk'];
// Tên thể loại trên Jamendo (tags) và từ khóa tìm trên Internet Archive.
const JM_TAG = { Pop: 'pop', Electronic: 'electronic', 'Hip-Hop/Rap': 'hiphop', Rock: 'rock', 'Lo-Fi': 'lofi', 'R&B/Soul': 'rnb', Jazz: 'jazz', Acoustic: 'acoustic', Ambient: 'ambient', Classical: 'classical', Latin: 'latin', Folk: 'folk' };

const year = new Date().getFullYear();

// Các mục nhạc Việt. recent: ưu tiên bài mới đăng. jm: tham số riêng cho Jamendo.
export const VIET_TAGS = [
  { label: 'Mới nhất', recent: true, queries: [`vpop ${year}`, 'nhạc việt mới', 'nhac viet moi', 'viet remix', 'vietnamese new music'], jm: { order: 'releasedate_desc' } },
  { label: 'V-Pop', queries: ['vpop', 'nhạc trẻ', 'nhac tre', 'v-pop'], jm: { order: 'popularity_month' } },
  { label: 'Ballad', queries: ['ballad việt', 'ballad viet', 'nhạc buồn', 'nhac tinh'], jm: { fuzzytags: 'ballad+pop', order: 'popularity_month' } },
  { label: 'Rap Việt', queries: ['rap viet', 'rap việt', 'vietnamese rap'], jm: { fuzzytags: 'hiphop+rap', order: 'popularity_month' } },
  { label: 'Lofi Việt', queries: ['lofi viet', 'lofi vietnam', 'lofi nhạc việt'], jm: { fuzzytags: 'lofi+chillout', order: 'popularity_month' } },
  { label: 'Indie Việt', recent: true, queries: ['indie viet', 'indie việt', 'nhạc indie'], jm: { fuzzytags: 'indie+folk', order: 'popularity_month' } },
  { label: 'Vinahouse', queries: ['vinahouse', 'viet house', 'vinahouse remix'], jm: { fuzzytags: 'house+edm', order: 'popularity_month' } },
  { label: 'Nonstop', queries: ['nonstop', 'nonstop vinahouse', 'dj nonstop'], jm: { fuzzytags: 'dance+edm', order: 'popularity_month' } },
  { label: 'Mashup', queries: ['mashup viet', 'mashup vpop', 'mashup nhạc việt'], jm: { order: 'popularity_month' } },
  { label: 'Remix Việt', queries: ['remix viet', 'vpop remix', 'nhạc việt remix'], jm: { order: 'popularity_month' } },
  { label: 'Mix dài', queries: ['vinahouse mix', 'nonstop mix', 'dj mix viet', 'viet mix'], minDuration: 900, jm: { order: 'duration_desc' } },
  { label: 'Nhạc xưa', queries: ['nhạc vàng', 'nhac vang', 'bolero', 'nhạc xưa', 'nhạc trữ tình', 'tiền chiến'], jm: { order: 'popularity_total' } },
  { label: 'Dân ca', queries: ['dân ca việt nam', 'cải lương', 'quan họ', 'nhạc dân tộc', 'vietnamese traditional'], jm: { fuzzytags: 'world+folk', order: 'popularity_total' } },
];
const tagOf = (label) => VIET_TAGS.find((t) => t.label === label) || VIET_TAGS[0];

// ---------- Tiện ích mạng ----------
const enc = encodeURIComponent;
const qs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');

async function fetchJson(url, ms = 12000) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
    try {
      const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (!res.ok) {
        const e = new Error('HTTP ' + res.status);
        e.status = res.status;
        if (res.status >= 400 && res.status < 500) throw Object.assign(e, { noRetry: true });
        throw e;
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (e.noRetry) break;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Lỗi mạng');
}

// Các biến thể của từ khóa: có dấu và không dấu, để tìm "sơn tùng" cũng ra "son tung".
const variants = (q) => {
  const a = String(q).trim();
  const b = deaccent(a);
  return b && b !== a.toLowerCase() ? [a, b] : [a];
};

// ---------- Audius ----------
const AU = 'https://api.audius.co/v1';
const APP = 'sonara';

async function auGet(path, params = {}, optional = {}) {
  const run = (p) => fetchJson(`${AU}${path}?${qs({ ...p, app_name: APP })}`);
  let json;
  try { json = await run({ ...params, ...optional }); } catch (e) {
    if (Object.keys(optional).length) json = await run(params); else throw e;
  }
  return json.data || [];
}

const auTrack = (t) => ({
  id: t.id,
  source: 'audius',
  title: t.title,
  artist: t.user?.name || 'Không rõ nghệ sĩ',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || null,
  duration: t.duration || 0,
  genre: t.genre || '',
  userId: t.user?.id || null,
  link: t.permalink ? `https://audius.co${t.permalink}` : null,
  date: Date.parse(t.release_date || t.created_at || '') || 0,
});
const auUser = (u) => ({
  id: u.id,
  name: u.name || u.handle || 'Không rõ',
  avatar: u.profile_picture?.['480x480'] || u.profile_picture?.['150x150'] || null,
  followers: u.follower_count || 0,
  tracks: u.track_count || 0,
});

export const streamUrl = (id) => `${AU}/tracks/${id}/stream?app_name=${APP}`;

const auSearch = async (q, recent) => (await auGet('/tracks/search', { query: q, limit: 30 }, recent ? { sort_method: 'recent' } : {})).map(auTrack);
const auTrending = async (genre) => (await auGet('/tracks/trending', { limit: 30, ...(genre ? { genre } : {}) })).map(auTrack);
export const searchArtists = async (q) => (await auGet('/users/search', { query: q, limit: 20 })).map(auUser);

// ---------- Jamendo ----------
const JM = 'https://api.jamendo.com/v3.0';

async function jmGet(path, params = {}) {
  if (!CFG.jmId) throw new Error('NO_JM_ID');
  const json = await fetchJson(`${JM}${path}/?${qs({
    client_id: CFG.jmId, format: 'json', limit: 30, imagesize: 500,
    audioformat: CFG.quality === 'high' ? 'mp32' : 'mp31', ...params,
  })}`);
  if (json?.headers && json.headers.status && json.headers.status !== 'success') {
    throw new Error('Jamendo: ' + (json.headers.error_message || json.headers.status));
  }
  return json.results || [];
}
const jmTrack = (t) => ({
  id: `jm:${t.id}`,
  rawId: t.id,
  source: 'jamendo',
  title: t.name,
  artist: t.artist_name || 'Không rõ nghệ sĩ',
  artwork: t.image || t.album_image || null,
  duration: Number(t.duration) || 0,
  genre: '',
  userId: t.artist_id ? `jm:${t.artist_id}` : null,
  link: t.shareurl || null,
  stream: t.audio || null,
  date: Date.parse(t.releasedate || '') || 0,
});
const jmFilter = (list) => list.filter((t) => t && t.id && (t.audio || t.audio === undefined)).map(jmTrack);

const jmSearch = async (q) => jmFilter(await jmGet('/tracks', { search: q, order: 'relevance' }));
const jmTrending = async () => jmFilter(await jmGet('/tracks', { order: 'popularity_week' }));
const jmGenre = async (g) => jmFilter(await jmGet('/tracks', { tags: JM_TAG[g] || g.toLowerCase(), order: 'popularity_week' }));
// Nhạc có lời tiếng Việt (bộ lọc ngôn ngữ của Jamendo), cộng thêm tìm theo từ khóa.
const jmViet = async (tag) => {
  const jobs = [
    jmGet('/tracks', { lang: 'vi', order: 'popularity_total', ...(tag.jm || {}) }),
    jmGet('/tracks', { search: tag.queries[0], order: tag.recent ? 'releasedate_desc' : 'relevance' }),
  ];
  const rs = await Promise.allSettled(jobs);
  const lists = rs.filter((r) => r.status === 'fulfilled').map((r) => jmFilter(r.value));
  if (!lists.length) throw new Error(rs[0]?.reason?.message || 'Jamendo không phản hồi');
  // Bài lọc theo lang=vi chắc chắn là nhạc Việt, đánh dấu để viet.js nhận diện.
  if (lists[0]) lists[0] = lists[0].map((t) => ({ ...t, lang: 'vi' }));
  return interleave(lists);
};
async function jmStreamById(rawId) {
  const r = await jmGet('/tracks', { id: rawId });
  return r[0]?.audio || null;
}

// ---------- Internet Archive ----------
const IA = 'https://archive.org';
const IA_SKIP = ' AND NOT collection:(podcasts OR radioprograms OR audio_podcast OR librivoxaudio OR audio_bookspoetry OR audio_foreign_language)';
const clean = (s) => String(s).replace(/["():\[\]{}\\^~*?!]/g, ' ').replace(/\s+/g, ' ').trim();
const first = (v) => (Array.isArray(v) ? v[0] : v);

const iaItem = (d) => ({
  id: `ia:${d.identifier}`,
  rawId: d.identifier,
  source: 'archive',
  title: first(d.title) || d.identifier,
  artist: first(d.creator) || 'Internet Archive',
  artwork: `${IA}/services/img/${enc(d.identifier)}`,
  duration: 0,
  genre: '',
  userId: null,
  link: `${IA}/details/${enc(d.identifier)}`,
  date: Date.parse(first(d.addeddate) || first(d.date) || '') || 0,
});

async function iaSearchRaw(q, sort, rows = 30) {
  const t = clean(q);
  if (!t) return [];
  const base = `(title:("${t}") OR creator:("${t}") OR subject:("${t}")) AND mediatype:audio`;
  const url = (query) => `${IA}/advancedsearch.php?q=${enc(query)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=date&fl[]=addeddate&rows=${rows}&sort[]=${enc(sort)}&output=json`;
  let json;
  try { json = await fetchJson(url(base + IA_SKIP)); } catch (e) { json = await fetchJson(url(base)); }
  return (json?.response?.docs || []).filter((d) => d.identifier).map(iaItem);
}
const iaSearch = (q, recent) => iaSearchRaw(q, recent ? 'addeddate desc' : 'downloads desc');

// Chọn file nhạc tốt nhất cho mỗi bài trong một mục của Internet Archive.
// Chỉ lấy định dạng iOS phát được (MP3, FLAC, M4A); bỏ Ogg Vorbis vì AVPlayer không hỗ trợ.
const IA_PLAYABLE = /(mp3|flac|apple lossless|mpeg-?4 audio|aac)/i;
const parseLen = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const s = String(v);
  if (s.includes(':')) return s.split(':').reduce((a, x) => a * 60 + (parseFloat(x) || 0), 0);
  return parseFloat(s) || 0;
};
const bitrateOf = (f) => {
  const b = parseInt(f.bitrate, 10);
  if (b) return b;
  if (/vbr/i.test(f.format)) return 220;
  const m = String(f.format).match(/(\d+)\s*kbps/i);
  return m ? parseInt(m[1], 10) : 160;
};
export const iaRank = (f, quality) => {
  if (!/mp3/i.test(f.format)) return quality === 'high' ? 50 : 10; // FLAC/M4A chỉ dùng khi không có MP3
  const br = bitrateOf(f);
  if (quality === 'high') return br;
  // tiết kiệm dữ liệu: ưu tiên gần 128 kbps
  if (br <= 192) return br >= 96 ? 400 - Math.abs(br - 128) : br;
  return 300 - (br - 192) / 10;
};

export function iaPickFiles(meta, quality = 'high') {
  const files = (meta?.files || []).filter((f) => f && f.name && IA_PLAYABLE.test(f.format || ''));
  const groups = new Map();
  for (const f of files) {
    const key = (f.original || f.name).replace(/\.[^.]+$/, '');
    const g = groups.get(key);
    if (!g || iaRank(f, quality) > iaRank(g, quality)) groups.set(key, f);
  }
  const picked = [...groups.values()].filter((f) => !/(^|[_\- ])(sample|preview)\b/i.test(f.name));
  picked.sort((a, b) => (parseInt(a.track, 10) || 1e6) - (parseInt(b.track, 10) || 1e6) || a.name.localeCompare(b.name, undefined, { numeric: true }));
  return picked.slice(0, 80);
}

export const needsExpand = (t) => t && t.source === 'archive' && !t.stream;
// Mở một mục Internet Archive thành danh sách bài phát được.
export async function expandTrack(t) {
  const meta = await fetchJson(`${IA}/metadata/${enc(t.rawId)}`, 15000);
  const creator = first(meta?.metadata?.creator) || t.artist;
  const picked = iaPickFiles(meta, CFG.quality);
  const single = picked.length === 1;
  return picked.map((f) => ({
    id: `ia:${t.rawId}/${f.name}`,
    rawId: t.rawId,
    source: 'archive',
    file: f.name,
    title: single ? t.title : f.title || f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
    artist: first(f.creator) || creator,
    artwork: t.artwork,
    duration: parseLen(f.length),
    genre: '',
    userId: null,
    link: t.link,
    stream: `${IA}/download/${enc(t.rawId)}/${f.name.split('/').map(enc).join('/')}`,
  }));
}

// ---------- SoundCloud (cần client_id của bạn, nhập trong Cài đặt) ----------
const SC = 'https://api.soundcloud.com';
export const soundcloudStream = (rawId, clientId) => `${SC}/tracks/${rawId}/stream?client_id=${enc(clientId)}`;

const scTrack = (t) => ({
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
  date: Date.parse(t.created_at || '') || 0,
});

async function scFetch(params) {
  if (!CFG.scId) throw new Error('NO_CLIENT_ID');
  const run = (p) => fetchJson(`${SC}/tracks?${qs({ limit: 30, access: 'playable', ...p, client_id: CFG.scId })}`);
  let json;
  try { json = await run(params); } catch (e) {
    // Máy chủ từ chối tham số sắp xếp thì thử lại không có nó.
    if (params.order) { const { order, ...rest } = params; json = await run(rest); } else throw e;
  }
  const list = Array.isArray(json) ? json : json.collection || [];
  return list.filter((t) => t && t.id && t.streamable !== false).map(scTrack);
}
const scSearch = (q) => scFetch({ q });
const scTrending = () => scFetch({ order: 'hotness' });
const scGenre = (g) => scFetch({ genres: g, order: 'hotness' });

// ---------- Gộp theo nguồn ----------
const IMPL = {
  audius: {
    search: (q, recent) => auSearch(q, recent),
    trending: auTrending,
    genre: auTrending,
  },
  jamendo: { search: jmSearch, trending: jmTrending, genre: jmGenre, viet: jmViet },
  archive: {
    search: iaSearch,
    trending: () => iaSearchRaw('music', 'downloads desc'),
    genre: (g) => iaSearch(g),
  },
  soundcloud: { search: scSearch, trending: scTrending, genre: scGenre },
};
const activeSources = (src) => (src === 'all' ? ['audius', 'jamendo', 'archive', 'soundcloud'].filter(sourceReady) : [src]);

async function settle(jobs) {
  const rs = await Promise.allSettled(jobs);
  const ok = rs.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) {
    const msg = rs[0]?.reason?.message;
    throw new Error(msg === 'NO_JM_ID' || msg === 'NO_CLIENT_ID' ? msg : 'Không tìm được');
  }
  return ok;
}

// Chạy nhiều từ khóa (có dấu / không dấu) trên một nguồn rồi gộp.
async function searchOne(src, queries, recent) {
  const lists = await settle(queries.map((q) => IMPL[src].search(q, recent)));
  return interleave(lists);
}

export async function searchTracks(q, src = 'all') {
  const qs_ = variants(q);
  const lists = await settle(activeSources(src).map((s) => searchOne(s, qs_, false)));
  return applyViet(dedupe(interleave(lists)), CFG.vn === 'only' ? 'first' : CFG.vn);
}

async function vietOne(src, tag) {
  if (src === 'jamendo') return jmViet(tag);
  return searchOne(src, tag.queries, !!tag.recent);
}

export async function getViet(label, src = 'all') {
  const tag = tagOf(label);
  const lists = await settle(activeSources(src).map((s) => vietOne(s, tag)));
  let out = dedupe(interleave(lists));
  if (tag.minDuration) out = out.filter((t) => t.duration >= tag.minDuration);
  if (tag.recent) {
    // Bài có ngày đăng thì sắp xếp mới trước; bài không có ngày giữ nguyên chỗ.
    out = out.map((t, i) => ({ t, i })).sort((a, b) => (b.t.date || 0) - (a.t.date || 0) || a.i - b.i).map((x) => x.t);
  }
  return applyViet(out, CFG.vn);
}

export async function getTrending(genre, src = 'all') {
  const srcs = activeSources(src);
  const jobs = srcs.map(async (s) => {
    if (genre) {
      const [a, b] = await Promise.allSettled([IMPL[s].genre(genre), searchOne(s, [`${genre} viet`, `${genre} việt`], false)]);
      const lists = [a, b].filter((r) => r.status === 'fulfilled').map((r) => r.value);
      if (!lists.length) throw a.reason;
      return interleave(lists);
    }
    return IMPL[s].trending();
  });
  const lists = await settle(jobs);
  return applyViet(dedupe(interleave(lists)), CFG.vn);
}

// Mục "Tất cả" của Khám phá: nhạc Việt mới lên trước, rồi tới nổi bật theo nguồn.
export async function getHome(src = 'all') {
  if (CFG.vn === 'off') return getTrending(null, src);
  const [viet, hot] = await Promise.allSettled([getViet('Mới nhất', src), CFG.vn === 'only' ? Promise.resolve([]) : getTrending(null, src)]);
  const lists = [viet, hot].filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!lists.length) throw viet.reason;
  return dedupe(lists.flat());
}

export const getFeed = (sel, src = 'all') => {
  if (!sel) return getHome(src);
  return sel.kind === 'genre' ? getTrending(sel.key, src) : getViet(sel.key, src);
};

// ---------- Nghệ sĩ ----------
// sort: 'plays' (phổ biến) | 'date' (mới nhất)
export async function getArtistTracks(userId, sort = 'plays') {
  if (String(userId).startsWith('jm:')) {
    return jmFilter(await jmGet('/tracks', { artist_id: String(userId).slice(3), order: sort === 'date' ? 'releasedate_desc' : 'popularity_total', limit: 50 }));
  }
  return (await auGet(`/users/${userId}/tracks`, { limit: 50, sort }, sort === 'date' ? { sort_direction: 'desc' } : {})).map(auTrack);
}

// Hồ sơ nghệ sĩ: ảnh, ảnh bìa, giới thiệu, số người theo dõi.
export async function getArtistInfo(userId) {
  if (String(userId).startsWith('jm:')) {
    const r = await jmGet('/artists', { id: String(userId).slice(3), limit: 1 });
    const a = r[0];
    if (!a) return null;
    return { id: userId, name: a.name, avatar: a.image || null, cover: null, bio: a.website ? `Trang riêng: ${a.website}` : '', followers: 0, tracks: 0, source: 'jamendo', link: a.shareurl || a.website || null };
  }
  const u = await auGet(`/users/${userId}`, {});
  if (!u || Array.isArray(u)) return null;
  return {
    ...auUser(u), source: 'audius', cover: u.cover_photo?.['2000x'] || u.cover_photo?.['640x'] || null,
    bio: u.bio || '', link: u.handle ? `https://audius.co/${u.handle}` : null,
  };
}

// Album / playlist của nghệ sĩ (nếu nguồn có). Lỗi thì trả về danh sách rỗng.
export async function getArtistCollections(userId) {
  try {
    if (String(userId).startsWith('jm:')) {
      const r = await jmGet('/albums', { artist_id: String(userId).slice(3), order: 'releasedate_desc', limit: 30 });
      return r.map((a) => ({ id: `jm:${a.id}`, name: a.name, artwork: a.image || null, source: 'jamendo', isAlbum: true, count: 0 }));
    }
    const rs = await Promise.allSettled([auGet(`/users/${userId}/albums`, { limit: 30 }), auGet(`/users/${userId}/playlists`, { limit: 30 })]);
    const out = [];
    rs.forEach((r, i) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        r.value.forEach((p) => out.push({
          id: p.id, name: p.playlist_name || 'Playlist', artwork: p.artwork?.['480x480'] || p.artwork?.['150x150'] || null,
          source: 'audius', isAlbum: i === 0 || !!p.is_album, count: p.track_count || 0,
        }));
      }
    });
    return out;
  } catch (e) { return []; }
}

export async function getCollectionTracks(col) {
  if (col.source === 'jamendo') {
    const r = await jmGet('/albums/tracks', { id: String(col.id).slice(3), limit: 1 });
    const al = r[0];
    if (!al) return [];
    return (al.tracks || []).map((t) => jmTrack({ ...t, artist_name: al.artist_name, artist_id: al.artist_id, image: t.image || al.image, audio: t.audio })).filter((t) => t.stream);
  }
  return (await auGet(`/playlists/${col.id}/tracks`, {})).map(auTrack);
}

// Bảng tin: bài mới nhất của những nghệ sĩ đã theo dõi, mới trước.
export async function getFollowFeed(follows) {
  const list = follows.slice(0, 20);
  if (!list.length) return [];
  const rs = await Promise.allSettled(list.map((f) => getArtistTracks(f.id, 'date')));
  const lists = rs.filter((r) => r.status === 'fulfilled').map((r) => r.value.slice(0, 8));
  if (!lists.length) throw new Error('Không tải được bảng tin');
  return dedupe(lists.flat()).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 80);
}

// Bài tương tự (dùng cho Radio và tự phát tiếp). exclude: id các bài đã có trong hàng đợi.
export async function getSimilar(t, exclude = []) {
  const src = t.source || 'audius';
  const jobs = [];
  if (src === 'jamendo') {
    jobs.push(jmGet('/tracks/similar', { id: t.rawId, limit: 30 }).then(jmFilter));
    if (t.userId) jobs.push(getArtistTracks(t.userId));
  } else if (src === 'audius') {
    if (t.genre) jobs.push(auTrending(t.genre));
    if (t.userId) jobs.push(getArtistTracks(t.userId));
    jobs.push(auSearch(t.artist, false));
  } else if (src === 'soundcloud') {
    jobs.push(t.genre ? scGenre(t.genre) : scSearch(t.artist));
  } else {
    jobs.push(iaSearch(t.artist, false));
  }
  const viet = isViet(t);
  if (viet || CFG.vn !== 'off') {
    const tag = VIET_TAGS[Math.floor(Math.random() * VIET_TAGS.length)];
    jobs.push(getViet(tag.label, 'all'));
  }
  const lists = (await Promise.allSettled(jobs)).filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const skip = new Set([t.id, ...exclude]);
  let out = dedupe(interleave(lists)).filter((x) => !skip.has(x.id));
  out = applyViet(out, viet ? 'first' : CFG.vn === 'only' ? 'first' : CFG.vn);
  if (!out.length) throw new Error('Không tìm được bài tương tự');
  return out.slice(0, 40);
}

// Gợi ý dựa trên thể loại và nghệ sĩ xuất hiện nhiều nhất trong bài đã thích / đã nghe.
export async function getRecommendations(seed) {
  const top = (key) => {
    const m = {};
    seed.forEach((t) => { const k = t[key]; if (k) m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 2).map((e) => e[0]);
  };
  const jobs = [...top('genre').map((g) => getTrending(g, 'audius')), ...top('userId').map((u) => getArtistTracks(u))];
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
  return applyViet(out, CFG.vn === 'off' ? 'off' : 'first').slice(0, 24);
}

// ---------- Phát nhạc ----------
export const canSave = (t) => !!t && t.source !== 'soundcloud' && !needsExpand(t);
export const trackExt = (t) => {
  const m = String(t.file || t.stream || '').split('?')[0].match(/\.(mp3|flac|m4a|aac|wav)$/i);
  return m ? m[1].toLowerCase() : 'mp3';
};

// Trả về địa chỉ phát của một bài (đã chọn chất lượng theo Cài đặt).
export async function resolveStream(t) {
  const src = t.source || 'audius';
  if (src === 'soundcloud') return soundcloudStream(t.rawId, CFG.scId);
  if (src === 'jamendo') {
    let u = t.stream || (await jmStreamById(t.rawId));
    if (!u) throw new Error('Không có địa chỉ phát');
    const want = CFG.quality === 'high' ? 'mp32' : 'mp31';
    return u.replace(/format=(mp3[12]|ogg|flac)/, `format=${want}`);
  }
  if (src === 'archive') {
    if (!t.stream) throw new Error('Mục này cần mở ra trước khi phát');
    return t.stream;
  }
  return streamUrl(t.id);
}
