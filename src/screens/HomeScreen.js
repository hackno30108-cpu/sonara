import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, FlatList, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { getTrending, getRecommendations, getViet, scTrending, scGenre, scViet, GENRES, VIET_TAGS } from '../api';
import Segmented from '../components/Segmented';
import TrackList from '../components/TrackList';

const HERO = 8;

export default function HomeScreen() {
  const { colors, fs, scId, src, setSrc } = useTheme();
  const { playAt, likes, history } = usePlayer();
  const [sel, setSel] = useState(null); // null | { kind: 'viet' | 'genre', key }
  const [tracks, setTracks] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const useSC = src === 'soundcloud' && !!scId;
  const scRef = useRef(scId);
  scRef.current = scId;
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
    chipText: { color: colors.muted, fontSize: fs(15), fontWeight: '600' },
    card: { width: 210, marginRight: 14 },
    cover: { width: 210, height: 210, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
    title: { color: colors.text, fontSize: fs(16), fontWeight: '700', marginTop: 8 },
    artist: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
  }), [colors, fs]);

  const load = useCallback(async (sl, sc) => {
    const id = ++reqId.current;
    setLoading(true); setError('');
    try {
      let t;
      if (sc) {
        const cid = scRef.current;
        t = !sl ? await scTrending(cid) : sl.kind === 'genre' ? await scGenre(sl.key, cid) : await scViet(sl.key, cid);
      } else {
        t = !sl ? await getTrending() : sl.kind === 'genre' ? await getTrending(sl.key) : await getViet(sl.key);
      }
      if (id !== reqId.current) return;
      setTracks(t);
    } catch (e) {
      if (id !== reqId.current) return;
      setError('Không tải được nhạc. Kiểm tra mạng rồi kéo xuống để thử lại.');
    }
    setLoading(false);
    if (!sl && !sc) {
      const { likes: l, history: h } = seedRef.current;
      const seed = [...l, ...l, ...h.slice(0, 20)];
      if (seed.length) getRecommendations(seed).then((r) => { if (id === reqId.current) setRecs(r); }).catch(() => {});
    }
  }, []);
  useEffect(() => { setRecs([]); load(sel, useSC); }, [sel, useSC, scId, load]);

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
      <View style={{ marginTop: 10 }}>
        <Segmented options={[{ key: 'soundcloud', label: 'SoundCloud' }, { key: 'audius', label: 'Audius' }]} value={src} onChange={(k) => { setTracks([]); setSrc(k); }} />
      </View>
      {src === 'soundcloud' && !scId && (
        <Text style={s.note}>Chưa có SoundCloud client_id nên đang hiện nhạc Audius. Nhập ở Cài đặt › Nguồn nhạc để lấy danh sách từ SoundCloud.</Text>
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
      {tracks.length > 0 && cards(sel ? sel.key : 'Nổi bật hôm nay', tracks.slice(0, HERO))}
      {tracks.length > HERO && <Text style={s.h2}>Đang được nghe nhiều</Text>}
    </View>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <TrackList
        tracks={tracks.slice(HERO)} queue={tracks} offset={HERO}
        loading={loading} error={error} emptyText="Chưa tìm thấy bài nào cho mục này. Thử mục khác hoặc dùng tab Tìm kiếm."
        onRefresh={() => load(sel, useSC)} header={header}
      />
    </SafeAreaView>
  );
}
