import React from 'react';
import { Modal, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { usePlayer } from '../PlayerContext';
import Waveform from './Waveform';

const fmt = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export default function FullPlayer() {
  const { current, status, toggle, next, prev, seek, toggleLike, isLiked, playerOpen, setPlayerOpen } = usePlayer();
  if (!current) return null;
  const dur = status.duration || current.duration || 0;
  const progress = dur ? status.currentTime / dur : 0;

  return (
    <Modal visible={playerOpen} animationType="slide" onRequestClose={() => setPlayerOpen(false)}>
      <SafeAreaView style={s.screen}>
        <Pressable hitSlop={16} onPress={() => setPlayerOpen(false)} style={s.close}>
          <Ionicons name="chevron-down" size={30} color={colors.text} />
        </Pressable>
        {current.artwork
          ? <Image source={{ uri: current.artwork }} style={s.art} />
          : <View style={[s.art, { backgroundColor: colors.surface }]} />}
        <View style={s.meta}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={s.title}>{current.title}</Text>
            <Text numberOfLines={1} style={s.artist}>{current.artist}</Text>
          </View>
          <Pressable hitSlop={12} onPress={() => toggleLike(current)}>
            <Ionicons name={isLiked(current.id) ? 'heart' : 'heart-outline'} size={28} color={isLiked(current.id) ? colors.accent : colors.muted} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 24 }}>
          <Waveform seed={current.id} progress={progress} onSeek={(f) => seek(f * dur)} />
          <View style={s.times}>
            <Text style={s.time}>{fmt(status.currentTime)}</Text>
            <Text style={s.time}>{fmt(dur)}</Text>
          </View>
        </View>
        <View style={s.controls}>
          <Pressable hitSlop={12} onPress={prev}><Ionicons name="play-skip-back" size={34} color={colors.text} /></Pressable>
          <Pressable onPress={toggle} style={s.playBtn}>
            <Ionicons name={status.playing ? 'pause' : 'play'} size={36} color="#fff" style={{ marginLeft: status.playing ? 0 : 3 }} />
          </Pressable>
          <Pressable hitSlop={12} onPress={next}><Ionicons name="play-skip-forward" size={34} color={colors.text} /></Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  close: { padding: 16 },
  art: { width: '84%', aspectRatio: 1, alignSelf: 'center', borderRadius: 12, marginTop: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', padding: 24 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  artist: { color: colors.muted, fontSize: 15, marginTop: 4 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  time: { color: colors.muted, fontSize: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginTop: 28 },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
