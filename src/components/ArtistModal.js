import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Image, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { getArtistTracks, getArtistInfo, getArtistCollections, getCollectionTracks } from '../api';
import TrackList from './TrackList';
import MiniPlayer from './MiniPlayer';
import AddToPlaylistModal from './AddToPlaylistModal';
import Segmented from './Segmented';
import { shareTrack } from '../ui';

const n = (x) => (x >= 1e6 ? (x / 1e6).toFixed(1) + 'M' : x >= 1e3 ? (x / 1e3).toFixed(1) + 'K' : String(x || 0));

export default function ArtistModal() {
  const { artist, closeArtist, playAt, setPlayerOpen, isFollowing, toggleFollow, startRadio } = usePlayer();
  const { colors, fs } = useTheme();
  const [tab, setTab] = useState('top');
  const [pop, setPop] = useState([]);
  const [recent, setRecent] = useState([]);
  const [cols, setCols] = useState([]);
  const [col, setCol] = useState(null); // album/playlist đang mở
  const [colTracks, setColTracks] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    top: { padding: 16 },
    cover: { height: 120, marginHorizontal: 16, borderRadius: 16, backgroundColor: colors.surface },
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    name: { color: colors.text, fontSize: fs(24), fontWeight: '800' },
    stats: { color: colors.muted, fontSize: fs(14), marginTop: 4 },
    bio: { color: colors.muted, fontSize: fs(14), lineHeight: fs(21), paddingHorizontal: 16, marginBottom: 6 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, marginBottom: 8 },
    pillText: { color: '#fff', fontWeight: '700', fontSize: fs(15), marginLeft: 6 },
    ghost: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, marginRight: 10, marginBottom: 8 },
    ghostText: { color: colors.muted, fontSize: fs(15), marginLeft: 6 },
    colRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
    colArt: { width: 60, height: 60, borderRadius: 12, backgroundColor: colors.surface },
    colName: { color: colors.text, fontSize: fs(17), fontWeight: '600' },
    colSub: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 30, paddingHorizontal: 32, fontSize: fs(15), lineHeight: fs(24) },
  }), [colors, fs]);

  const id = artist?.id;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setTab('top'); setPop([]); setRecent([]); setCols([]); setCol(null); setInfo(null); setError(''); setLoading(true); setMore(false);
    getArtistTracks(id, 'plays')
      .then((t) => { if (alive) setPop(t); })
      .catch(() => { if (alive) setError('Không tải được bài hát của nghệ sĩ này.'); })
      .finally(() => { if (alive) setLoading(false); });
    getArtistInfo(id).then((i) => { if (alive) setInfo(i); }).catch(() => {});
    getArtistCollections(id).then((c) => { if (alive) setCols(c); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  // Bài mới nhất chỉ tải khi mở tab.
  useEffect(() => {
    if (!id || tab !== 'new' || recent.length) return;
    let alive = true;
    setLoading(true);
    getArtistTracks(id, 'date').then((t) => { if (alive) setRecent(t); }).catch(() => { if (alive) setError('Không tải được bài mới.'); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, tab]);

  const openCol = (c) => {
    setCol(c); setColTracks([]); setLoading(true); setError('');
    getCollectionTracks(c).then(setColTracks).catch(() => setError('Không tải được danh sách này.')).finally(() => setLoading(false));
  };

  if (!artist) return null;
  const avatar = info?.avatar || artist.avatar || pop[0]?.artwork;
  const tracks = col ? colTracks : tab === 'new' ? recent : pop;
  const following = isFollowing(id);
  const shuffleAll = () => { if (tracks.length) playAt([...tracks].sort(() => Math.random() - 0.5), 0); };
  const openFull = () => { closeArtist(); setTimeout(() => setPlayerOpen(true), 450); };
  const tabs = [{ key: 'top', label: 'Phổ biến' }, { key: 'new', label: 'Mới nhất' }, ...(cols.length ? [{ key: 'cols', label: 'Album & Playlist' }] : [])];

  const header = (
    <View>
      {info?.cover ? <Image source={{ uri: info.cover }} style={s.cover} /> : null}
      <View style={s.head}>
        {avatar ? <Image source={{ uri: avatar }} style={s.avatar} /> : <View style={s.avatar}><Ionicons name="person" size={36} color={colors.muted} /></View>}
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text numberOfLines={2} style={s.name}>{info?.name || artist.name}</Text>
          {info && (info.followers > 0 || info.tracks > 0) ? <Text style={s.stats}>{n(info.followers)} người theo dõi · {info.tracks} bài</Text> : null}
        </View>
      </View>
      {info?.bio ? (
        <Pressable onPress={() => setMore((v) => !v)}>
          <Text numberOfLines={more ? undefined : 3} style={s.bio}>{info.bio}</Text>
        </Pressable>
      ) : null}
      <View style={s.actions}>
        <Pressable style={following ? s.ghost : s.pill} onPress={() => toggleFollow({ id, name: info?.name || artist.name, avatar })}>
          <Ionicons name={following ? 'checkmark' : 'person-add-outline'} size={18} color={following ? colors.text : '#fff'} />
          <Text style={following ? [s.ghostText, { color: colors.text }] : s.pillText}>{following ? 'Đang theo dõi' : 'Theo dõi'}</Text>
        </Pressable>
        {tracks.length > 0 && (
          <Pressable style={s.pill} onPress={() => playAt(tracks, 0)}>
            <Ionicons name="play" size={18} color="#fff" /><Text style={s.pillText}>Phát tất cả</Text>
          </Pressable>
        )}
        {tracks.length > 0 && (
          <Pressable style={s.ghost} onPress={shuffleAll}>
            <Ionicons name="shuffle" size={18} color={colors.muted} /><Text style={s.ghostText}>Xáo trộn</Text>
          </Pressable>
        )}
        {pop.length > 0 && (
          <Pressable style={s.ghost} onPress={() => startRadio(pop[0])}>
            <Ionicons name="radio-outline" size={18} color={colors.muted} /><Text style={s.ghostText}>Radio</Text>
          </Pressable>
        )}
        {info?.link ? (
          <Pressable style={s.ghost} onPress={() => shareTrack({ title: info.name, artist: 'Nghệ sĩ', link: info.link })}>
            <Ionicons name="share-outline" size={18} color={colors.muted} /><Text style={s.ghostText}>Chia sẻ</Text>
          </Pressable>
        ) : null}
      </View>
      {col ? (
        <Pressable style={[s.colRow, { paddingBottom: 4 }]} onPress={() => setCol(null)}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text numberOfLines={1} style={[s.colName, { marginLeft: 6, flex: 1 }]}>{col.name}</Text>
        </Pressable>
      ) : <Segmented options={tabs} value={tab} onChange={setTab} />}
    </View>
  );

  const showCols = !col && tab === 'cols';
  return (
    <Modal visible animationType="slide" onRequestClose={closeArtist}>
      <SafeAreaView style={s.screen}>
        <Pressable hitSlop={16} onPress={closeArtist} style={s.top}>
          <Ionicons name="chevron-down" size={30} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          {showCols ? (
            <FlatList
              data={cols} keyExtractor={(c) => String(c.id)} ListHeaderComponent={header}
              ListEmptyComponent={<Text style={s.empty}>Chưa có album hay playlist.</Text>}
              renderItem={({ item }) => (
                <Pressable style={s.colRow} onPress={() => openCol(item)}>
                  {item.artwork ? <Image source={{ uri: item.artwork }} style={s.colArt} /> : <View style={s.colArt} />}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text numberOfLines={1} style={s.colName}>{item.name}</Text>
                    <Text style={s.colSub}>{item.isAlbum ? 'Album' : 'Playlist'}{item.count ? ` · ${item.count} bài` : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.muted} />
                </Pressable>
              )}
            />
          ) : (
            <TrackList tracks={tracks} loading={loading} error={error} emptyText="Chưa có bài nào ở mục này." header={header} />
          )}
        </View>
        <MiniPlayer onOpen={openFull} />
      </SafeAreaView>
      <AddToPlaylistModal enabled />
    </Modal>
  );
}
