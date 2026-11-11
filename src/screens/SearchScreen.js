import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { searchTracks } from '../api';
import TrackList from '../components/TrackList';

export default function SearchScreen() {
  const { colors, fs } = useTheme();
  const [q, setQ] = useState('');
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    input: { margin: 16, padding: 14, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, fontSize: fs(17) },
  }), [colors, fs]);

  useEffect(() => {
    if (!q.trim()) { setTracks([]); setError(''); return; }
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try { setTracks(await searchTracks(q.trim())); }
      catch (e) { setError('Tìm kiếm thất bại. Thử lại sau.'); }
      setLoading(false);
    }, 450);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TextInput
        value={q} onChangeText={setQ} placeholder="Tên bài hát hoặc nghệ sĩ"
        placeholderTextColor={colors.muted} style={s.input} autoCorrect={false} returnKeyType="search"
      />
      <TrackList tracks={tracks} loading={loading} error={error} emptyText={q ? 'Không có kết quả.' : 'Nhập tên bài hát để tìm.'} />
    </SafeAreaView>
  );
}
