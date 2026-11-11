import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Pressable, FlatList, ScrollView, ActivityIndicator, TextInput, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { searchTracks, searchArtists, searchSoundCloud, VIET_TAGS } from '../api';
import TrackList from '../components/TrackList';
import Segmented from '../components/Segmented';

export default function SearchScreen() {
  const { colors, fs, scId } = useTheme();
  const { openArtist } = usePlayer();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('tracks');
  const [source, setSource] = useState('audius'); // audius | soundcloud
  const [tracks, setTracks] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [longOnly, setLongOnly] = useState(false);
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.page },
    input: { margin: 16, marginBottom: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface, color: colors.text, fontSize: fs(17), borderWidth: 1, borderColor: colors.line },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    name: { color: colors.text, fontSize: fs(17), fontWeight: '600' },
    sub: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
    ext: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    extBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.line, marginRight: 8 },
    extText: { color: colors.text, fontSize: fs(14), fontWeight: '600', marginLeft: 6 },
    chips: { paddingHorizontal: 16, paddingBottom: 8 },
    chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surface, marginRight: 8, borderWidth: 1, borderColor: colors.line },
    chipText: { color: colors.muted, fontSize: fs(14), fontWeight: '600' },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 32, lineHeight: fs(24), fontSize: fs(15) },
  }), [colors, fs]);

  useEffect(() => {
    if (!q.trim()) { setTracks([]); setArtists([]); setError(''); return; }
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        if (source === 'soundcloud') { const r = await searchSoundCloud(q.trim(), scId); if (alive) setTracks(r); }
        else if (mode === 'tracks') { const r = await searchTracks(q.trim()); if (alive) setTracks(r); }
        else { const r = await searchArtists(q.trim()); if (alive) setArtists(r); }
      } catch (e) {
        if (alive) setError(e.message === 'NO_CLIENT_ID' ? 'Chưa nhập SoundCloud client_id. Vào Cài đặt › Nguồn nhạc để nhập.' : 'Tìm kiếm thất bại. Thử lại sau.');
      }
      if (alive) setLoading(false);
    }, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [q, mode, source, scId]);

  const emptyText = q ? 'Không có kết quả.' : mode === 'tracks' ? 'Nhập tên bài hát để tìm.' : 'Nhập tên nghệ sĩ để tìm.';

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TextInput
        value={q} onChangeText={setQ} placeholder={mode === 'tracks' ? 'Tên bài hát hoặc nghệ sĩ' : 'Tên nghệ sĩ'}
        placeholderTextColor={colors.muted} style={s.input} autoCorrect={false} returnKeyType="search"
      />
      <Segmented options={[{ key: 'audius', label: 'Audius' }, { key: 'soundcloud', label: 'SoundCloud' }]} value={source} onChange={(k) => { setSource(k); setMode('tracks'); setTracks([]); }} />
      {source === 'audius' && (
        <Segmented options={[{ key: 'tracks', label: 'Bài hát' }, { key: 'artists', label: 'Nghệ sĩ' }]} value={mode} onChange={setMode} />
      )}
      {!!q.trim() && (
        <View style={s.ext}>
          <Pressable style={s.extBtn} onPress={() => Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(q.trim())}`)}>
            <Ionicons name="open-outline" size={16} color={colors.muted} /><Text style={s.extText}>Tìm trên Spotify</Text>
          </Pressable>
          <Pressable style={s.extBtn} onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}`)}>
            <Ionicons name="open-outline" size={16} color={colors.muted} /><Text style={s.extText}>Tìm trên YouTube</Text>
          </Pressable>
        </View>
      )}
      {mode === 'tracks' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.chips}>
          <Pressable onPress={() => setLongOnly((v) => !v)} style={[s.chip, longOnly && { backgroundColor: colors.accent }]}>
            <Text style={[s.chipText, longOnly && { color: '#fff' }]}>Chỉ bản mix dài (&gt;15 phút)</Text>
          </Pressable>
          {VIET_TAGS.map((t) => (
            <Pressable key={t.label} onPress={() => { setQ(t.queries[0]); if (t.minDuration) setLongOnly(true); }} style={s.chip}>
              <Text style={s.chipText}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {mode === 'tracks' ? (
        <TrackList
          tracks={longOnly ? tracks.filter((t) => t.duration >= 900) : tracks}
          loading={loading} error={error} emptyText={longOnly && tracks.length ? 'Không có bản mix dài nào trong kết quả. Tắt bộ lọc để xem tất cả.' : emptyText}
        />
      ) : loading && !artists.length ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={artists} keyExtractor={(a) => String(a.id)}
          ListEmptyComponent={<Text style={s.empty}>{error || emptyText}</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => openArtist(item)}>
              {item.avatar ? <Image source={{ uri: item.avatar }} style={s.avatar} /> : <View style={s.avatar}><Ionicons name="person" size={26} color={colors.muted} /></View>}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={s.name}>{item.name}</Text>
                <Text style={s.sub}>{item.tracks} bài · {item.followers} người theo dõi</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
