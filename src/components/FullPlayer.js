import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, Image, Pressable, ScrollView, Animated, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { showSheet } from '../ui';
import Waveform from './Waveform';
import QueueModal from './QueueModal';

const fmt = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEPS = [
  { label: '15 phút', v: 15 }, { label: '30 phút', v: 30 }, { label: '45 phút', v: 45 },
  { label: '1 giờ', v: 60 }, { label: 'Hết bài này', v: 'end' },
];

export default function FullPlayer() {
  const { current, status, toggle, next, prev, seek, toggleLike, isLiked, playerOpen, setPlayerOpen,
    shuffle, toggleShuffle, repeat, cycleRepeat, rate, setRate, sleepEnd, setSleep,
    canDownload, isDownloaded, download, removeDownload, downloading, openArtist } = usePlayer();
  const { colors, fs } = useTheme();
  const [queueOpen, setQueueOpen] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const fadeArt = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: status.playing ? 1 : 0.86, friction: 7, useNativeDriver: true }).start();
  }, [status.playing]);
  useEffect(() => {
    fadeArt.setValue(0);
    Animated.timing(fadeArt, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [current?.id]);

  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    close: { padding: 16 },
    art: { width: '76%', aspectRatio: 1, alignSelf: 'center', borderRadius: 16, backgroundColor: colors.surface },
    meta: { flexDirection: 'row', alignItems: 'center', padding: 24, paddingBottom: 12 },
    title: { color: colors.text, fontSize: fs(22), fontWeight: '800' },
    artist: { color: colors.muted, fontSize: fs(16), marginTop: 4 },
    times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    time: { color: colors.muted, fontSize: fs(13) },
    controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginTop: 20, marginBottom: 20 },
    playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    badge: { position: 'absolute', right: -4, top: -4, fontSize: 11, fontWeight: '800', color: colors.accent },
    tools: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 28 },
    tool: { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 4, borderRadius: 14, backgroundColor: colors.surface },
    toolText: { color: colors.muted, fontSize: fs(12), marginTop: 4, fontWeight: '600' },
  }), [colors, fs]);
  if (!current) return null;
  const dur = status.duration || current.duration || 0;
  const progress = dur ? status.currentTime / dur : 0;
  const liked = isLiked(current.id);
  const saved = isDownloaded(current.id);
  const busy = !!downloading[current.id];

  const speedSheet = () => showSheet('Tốc độ phát', SPEEDS.map((r) => (r === 1 ? 'Bình thường (1x)' : `${r}x`)), (i) => setRate(SPEEDS[i]));
  const sleepSheet = () => {
    const opts = SLEEPS.map((x) => x.label);
    if (sleepEnd) opts.push('Tắt hẹn giờ');
    showSheet('Hẹn giờ tắt nhạc', opts, (i) => setSleep(i < SLEEPS.length ? SLEEPS[i].v : null), sleepEnd ? SLEEPS.length : undefined);
  };
  const downloadPress = () => {
    if (saved) {
      Alert.alert('Xóa bản tải về?', 'Bài này sẽ không còn nghe được khi không có mạng.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => removeDownload(current.id) },
      ]);
    } else if (!busy) download(current);
  };
  const sleepLabel = sleepEnd === 'end' ? 'Hết bài' : sleepEnd ? `${Math.max(1, Math.ceil((sleepEnd - Date.now()) / 60000))} phút` : 'Hẹn giờ';
  const goArtist = () => {
    if (!current.userId) return;
    setPlayerOpen(false);
    setTimeout(() => openArtist({ id: current.userId, name: current.artist }), 450);
  };
  const tool = (icon, label, on, onPress) => (
    <Pressable style={s.tool} onPress={onPress}>
      <Ionicons name={icon} size={22} color={on ? colors.accent : colors.text} />
      <Text style={[s.toolText, on && { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={playerOpen} animationType="slide" onRequestClose={() => setPlayerOpen(false)}>
      <View style={s.screen}>
        {current.artwork ? <Image source={{ uri: current.artwork }} blurRadius={45} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: current.artwork ? 0.78 : 1 }]} />
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable hitSlop={16} onPress={() => setPlayerOpen(false)} style={s.close}>
              <Ionicons name="chevron-down" size={30} color={colors.text} />
            </Pressable>
            <Animated.View style={{ opacity: fadeArt, transform: [{ scale }] }}>
              {current.artwork ? <Image source={{ uri: current.artwork }} style={s.art} /> : <View style={s.art} />}
            </Animated.View>
            <View style={s.meta}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={2} style={s.title}>{current.title}</Text>
                <Pressable onPress={goArtist} disabled={!current.userId}>
                  <Text numberOfLines={1} style={s.artist}>{current.artist}</Text>
                </Pressable>
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
            <View style={s.tools}>
              {tool('speedometer-outline', rate === 1 ? '1x' : `${rate}x`, rate !== 1, speedSheet)}
              {tool('moon-outline', sleepLabel, !!sleepEnd, sleepSheet)}
              {tool('list', 'Hàng đợi', false, () => setQueueOpen(true))}
              {canDownload && current.source !== 'soundcloud' && tool(saved ? 'checkmark-circle' : 'arrow-down-circle-outline', saved ? 'Đã tải' : busy ? 'Đang tải' : 'Tải về', saved, downloadPress)}
            </View>
          </ScrollView>
        </SafeAreaView>
        <QueueModal visible={queueOpen} onClose={() => setQueueOpen(false)} />
      </View>
    </Modal>
  );
}
