import React, { useMemo } from 'react';
import { Modal, View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import Waveform from './Waveform';

const fmt = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export default function FullPlayer() {
  const { current, status, toggle, next, prev, seek, toggleLike, isLiked, playerOpen, setPlayerOpen,
    shuffle, toggleShuffle, repeat, cycleRepeat } = usePlayer();
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    close: { padding: 16 },
    art: { width: '76%', aspectRatio: 1, alignSelf: 'center', borderRadius: 16, backgroundColor: colors.surface },
    meta: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingBottom: 12 },
    title: { color: colors.text, fontSize: fs(22), fontWeight: '800' },
    artist: { color: colors.muted, fontSize: fs(16), marginTop: 4 },
    times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    time: { color: colors.muted, fontSize: fs(13) },
    controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginTop: 24, marginBottom: 24 },
    playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    badge: { position: 'absolute', right: -4, top: -4, fontSize: 11, fontWeight: '800', color: colors.accent },
  }), [colors, fs]);
  if (!current) return null;
  const dur = status.duration || current.duration || 0;
  const progress = dur ? status.currentTime / dur : 0;
  const liked = isLiked(current.id);

  return (
    <Modal visible={playerOpen} animationType="slide" onRequestClose={() => setPlayerOpen(false)}>
      <SafeAreaView style={s.screen}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Pressable hitSlop={16} onPress={() => setPlayerOpen(false)} style={s.close}>
            <Ionicons name="chevron-down" size={30} color={colors.text} />
          </Pressable>
          {current.artwork ? <Image source={{ uri: current.artwork }} style={s.art} /> : <View style={s.art} />}
          <View style={s.meta}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={s.title}>{current.title}</Text>
              <Text numberOfLines={1} style={s.artist}>{current.artist}</Text>
            </View>
            <Pressable hitSlop={12} onPress={() => toggleLike(current)}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={30} color={liked ? colors.accent : colors.muted} />
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
            <Pressable hitSlop={12} onPress={toggleShuffle}>
              <Ionicons name="shuffle" size={28} color={shuffle ? colors.accent : colors.muted} />
            </Pressable>
            <Pressable hitSlop={12} onPress={prev}><Ionicons name="play-skip-back" size={34} color={colors.text} /></Pressable>
            <Pressable onPress={toggle} style={s.playBtn}>
              <Ionicons name={status.playing ? 'pause' : 'play'} size={36} color="#fff" style={{ marginLeft: status.playing ? 0 : 3 }} />
            </Pressable>
            <Pressable hitSlop={12} onPress={next}><Ionicons name="play-skip-forward" size={34} color={colors.text} /></Pressable>
            <Pressable hitSlop={12} onPress={cycleRepeat}>
              <Ionicons name="repeat" size={28} color={repeat === 'off' ? colors.muted : colors.accent} />
              {repeat === 'one' && <Text style={s.badge}>1</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
