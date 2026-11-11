import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { getTrending } from '../api';
import TrackList from '../components/TrackList';

const HERO = 8;

export default function HomeScreen() {
  const { colors, fs } = useTheme();
  const { playAt } = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    h1: { color: colors.text, fontSize: fs(30), fontWeight: '800', paddingHorizontal: 16, paddingTop: 12 },
    h2: { color: colors.text, fontSize: fs(20), fontWeight: '700', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
    card: { width: 210, marginRight: 14 },
    cover: { width: 210, height: 210, borderRadius: 18, backgroundColor: colors.surface },
    title: { color: colors.text, fontSize: fs(16), fontWeight: '700', marginTop: 8 },
    artist: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
  }), [colors, fs]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setTracks(await getTrending()); }
    catch (e) { setError('Không tải được nhạc. Kiểm tra mạng rồi kéo xuống để thử lại.'); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const header = tracks.length ? (
    <View>
      <Text style={s.h1}>Khám phá</Text>
      <Text style={s.h2}>Nổi bật hôm nay</Text>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={tracks.slice(0, HERO)} keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item, index }) => (
          <Pressable style={s.card} onPress={() => playAt(tracks, index)}>
            {item.artwork ? <Image source={{ uri: item.artwork }} style={s.cover} /> : <View style={s.cover} />}
            <Text numberOfLines={1} style={s.title}>{item.title}</Text>
            <Text numberOfLines={1} style={s.artist}>{item.artist}</Text>
          </Pressable>
        )}
      />
      <Text style={s.h2}>Đang được nghe nhiều</Text>
    </View>
  ) : <Text style={s.h1}>Khám phá</Text>;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TrackList
        tracks={tracks.slice(HERO)} queue={tracks} offset={HERO}
        loading={loading} error={error} emptyText="Chưa có bài nào."
        onRefresh={load} header={header}
      />
    </SafeAreaView>
  );
}
