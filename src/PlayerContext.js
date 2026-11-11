import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streamUrl } from './api';

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);
const KEY = 'sonara:data';

export function PlayerProvider({ children }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [data, setData] = useState({ likes: [], playlists: [], history: [] });
  const [loaded, setLoaded] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | all | one
  const [playerOpen, setPlayerOpen] = useState(false);
  const [pickTrack, setPickTrack] = useState(null);

  const current = index >= 0 ? queue[index] : null;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v) setData((d) => ({ ...d, ...JSON.parse(v) })); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data, loaded]);

  const playAt = useCallback((list, i) => {
    const track = list[i];
    if (!track) return;
    setQueue(list);
    setIndex(i);
    setData((d) => ({ ...d, history: [track, ...d.history.filter((t) => t.id !== track.id)].slice(0, 50) }));
    player.replace({ uri: streamUrl(track.id) });
    player.play();
    try {
      player.setActiveForLockScreen(true, { title: track.title, artist: track.artist, artworkUrl: track.artwork });
    } catch (e) {}
  }, [player]);

  const advance = useCallback((auto) => {
    if (!queue.length) return;
    if (auto && repeat === 'one') { player.seekTo(0); player.play(); return; }
    if (shuffle && queue.length > 1) {
      let r = index;
      while (r === index) r = Math.floor(Math.random() * queue.length);
      playAt(queue, r);
      return;
    }
    if (index < queue.length - 1) playAt(queue, index + 1);
    else if (repeat === 'all') playAt(queue, 0);
  }, [queue, index, shuffle, repeat, player, playAt]);

  const next = useCallback(() => advance(false), [advance]);
  const prev = useCallback(() => {
    if (status.currentTime > 3 || index <= 0) player.seekTo(0);
    else playAt(queue, index - 1);
  }, [index, queue, status.currentTime, player, playAt]);
  const toggle = useCallback(() => { status.playing ? player.pause() : player.play(); }, [status.playing, player]);
  const seek = useCallback((sec) => player.seekTo(sec), [player]);
  useEffect(() => { if (status.didJustFinish) advance(true); }, [status.didJustFinish]);

  const toggleShuffle = useCallback(() => setShuffle((v) => !v), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')), []);

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

  return (
    <Ctx.Provider
      value={{
        current, status, likes: data.likes, playlists: data.playlists, history: data.history,
        playAt, next, prev, toggle, seek, shuffle, toggleShuffle, repeat, cycleRepeat,
        toggleLike, isLiked, createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, clearHistory,
        pickTrack, setPickTrack, playerOpen, setPlayerOpen,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
