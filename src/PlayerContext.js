import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streamUrl } from './api';

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);
const LIKES_KEY = 'sonara:likes';

export function PlayerProvider({ children }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [likes, setLikes] = useState([]);
  const [playerOpen, setPlayerOpen] = useState(false);

  const current = index >= 0 ? queue[index] : null;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    AsyncStorage.getItem(LIKES_KEY).then((v) => v && setLikes(JSON.parse(v))).catch(() => {});
  }, []);

  const playAt = useCallback((list, i) => {
    const track = list[i];
    if (!track) return;
    setQueue(list);
    setIndex(i);
    player.replace({ uri: streamUrl(track.id) });
    player.play();
    try {
      player.setActiveForLockScreen(true, { title: track.title, artist: track.artist, artworkUrl: track.artwork });
    } catch (e) {}
  }, [player]);

  const next = useCallback(() => { if (index < queue.length - 1) playAt(queue, index + 1); }, [index, queue, playAt]);
  const prev = useCallback(() => {
    if (status.currentTime > 3 || index <= 0) player.seekTo(0);
    else playAt(queue, index - 1);
  }, [index, queue, status.currentTime, player, playAt]);
  const toggle = useCallback(() => { status.playing ? player.pause() : player.play(); }, [status.playing, player]);
  const seek = useCallback((sec) => player.seekTo(sec), [player]);

  useEffect(() => { if (status.didJustFinish) next(); }, [status.didJustFinish]);

  const toggleLike = useCallback((track) => {
    setLikes((prevLikes) => {
      const has = prevLikes.some((t) => t.id === track.id);
      const updated = has ? prevLikes.filter((t) => t.id !== track.id) : [track, ...prevLikes];
      AsyncStorage.setItem(LIKES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);
  const isLiked = useCallback((id) => likes.some((t) => t.id === id), [likes]);

  return (
    <Ctx.Provider value={{ current, status, likes, playAt, next, prev, toggle, seek, toggleLike, isLiked, playerOpen, setPlayerOpen }}>
      {children}
    </Ctx.Provider>
  );
}
