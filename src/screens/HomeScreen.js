import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { getFeed, getRecommendations, sourceReady, SOURCES, GENRES, VIET_TAGS } from '../api';
import TrackList from '../components/TrackList';

const HERO = 8;

export default function HomeScreen() {
  const { colors, fs, scId, jmId, vn, quality, src, setSrc } = useTheme();
  const { playAt, likes, history } = usePlayer();
  const [sel, setSel] = useState(null); // null | { kind: 'viet' | 'genre', key }
  const [tracks, setTracks] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const ready = sourceReady(src);
  const seedRef = useRef({ likes, history });
  seedRef.current = { likes, history };

  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.page },
    h1: { color: colors.text, fontSize: fs(30), fontWeight: '800', paddingHorizontal: 16, paddingTop: 12 },
    h2: { color: colors.text, fontSize: fs(20), fontWeight: '700', paddingHorizontal: 16, marginTop: 20, marginBottom: 10 },
    note: { color: colors.muted, fontSize: fs(13), lineHeight: fs(20), paddingHorizontal: 16, marginBottom: 4 },
    chips: { paddingHorizontal: 16, paddingTop: 4 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surface, marginRight: 8, borderWidth: 1, borderColor: colors.line },
    chipViet: { borderColor: colors.accent },
    srcChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: colors.line },
    chipText: { color: colors.muted, fontSize: fs(15), fontWeight: '600' },
    card: { width: 210, marginRight: 14 },
    cover: { width: 210, height: 210, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
    title: { color: colors.text, fontSize: fs(16), fontWeight: '700', marginTop: 8 },
    artist: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
  }), [colors, fs]);

  const load = useCallback(async (sl, source) => {
    const id = ++reqId.current;
    setLoading(true); setError('');
    try {
      const t = await getFeed(sl, source);
      if (id !== reqId.current) return;
      setTracks(t);
    } catch (e) {
      if (id !== reqId.current) return;
      setTracks([]);
      setError('Không tải được nhạc. Kiểm tra mạng rồi kéo xuống để thử lại.');
    }
    setLoading(false);
    if (!sl) {
      const { likes: l, history: h } = seedRef.current;
      const seed = [...l, ...l, ...h.slice(0, 20)];
      if (seed.length) getRecommendations(seed).then((r) => { if (id === reqId.current) setRecs(r); }).catch(() => {});
    }
  }, []);
  useEffect(() => {
    setRecs([]);
    if (!ready) { reqId.current++; setTracks([]); setLoading(false); setError(''); return; }
    load(sel, src);
  }, [sel, src, ready, scId, jmId, vn, quality, load]);

  const pick = (c) => {
    if ((c?.key ?? null) === (sel?.key ?? null) && c?.kind === sel?.kind) return;
    setTracks([]); setSel(c);
  };

  const cards = (title, list) => (
    <View>
      <Text style={s.h2}>{title}</Text>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={list} keyExtractor={(t) => String(t.id)}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item, index }) => (
          <Pressable style={s.card} onPress={() => playAt(list, index)}>
            {item.artwork ? <Image source={{ uri: item.artwork }} style={s.cover} /> : <View style={s.cover} />}
            <Text numberOfLines={1} style={s.title}>{item.title}</Text>
            <Text numberOfLines={1} style={s.artist}>{item.artist}</Text>
          </Pressable>
        )}
      />
    </View>
  );

  const allChips = [
    { kind: null, key: null, label: 'Tất cả' },
    ...VIET_TAGS.map((t) => ({ kind: 'viet', key: t.label, label: t.label })),
    ...GENRES.map((g) => ({ kind: 'genre', key: g, label: g })),
  ];
  const header = (
    <View>
      <Text style={s.h1}>Khám phá</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={{ marginTop: 10, flexGrow: 0 }}>
        {SOURCES.map((o) => {
          const on = o.key === src;
          return (
            <Pressable key={o.key} onPress={() => { if (!on) { setTracks([]); setSrc(o.key); } }} style={[s.srcChip, on && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              <Text style={[s.chipText, on && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!ready && (
        <Text style={s.note}>
          {src === 'jamendo'
            ? 'Jamendo cần client_id miễn phí (đăng ký ở devportal.jamendo.com). Nhập ở Cài đặt › Nguồn nhạc.'
            : 'SoundCloud cần client_id của bạn. Nhập ở Cài đặt › Nguồn nhạc.'}
        </Text>
      )}
      {src === 'all' && !jmId && (
        <Text style={s.note}>Mẹo: nhập Jamendo client_id ở Cài đặt để có thêm nhạc từ Jamendo trong mục Tất cả.</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {allChips.map((c) => {
          const on = c.kind === null ? !sel : sel && sel.kind === c.kind && sel.key === c.key;
          return (
            <Pressable key={c.kind + c.label} onPress={() => pick(c.kind ? c : null)} style={[s.chip, c.kind === 'viet' && s.chipViet, on && { backgroundColor: colors.accent }]}>
              <Text style={[s.chipText, on && { color: '#fff' }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!sel && recs.length > 0 && cards('Gợi ý cho bạn', recs.slice(0, 12))}
      {tracks.length > 0 && cards(sel ? sel.key : vn === 'off' ? 'Nổi bật hôm nay' : 'Nhạc Việt mới & nổi bật', tracks.slice(0, HERO))}
      {tracks.length > HERO && <Text style={s.h2}>{sel ? 'Thêm trong mục này' : 'Tiếp theo cho bạn'}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TrackList
        tracks={tracks.slice(HERO)} queue={tracks} offset={HERO}
        loading={loading} error={error} emptyText={vn === 'only' ? 'Chưa tìm thấy bài nhạc Việt nào cho mục này. Thử nguồn "Tất cả", mục khác, hoặc đổi "Ưu tiên nhạc Việt" trong Cài đặt.' : 'Chưa tìm thấy bài nào cho mục này. Thử mục khác hoặc dùng tab Tìm kiếm.'}
        onRefresh={() => ready && load(sel, src)} header={header}
      />
    </SafeAreaView>
  );
}
