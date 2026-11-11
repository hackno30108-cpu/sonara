import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';

export default function MiniPlayer() {
  const { current, status, toggle, next, setPlayerOpen } = usePlayer();
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    wrap: { backgroundColor: colors.surface },
    row: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingHorizontal: 12 },
    art: { width: 46, height: 46, borderRadius: 6 },
    info: { flex: 1, marginHorizontal: 10 },
    title: { color: colors.text, fontWeight: '600', fontSize: fs(15) },
    artist: { color: colors.muted, fontSize: fs(13) },
    bar: { height: 2, backgroundColor: colors.line },
    fill: { height: 2, backgroundColor: colors.accent },
  }), [colors, fs]);
  if (!current) return null;
  const p = status.duration ? status.currentTime / status.duration : 0;
  return (
    <Pressable onPress={() => setPlayerOpen(true)} style={s.wrap}>
      <View style={s.row}>
        {current.artwork && <Image source={{ uri: current.artwork }} style={s.art} />}
        <View style={s.info}>
          <Text numberOfLines={1} style={s.title}>{current.title}</Text>
          <Text numberOfLines={1} style={s.artist}>{current.artist}</Text>
        </View>
        <Pressable hitSlop={10} onPress={toggle}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={30} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={10} onPress={next} style={{ marginLeft: 16 }}>
          <Ionicons name="play-skip-forward" size={26} color={colors.text} />
        </Pressable>
      </View>
      <View style={s.bar}><View style={[s.fill, { width: `${p * 100}%` }]} /></View>
    </Pressable>
  );
}
