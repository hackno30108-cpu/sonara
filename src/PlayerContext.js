import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streamUrl, soundcloudStream } from './api';
import { useTheme } from './theme';
import { canDownload, localUri, downloadTrack, deleteFile, deleteAll, existingFiles } from './downloads';

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);
const KEY = 'sonara:data';
const EMPTY = { likes: [], playlists: [], history: [], downloads: {} };

export function PlayerProvider({ children }) {
  const { fade, scId } = useTheme();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [data, setData] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | all | one
  const [playerOpen, setPlayerOpen] = useState(false);
  const [pickTrack, setPickTrack] = useState(null);
  const [artist, setArtist] = useState(null);
  const [rate, setRateState] = useState(1);
  const [sleepEnd, setSleepEnd] = useState(null); // mốc thời gian | 'end' | null
  const [downloading, setDownloading] = useState({});

  const dataRef = useRef(data);
  dataRef.current = data;
  const scRef = useRef(scId);
  scRef.current = scId;
  const fadeOnRef = useRef(fade);
  fadeOnRef.current = fade;
  const rateRef = useRef(1);
  const fadeTimer = useRef(null);
  const sleepTimer = useRef(null);

  const current = index >= 0 ? queue[index] : null;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    AsyncStorage.getItem(KEY)
      .then(async (v) => {
        if (!v) return;
        const o = JSON.parse(v);
        const downloads = o.downloads || {};
        let kept = downloads;
        if (canDownload && Object.keys(downloads).length) {
          try {
            const ok = await existingFiles(Object.values(downloads).map((x) => x.file));
            kept = Object.fromEntries(Object.entries(downloads).filter(([, x]) => ok.has(x.file)));
          } catch (e) {}
        }
        setData((d) => ({ ...d, ...o, downloads: kept }));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => { clearInterval(fadeTimer.current); clearTimeout(sleepTimer.current); };
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  // Đổi âm lượng từ từ (mờ dần vào/ra).
  const ramp = useCallback((from, to, ms, done) => {
    clearInterval(fadeTimer.current);
    const steps = 12;
    let n = 0;
    try { player.volume = from; } catch (e) {}
    fadeTimer.current = setInterval(() => {
      n += 1;
      try { player.volume = Math.max(0, Math.min(1, from + (to - from) * (n / steps))); } catch (e) {}
      if (n >= steps) {
        clearInterval(fadeTimer.current);
        fadeTimer.current = null;
        if (done) done();
      }
    }, ms / steps);
  }, [player]);

  const applyRate = useCallback(() => {
    try { player.shouldCorrectPitch = true; } catch (e) {}
    try { player.setPlaybackRate(rateRef.current); } catch (e) {}
  }, [player]);

  const playAt = useCallback((list, i) => {
    const track = list[i];
    if (!track) return;
    setQueue(list);
    setIndex(i);
    setData((d) => ({ ...d, history: [track, ...d.history.filter((t) => t.id !== track.id)].slice(0, 50) }));
    const dl = dataRef.current.downloads[track.id];
    let uri = track.source === 'soundcloud' ? soundcloudStream(track.rawId, scRef.current) : streamUrl(track.id);
    if (dl) { try { uri = localUri(dl.file); } catch (e) {} }
    player.replace({ uri });
    if (fadeOnRef.current) ramp(0, 1, 700);
    else { clearInterval(fadeTimer.current); try { player.volume = 1; } catch (e) {} }
    player.play();
    applyRate();
    try {
      player.setActiveForLockScreen(true, { title: track.title, artist: track.artist, artworkUrl: track.artwork });
    } catch (e) {}
  }, [player, ramp, applyRate]);

  const advance = useCallback((auto) => {
    if (!queue.length) return;
    if (auto && sleepEnd === 'end') { setSleepEnd(null); return; }
    if (auto && repeat === 'one') { player.seekTo(0); player.play(); return; }
    if (shuffle && queue.length > 1) {
      let r = index;
      while (r === index) r = Math.floor(Math.random() * queue.length);
      playAt(queue, r);
      return;
    }
    if (index < queue.length - 1) playAt(queue, index + 1);
    else if (repeat === 'all') playAt(queue, 0);
  }, [queue, index, shuffle, repeat, sleepEnd, player, playAt]);

  const next = useCallback(() => advance(false), [advance]);
  const prev = useCallback(() => {
    if (status.currentTime > 3 || index <= 0) player.seekTo(0);
    else playAt(queue, index - 1);
  }, [index, queue, status.currentTime, player, playAt]);
  const toggle = useCallback(() => {
    if (status.playing) player.pause();
    else { try { player.volume = 1; } catch (e) {} player.play(); }
  }, [status.playing, player]);
  const seek = useCallback((sec) => player.seekTo(sec), [player]);
  useEffect(() => { if (status.didJustFinish) advance(true); }, [status.didJustFinish]);

  const toggleShuffle = useCallback(() => setShuffle((v) => !v), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), []);

  // Tốc độ phát
  const setRate = useCallback((r) => {
    rateRef.current = r;
    setRateState(r);
    applyRate();
  }, [applyRate]);

  // Hẹn giờ tắt: số phút, 'end' (hết bài này) hoặc null (tắt hẹn giờ)
  const setSleep = useCallback((opt) => {
    clearTimeout(sleepTimer.current);
    sleepTimer.current = null;
    if (!opt) { setSleepEnd(null); return; }
    if (opt === 'end') { setSleepEnd('end'); return; }
    setSleepEnd(Date.now() + opt * 60000);
    sleepTimer.current = setTimeout(() => {
      ramp(1, 0, 3000, () => {
        player.pause();
        try { player.volume = 1; } catch (e) {}
        setSleepEnd(null);
      });
    }, opt * 60000);
  }, [player, ramp]);

  // Hàng đợi
  const addToQueue = useCallback((track) => {
    if (!queue.length || index < 0) { playAt([track], 0); return; }
    setQueue((q) => [...q, track]);
  }, [queue.length, index, playAt]);
  const playNext = useCallback((track) => {
    if (!queue.length || index < 0) { playAt([track], 0); return; }
    setQueue((q) => { const c = [...q]; c.splice(index + 1, 0, track); return c; });
  }, [queue.length, index, playAt]);
  const removeFromQueue = useCallback((i) => {
    if (i === index) return;
    setQueue((q) => q.filter((_, k) => k !== i));
    if (i < index) setIndex(index - 1);
  }, [index]);
  const jumpTo = useCallback((i) => playAt(queue, i), [queue, playAt]);

  // Yêu thích, playlist
  const toggleLike = useCallback((track) => {
    setData((d) => {
      const has = d.likes.some((t) => t.id === track.id);
      return { ...d, likes: has ? d.likes.filter((t) => t.id !== track.id) : [track, ...d.likes] };
    });
  }, []);
  const isLiked = useCallback((id) => data.likes.some((t) => t.id === id), [data.likes]);

  const createPlaylist = useCallback((name) => {
    const id = String(Date.now());
    setData((d) => ({ ...d, playlists: [...d.playlists, { id, name, tracks: [] }] }));
    return id;
  }, []);
  const deletePlaylist = useCallback((pid) => {
    setData((d) => ({ ...d, playlists: d.playlists.filter((p) => p.id !== pid) }));
  }, []);
  const addToPlaylist = useCallback((pid, track) => {
    setData((d) => ({
      ...d,
      playlists: d.playlists.map((p) =>
        p.id === pid && !p.tracks.some((t) => t.id === track.id) ? { ...p, tracks: [...p.tracks, track] } : p),
    }));
  }, []);
  const removeFromPlaylist = useCallback((pid, tid) => {
    setData((d) => ({
      ...d,
      playlists: d.playlists.map((p) => (p.id === pid ? { ...p, tracks: p.tracks.filter((t) => t.id !== tid) } : p)),
    }));
  }, []);
  const clearHistory = useCallback(() => setData((d) => ({ ...d, history: [] })), []);

  // Nghe offline
  const isDownloaded = useCallback((id) => !!data.downloads[id], [data.downloads]);
  const download = useCallback(async (track) => {
    if (!canDownload || track.source === 'soundcloud' || dataRef.current.downloads[track.id] || downloading[track.id]) return;
    setDownloading((d) => ({ ...d, [track.id]: true }));
    try {
      const file = await downloadTrack(track.id, streamUrl(track.id));
      setData((d) => ({ ...d, downloads: { ...d.downloads, [track.id]: { track, file } } }));
    } catch (e) {
      Alert.alert('Không tải được', 'Kiểm tra kết nối mạng rồi thử lại.');
    }
    setDownloading((d) => { const c = { ...d }; delete c[track.id]; return c; });
  }, [downloading]);
  const removeDownload = useCallback(async (id) => {
    const dl = dataRef.current.downloads[id];
    if (dl) await deleteFile(dl.file);
    setData((d) => { const c = { ...d.downloads }; delete c[id]; return { ...d, downloads: c }; });
  }, []);
  const clearDownloads = useCallback(async () => {
    await deleteAll();
    setData((d) => ({ ...d, downloads: {} }));
  }, []);

  // Sao lưu / nhập
  const exportBackup = useCallback(
    () => JSON.stringify({ app: 'sonara', version: 1, likes: data.likes, playlists: data.playlists }),
    [data.likes, data.playlists],
  );
  const importBackup = useCallback((text) => {
    let o;
    try { o = JSON.parse(String(text).trim()); } catch (e) { o = null; }
    if (!o || o.app !== 'sonara') return { ok: false, message: 'Nội dung không phải dữ liệu sao lưu của Sonara.' };
    const okTrack = (t) => t && t.id && t.title;
    const likes = (Array.isArray(o.likes) ? o.likes : []).filter(okTrack);
    const lists = (Array.isArray(o.playlists) ? o.playlists : [])
      .filter((p) => p && p.name)
      .map((p) => ({ name: String(p.name), tracks: (Array.isArray(p.tracks) ? p.tracks : []).filter(okTrack) }));
    const cur = dataRef.current;
    const newLikes = likes.filter((t) => !cur.likes.some((x) => x.id === t.id)).length;
    setData((d) => {
      const addLikes = likes.filter((t) => !d.likes.some((x) => x.id === t.id));
      const playlists = d.playlists.map((p) => ({ ...p, tracks: [...p.tracks] }));
      lists.forEach((ip, n) => {
        const found = playlists.find((p) => p.name.toLowerCase() === ip.name.toLowerCase());
        if (found) {
          ip.tracks.forEach((t) => { if (!found.tracks.some((x) => x.id === t.id)) found.tracks.push(t); });
        } else {
          playlists.push({ id: String(Date.now() + n), name: ip.name, tracks: ip.tracks });
        }
      });
      return { ...d, likes: [...d.likes, ...addLikes], playlists };
    });
    return { ok: true, message: `Đã nhập ${newLikes} bài đã thích và ${lists.length} playlist.` };
  }, []);

  const openArtist = useCallback((a) => { if (a && a.id) setArtist(a); }, []);
  const closeArtist = useCallback(() => setArtist(null), []);

  return (
    <Ctx.Provider
      value={{
        current, queue, index, status, likes: data.likes, playlists: data.playlists, history: data.history,
        downloads: data.downloads, downloading,
        playAt, next, prev, toggle, seek, shuffle, toggleShuffle, repeat, cycleRepeat,
        rate, setRate, sleepEnd, setSleep,
        addToQueue, playNext, removeFromQueue, jumpTo,
        toggleLike, isLiked, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, clearHistory,
        canDownload, isDownloaded, download, removeDownload, clearDownloads,
        exportBackup, importBackup,
        artist, openArtist, closeArtist,
        pickTrack, setPickTrack, playerOpen, setPlayerOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
