// Thống kê nghe nhạc từ nhật ký log = [{ ts, track }]. Không phụ thuộc React Native.
export const compact = (t) => ({
  id: t.id, title: t.title, artist: t.artist, artwork: t.artwork || null, duration: t.duration || 0,
  source: t.source, rawId: t.rawId, userId: t.userId || null, link: t.link || null, genre: t.genre || '',
  stream: t.stream || null, file: t.file || null,
});

export function computeStats(log, since = 0) {
  const rows = (log || []).filter((e) => e && e.track && e.ts >= since);
  const tracks = new Map();
  const artists = new Map();
  let seconds = 0;
  for (const { track } of rows) {
    const k = tracks.get(track.id) || { track, count: 0 };
    k.count++;
    tracks.set(track.id, k);
    const name = track.artist || 'Không rõ';
    artists.set(name, (artists.get(name) || 0) + 1);
    seconds += track.duration || 0;
  }
  return {
    plays: rows.length,
    seconds,
    topTracks: [...tracks.values()].sort((a, b) => b.count - a.count).slice(0, 30),
    topArtists: [...artists.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
  };
}

export const fmtDuration = (sec) => {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  return `${h} giờ ${m % 60} phút`;
};
