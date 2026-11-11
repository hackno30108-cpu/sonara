import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiConfig } from './api';

export const ACCENTS = [
  { name: 'Tím', color: '#7B6CFF' },
  { name: 'Hồng', color: '#E8387A' },
  { name: 'Xanh lá', color: '#14A86B' },
  { name: 'Cam', color: '#F07A22' },
  { name: 'Xanh dương', color: '#2F7BFF' },
];
export const SIZES = [
  { name: 'Vừa', scale: 1 },
  { name: 'Lớn', scale: 1.15 },
  { name: 'Rất lớn', scale: 1.3 },
];
const BASE = {
  liquid: { bg: '#000000', surface: 'rgba(255,255,255,0.09)', line: 'rgba(255,255,255,0.16)', text: '#FFFFFF', muted: 'rgba(255,255,255,0.62)', wave: 'rgba(255,255,255,0.25)' },
  dark: { bg: '#15122B', surface: '#1F1B3D', line: '#2C2755', text: '#F3EFFF', muted: '#9A94C4', wave: '#3A3566' },
  light: { bg: '#F7F5FF', surface: '#FFFFFF', line: '#E3DFF5', text: '#1B1736', muted: '#6B6590', wave: '#CFC9EE' },
};
const KEY = 'sonara:settings';
const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('liquid');
  const [accent, setAccent] = useState(ACCENTS[0].name);
  const [size, setSize] = useState(SIZES[0].name);
  const [fade, setFade] = useState(true);
  const [scId, setScId] = useState('');
  const [jmId, setJmId] = useState('');
  const [quality, setQuality] = useState('high'); // high | data
  const [vn, setVn] = useState('first'); // first = nhạc Việt lên đầu | only = chỉ nhạc Việt | off
  const [src, setSrc] = useState('all'); // nguồn của tab Khám phá
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!v) return;
        const o = JSON.parse(v);
        if (o.mode && o.v === 2) setMode(o.mode); // bản cũ: dùng giao diện mặc định mới
        if (o.accent) setAccent(o.accent);
        if (o.size) setSize(o.size);
        if (typeof o.fade === 'boolean') setFade(o.fade);
        if (typeof o.scId === 'string') setScId(o.scId);
        if (typeof o.jmId === 'string') setJmId(o.jmId);
        if (o.quality === 'high' || o.quality === 'data') setQuality(o.quality);
        if (o.vn === 'first' || o.vn === 'only' || o.vn === 'off') setVn(o.vn);
        if (['all', 'audius', 'jamendo', 'archive'].includes(o.src)) setSrc(o.src);
        else if (o.src === 'soundcloud' && o.scId) setSrc('soundcloud'); // bản cũ mặc định SoundCloud dù chưa có client_id
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify({ v: 2, mode, accent, size, fade, scId, jmId, quality, vn, src })).catch(() => {});
  }, [mode, accent, size, fade, scId, jmId, quality, vn, src, loaded]);

  // Nạp cấu hình cho lớp API ngay lúc render, để màn hình con (chạy effect trước) luôn dùng giá trị mới.
  setApiConfig({ scId, jmId, quality, vn });

  const value = useMemo(() => {
    const scale = (SIZES.find((s) => s.name === size) || SIZES[0]).scale;
    const color = (ACCENTS.find((a) => a.name === accent) || ACCENTS[0]).color;
    return {
      mode, setMode, accent, setAccent, size, setSize, fade, setFade, scId, setScId, jmId, setJmId, quality, setQuality, vn, setVn, src, setSrc,
      liquid: mode === 'liquid',
      colors: { ...BASE[mode], accent: color, page: mode === 'liquid' ? 'transparent' : BASE[mode].bg },
      fs: (n) => Math.round(n * scale),
    };
  }, [mode, accent, size, fade, scId, jmId, quality, vn, src]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
