import React, { useEffect, useState, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { getTrending } from '../api';
import TrackList from '../components/TrackList';

export default function HomeScreen() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTracks(await getTrending()); }
    catch (e) { setError('Không tải được nhạc. Kiểm tra mạng rồi kéo xuống để thử lại.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <Text style={s.h1}>Đang được nghe nhiều</Text>
      <TrackList tracks={tracks} loading={loading} error={error} emptyText="Chưa có bài nào." onRefresh={load} />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', padding: 16 },
});
