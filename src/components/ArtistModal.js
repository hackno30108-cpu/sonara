import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { getArtistTracks } from '../api';
import TrackList from './TrackList';
import MiniPlayer from './MiniPlayer';
import AddToPlaylistModal from './AddToPlaylistModal';

export default function ArtistModal() {
  const { artist, closeArtist, playAt, setPlayerOpen } = usePlayer();
  const { colors, fs } = useTheme();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    top: { padding: 16 },
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
    avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    name: { flex: 1, marginLeft: 14, color: colors.text, fontSize: fs(24), fontWeight: '800' },
    actions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10 },
    pillText: { color: '#fff', fontWeight: '700', fontSize: fs(15), marginLeft: 6 },
    ghost: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
    ghostText: { color: colors.muted, fontSize: fs(15), marginLeft: 6 },
  }), [colors, fs]);

  const id = artist?.id;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    setTracks([]); setError(''); setLoading(true);
    getArtistTracks(id)
      .then((t) => { if (alive) setTracks(t); })
      .catch(() => { if (alive) setError('Không tải được bài hát của nghệ sĩ này.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (!artist) return null;
  const avatar = artist.avatar || tracks[0]?.artwork;
  const shuffleAll = () => {
    if (!tracks.length) return;
    const mixed = [...tracks].sort(() => Math.random() - 0.5);
    playAt(mixed, 0);
  };
  const openFull = () => { closeArtist(); setTimeout(() => setPlayerOpen(true), 450); };

  const header = (
    <View>
      <View style={s.head}>
        {avatar ? <Image source={{ uri: avatar }} style={s.avatar} /> : <View style={s.avatar}><Ionicons name="person" size={36} color={colors.muted} /></View>}
        <Text numberOfLines={2} style={s.name}>{artist.name}</Text>
      </View>
      {tracks.length > 0 && (
        <View style={s.actions}>
          <Pressable style={s.pill} onPress={() => playAt(tracks, 0)}>
            <Ionicons name="play" size={18} color="#fff" /><Text style={s.pillText}>Phát tất cả</Text>
          </Pressable>
          <Pressable style={s.ghost} onPress={shuffleAll}>
            <Ionicons name="shuffle" size={18} color={colors.muted} /><Text style={s.ghostText}>Xáo trộn</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={closeArtist}>
      <SafeAreaView style={s.screen}>
        <Pressable hitSlop={16} onPress={closeArtist} style={s.top}>
          <Ionicons name="chevron-down" size={30} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <TrackList tracks={tracks} loading={loading} error={error} emptyText="Nghệ sĩ này chưa có bài nào." header={header} />
        </View>
        <MiniPlayer onOpen={openFull} />
      </SafeAreaView>
      <AddToPlaylistModal enabled />
    </Modal>
  );
}
