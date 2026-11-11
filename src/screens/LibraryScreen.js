import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { usePlayer } from '../PlayerContext';
import TrackList from '../components/TrackList';

export default function LibraryScreen() {
  const { likes } = usePlayer();
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Text style={s.h1}>Bài đã thích</Text>
      <TrackList tracks={likes} emptyText="Chạm biểu tượng trái tim ở bất kỳ bài nào để lưu vào đây." />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', padding: 16 },
});
