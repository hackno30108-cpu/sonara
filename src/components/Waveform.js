import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '../theme';

const BARS = 64;
function makeBars(seed) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  for (let i = 0; i < BARS; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    out.push(0.25 + 0.75 * (((s >>> 8) % 1000) / 1000));
  }
  return out;
}

export default function Waveform({ seed, progress, onSeek, height = 72, marks = [] }) {
  const { colors } = useTheme();
  const bars = useMemo(() => makeBars(seed), [seed]);
  const [w, setW] = useState(0);
  return (
    <Pressable
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onPress={(e) => w && onSeek(Math.min(1, Math.max(0, e.nativeEvent.locationX / w)))}
      style={{ height, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      {bars.map((h, i) => (
        <View
          key={i}
          style={{ width: 3, borderRadius: 2, height: height * h, backgroundColor: i / BARS <= progress ? colors.accent : colors.wave }}
        />
      ))}
      {w > 0 && marks.map((f, i) => (
        <View key={'m' + i} pointerEvents="none" style={{ position: 'absolute', top: 0, left: Math.max(0, Math.min(w - 6, f * w - 3)), width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
      ))}
    </Pressable>
  );
}
