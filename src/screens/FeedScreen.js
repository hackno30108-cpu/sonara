import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { getFollowFeed } from '../api';
import TrackList from '../components/TrackList';

// Bảng tin: bài mới nhất của các nghệ sĩ bạn theo dõi (danh sách theo dõi lưu trong máy).
export default function FeedScreen() {
  const { colors, fs } = useTheme();
  const { follows, openArtist } = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const key = follows.map((f) => f.id).join(',');
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.page },
    h1: { color: colors.text, fontSize: fs(30), fontWeight: '800', padding: 16, paddingBottom: 8 },
    h2: { color: colors.text, fontSize: fs(18), fontWeight: '700', paddingHorizontal: 16, marginTop: 14, marginBottom: 8 },
    row: { paddingHorizontal: 12 },
    who: { width: 76, alignItems: 'center', marginHorizontal: 4 },
    av: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    nm: { color: colors.muted, fontSize: fs(12), marginTop: 6 },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 32, lineHeight: fs(24), fontSize: fs(15) },
  }), [colors, fs]);

  const load = useCallback(async () => {
    if (!follows.length) { setTracks([]); setError(''); return; }
    setLoading(true); setError('');
    try { setTracks(await getFollowFeed(follows)); } catch (e) { setError('Không tải được bảng tin. Kéo xuống để thử lại.'); }
    setLoading(false);
  }, [key]);
  useEffect(() => { load(); }, [load]);

  const header = (
    <View>
      <Text style={s.h1}>Bảng tin</Text>
      {follows.length > 0 && (
        <>
          <Text style={s.h2}>Đang theo dõi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {follows.map((f) => (
              <Pressable key={String(f.id)} style={s.who} onPress={() => openArtist(f)}>
                {f.avatar ? <Image source={{ uri: f.avatar }} style={s.av} /> : <View style={s.av}><Ionicons name="person" size={26} color={colors.muted} /></View>}
                <Text numberOfLines={1} style={s.nm}>{f.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.h2}>Bài mới nhất</Text>
        </>
      )}
    </View>
  );
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TrackList
        tracks={tracks} loading={loading} error={error} onRefresh={load} header={header}
        emptyText={follows.length ? 'Các nghệ sĩ bạn theo dõi chưa có bài mới.' : 'Bạn chưa theo dõi ai. Mở trang một nghệ sĩ (chạm tên nghệ sĩ ở trình phát, hoặc chọn "Xem nghệ sĩ" ở dấu ⋯) rồi bấm Theo dõi. Bài mới của họ sẽ hiện ở đây.'}
      />
    </SafeAreaView>
  );
}
