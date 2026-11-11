import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveStream, needsExpand, expandTrack, canSave, trackExt, getSimilar } from './api';
import { compact } from './stats';
import { useTheme } from './theme';
import { canDownload, localUri, downloadTrack, deleteFile, deleteAll, existingFiles } from './downloads';

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);
const KEY = 'sonara:data';
const EMPTY = { likes: [], playlists: [], history: [], downloads: {}, follows: [], reposts: [], notes: {}, log: [] };

export function PlayerProvider({ children }) {
  const { fade } = useTheme();
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
  const [radioOn, setRadioOn] = useState(false);
  const radioRef = useRef(false);
  const loggedRef = useRef(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const statusRef = useRef(status);
  statusRef.current = status;
  const playToken = useRef(0);
  const failCount = useRef(0);
  const loadTimer = useRef(null);
  const playAtRef = useRef(null);
  const fadeOnRef = useRef(fade);
  fadeOnRef.current = fade;
  const rateRef = useRef(1);
  const fadeTimer = useRef(null);
  const fadedRef = useRef(false);
  const sleepTimer = useRef(null);

  const current = index >= 0 ? queue[index] : null;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    // Gọi riêng: nếu thiết bị không hỗ trợ tùy chọn này thì phát nền và chế độ im lặng vẫn giữ nguyên.
    setAudioModeAsync({ interruptionMode: 'doNotMix' }).catch(() => {});
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
    return () => { clearInterval(fadeTimer.current); clearTimeout(sleepTimer.current); clearTimeout(loadTimer.current); };
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

  // Bài không phát được (mạng lỗi, nguồn chết): tự bỏ qua sang bài kế, dừng và báo nếu lỗi liên tiếp.
  const onFail = useCallback((list, i) => {
    failCount.current += 1;
    if (failCount.current >= 3 || i >= list.length - 1) {
      failCount.current = 0;
      try { player.pause(); } catch (e) {}
      Alert.alert('Không phát được', 'Bài này không phát được. Kiểm tra kết nối mạng hoặc thử bài / nguồn khác.');
      return;
    }
    if (playAtRef.current) playAtRef.current(list, i + 1);
  }, [player]);

  const playAt = useCallback(async (list, i) => {
    let track = list[i];
    if (!track) return;
    const token = ++playToken.current;
    clearTimeout(loadTimer.current);
    const remember = (t) => setData((d) => ({ ...d, history: [t, ...d.history.filter((x) => x.id !== t.id)].slice(0, 50) }));
    setQueue(list);
    setIndex(i);
    remember(track);
    fadedRef.current = false;
    let uri = null;
    try {
      const dl = dataRef.current.downloads[track.id];
      if (dl) { try { uri = localUri(dl.file); } catch (e) {} }
      if (!uri) {
        if (needsExpand(track)) {
          // Mục Internet Archive có thể là cả album: mở ra thành từng bài rồi phát bài đầu.
          const files = await expandTrack(track);
          if (token !== playToken.current) return;
          if (!files.length) throw new Error('Không có file nhạc');
          list = [...list.slice(0, i), ...files, ...list.slice(i + 1)];
          track = list[i];
          setQueue(list);
          remember(track);
        }
        uri = await resolveStream(track);
      }
    } catch (e) {
      if (token === playToken.current) onFail(list, i);
      return;
    }
    if (token !== playToken.current) return;
    player.replace({ uri });
    if (fadeOnRef.current) ramp(0, 1, 700);
    else { clearInterval(fadeTimer.current); try { player.volume = 1; } catch (e) {} }
    player.play();
    applyRate();
    try {
      player.setActiveForLockScreen(true, { title: track.title, artist: track.artist, artworkUrl: track.artwork });
    } catch (e) {}
    // Nếu sau 25 giây vẫn chưa phát được thì coi như lỗi (kiểm tra trạng thái mới nhất, không dùng giá trị cũ).
    loadTimer.current = setTimeout(() => {
      if (token !== playToken.current) return;
      const st = statusRef.current;
      if (st.playing || st.currentTime > 0.3) { failCount.current = 0; return; }
      onFail(list, i);
    }, 25000);
  }, [player, ramp, applyRate, onFail]);
  playAtRef.current = playAt;

  // Radio: phát bài đã chọn rồi tự nối tiếp các bài tương tự; hết hàng đợi thì lấy thêm.
  const extendRadio = useCallback(async () => {
    const last = queue[queue.length - 1];
    if (!last) return;
    try {
      const have = new Set(queue.map((t) => t.id));
      const more = (await getSimilar(last, [...have])).filter((t) => !have.has(t.id)).slice(0, 20);
      if (!more.length) return;
      playAt([...queue, ...more], queue.length);
    } catch (e) {}
  }, [queue, playAt]);
  const startRadio = useCallback(async (track) => {
    try {
      const more = await getSimilar(track, []);
      radioRef.current = true;
      setRadioOn(true);
      playAt([track, ...more.slice(0, 24)], 0);
    } catch (e) {
      Alert.alert('Chưa tạo được radio', 'Không tìm thấy bài tương tự. Kiểm tra mạng hoặc thử bài khác.');
    }
  }, [playAt]);
  // Hàm phát dùng cho giao diện: chọn bài thủ công thì tắt chế độ radio.
  const playUser = useCallback((list, i) => { radioRef.current = false; setRadioOn(false); return playAt(list, i); }, [playAt]);

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
    else if (radioRef.current) extendRadio();
  }, [queue, index, shuffle, repeat, sleepEnd, player, playAt, extendRadio]);

  const next = useCallback(() => advance(false), [advance]);
  const prev = useCallback(() => {
    if (status.currentTime > 3 || index <= 0) player.seekTo(0);
    else playAt(queue, index - 1);
  }, [index, queue, status.currentTime, player, playAt]);
  const toggle = useCallback(() => {
    if (status.playing) player.pause();
    else { try { player.volume = 1; } catch (e) {} player.play(); }
  }, [status.playing, player]);
  // Chuyển bài mượt: nhỏ dần ở 2 giây cuối, bài kế tiếp sẽ lớn dần ở đầu bài.
  useEffect(() => {
    if (!fadeOnRef.current || !status.playing) return;
    const dur = status.duration || 0;
    if (dur < 12) return;
    const left = dur - status.currentTime;
    if (left <= 2 && !fadedRef.current) {
      fadedRef.current = true;
      ramp(1, 0, Math.max(600, left * 1000 - 200));
    } else if (left > 3.5 && fadedRef.current) {
      fadedRef.current = false;
      clearInterval(fadeTimer.current);
      try { player.volume = 1; } catch (e) {}
    }
  }, [status.currentTime]);

  const seek = useCallback((sec) => player.seekTo(sec), [player]);
  useEffect(() => { if (status.didJustFinish) { loggedRef.current = null; advance(true); } }, [status.didJustFinish]);

  // Ghi vào thống kê khi đã nghe được 20 giây.
  useEffect(() => { loggedRef.current = null; }, [current?.id]);
  useEffect(() => {
    if (!current || !status.playing || status.currentTime < 20 || loggedRef.current === current.id) return;
    loggedRef.current = current.id;
    const entry = { ts: Date.now(), track: compact(current) };
    setData((d) => ({ ...d, log: [entry, ...(d.log || [])].slice(0, 400) }));
  }, [status.currentTime]);

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

  // Theo dõi nghệ sĩ, repost, ghi chú trên sóng nhạc (lưu trong máy)
  const toggleFollow = useCallback((a) => {
    if (!a || !a.id) return;
    setData((d) => {
      const has = d.follows.some((f) => f.id === a.id);
      return { ...d, follows: has ? d.follows.filter((f) => f.id !== a.id) : [{ id: a.id, name: a.name, avatar: a.avatar || null }, ...d.follows] };
    });
  }, []);
  const isFollowing = useCallback((id) => !!id && data.follows.some((f) => f.id === id), [data.follows]);
  const toggleRepost = useCallback((track) => {
    setData((d) => {
      const has = d.reposts.some((t) => t.id === track.id);
      return { ...d, reposts: has ? d.reposts.filter((t) => t.id !== track.id) : [compact(track), ...d.reposts] };
    });
  }, []);
  const isReposted = useCallback((id) => data.reposts.some((t) => t.id === id), [data.reposts]);
  const addNote = useCallback((trackId, t, text) => {
    const note = { id: String(Date.now()), t: Math.max(0, Math.floor(t)), text: String(text).trim().slice(0, 300) };
    if (!note.text) return;
    setData((d) => ({ ...d, notes: { ...d.notes, [trackId]: [...(d.notes[trackId] || []), note].sort((a, b) => a.t - b.t) } }));
  }, []);
  const deleteNote = useCallback((trackId, noteId) => {
    setData((d) => {
      const list = (d.notes[trackId] || []).filter((n) => n.id !== noteId);
      const notes = { ...d.notes };
      if (list.length) notes[trackId] = list; else delete notes[trackId];
      return { ...d, notes };
    });
  }, []);
  const clearLog = useCallback(() => setData((d) => ({ ...d, log: [] })), []);

  // Nghe offline
  const isDownloaded = useCallback((id) => !!data.downloads[id], [data.downloads]);
  const download = useCallback(async (track) => {
    if (!canDownload || !canSave(track) || dataRef.current.downloads[track.id] || downloading[track.id]) return;
    setDownloading((d) => ({ ...d, [track.id]: true }));
    try {
      const file = await downloadTrack(track.id, await resolveStream(track), trackExt(track));
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
    () => JSON.stringify({ app: 'sonara', version: 2, likes: data.likes, playlists: data.playlists, follows: data.follows, reposts: data.reposts, notes: data.notes }),
    [data.likes, data.playlists, data.follows, data.reposts, data.notes],
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
      const fol = (Array.isArray(o.follows) ? o.follows : []).filter((f) => f && f.id && f.name && !d.follows.some((x) => x.id === f.id));
      const rep_ = (Array.isArray(o.reposts) ? o.reposts : []).filter((t) => okTrack(t) && !d.reposts.some((x) => x.id === t.id));
      const notes = { ...d.notes };
      if (o.notes && typeof o.notes === 'object') {
        Object.entries(o.notes).forEach(([tid, arr]) => {
          if (!Array.isArray(arr)) return;
          const have = new Set((notes[tid] || []).map((n) => n.id));
          const add = arr.filter((n) => n && n.id && typeof n.t === 'number' && n.text && !have.has(n.id));
          if (add.length) notes[tid] = [...(notes[tid] || []), ...add].sort((a, b) => a.t - b.t);
        });
      }
      return { ...d, likes: [...d.likes, ...addLikes], playlists, follows: [...d.follows, ...fol], reposts: [...d.reposts, ...rep_], notes };
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
        follows: data.follows, reposts: data.reposts, notes: data.notes, log: data.log || [],
        toggleFollow, isFollowing, toggleRepost, isReposted, addNote, deleteNote, clearLog,
        radioOn, startRadio,
        playAt: playUser, next, prev, toggle, seek, shuffle, toggleShuffle, repeat, cycleRepeat,
        rate, setRate, sleepEnd, setSleep,
        addToQueue, playNext, removeFromQueue, jumpTo,
        toggleLike, isLiked, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, clearHistory,
        canDownload, canSave, isDownloaded, download, removeDownload, clearDownloads,
        exportBackup, importBackup,
        artist, openArtist, closeArtist,
        pickTrack, setPickTrack, playerOpen, setPlayerOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
