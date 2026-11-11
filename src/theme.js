import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  dark: { bg: '#15122B', surface: '#1F1B3D', line: '#2C2755', text: '#F3EFFF', muted: '#9A94C4', wave: '#3A3566' },
  light: { bg: '#F7F5FF', surface: '#FFFFFF', line: '#E3DFF5', text: '#1B1736', muted: '#6B6590', wave: '#CFC9EE' },
};
const KEY = 'sonara:settings';
const Ctx = createContext(null);
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');
  const [accent, setAccent] = useState(ACCENTS[0].name);
  const [size, setSize] = useState(SIZES[0].name);
  const [fade, setFade] = useState(true);
  const [scId, setScId] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (!v) return;
        const o = JSON.parse(v);
        if (o.mode) setMode(o.mode);
        if (o.accent) setAccent(o.accent);
        if (o.size) setSize(o.size);
        if (typeof o.fade === 'boolean') setFade(o.fade);
        if (typeof o.scId === 'string') setScId(o.scId);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(KEY, JSON.stringify({ mode, accent, size, fade, scId })).catch(() => {});
  }, [mode, accent, size, fade, scId, loaded]);

  const value = useMemo(() => {
    const scale = (SIZES.find((s) => s.name === size) || SIZES[0]).scale;
    const color = (ACCENTS.find((a) => a.name === accent) || ACCENTS[0]).color;
    return {
      mode, setMode, accent, setAccent, size, setSize, fade, setFade, scId, setScId,
      colors: { ...BASE[mode], accent: color },
      fs: (n) => Math.round(n * scale),
    };
  }, [mode, accent, size, fade, scId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
