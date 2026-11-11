import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import { showSheet } from '../ui';

export default function TrackItem({ track, onPress, onRemove }) {
  const { current, status, isLiked, toggleLike, setPickTrack, playNext, addToQueue, canDownload,
    isDownloaded, download, removeDownload, downloading, openArtist } = usePlayer();
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
    art: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.surface },
    info: { flex: 1, marginHorizontal: 12 },
    titleRow: { flexDirection: 'row', alignItems: 'center' },
    title: { flexShrink: 1, color: colors.text, fontSize: fs(17), fontWeight: '600' },
    artist: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
    btn: { marginLeft: 14 },
  }), [colors, fs]);
  const active = current?.id === track.id;
  const liked = isLiked(track.id);
  const saved = isDownloaded(track.id);
  const busy = !!downloading[track.id];

  const openMenu = () => {
    const items = [
      { label: 'Phát tiếp theo', run: () => playNext(track) },
      { label: 'Thêm vào hàng đợi', run: () => addToQueue(track) },
      { label: 'Thêm vào playlist', run: () => setPickTrack(track) },
    ];
    if (canDownload && track.source !== 'soundcloud') {
      items.push(saved
        ? { label: 'Xóa bản tải về', run: () => removeDownload(track.id), destructive: true }
        : { label: busy ? 'Đang tải...' : 'Tải về để nghe offline', run: () => !busy && download(track) });
    }
    if (track.source === 'soundcloud' && track.link) items.push({ label: 'Mở trên SoundCloud', run: () => Linking.openURL(track.link) });
    if (track.userId) items.push({ label: 'Xem nghệ sĩ', run: () => openArtist({ id: track.userId, name: track.artist }) });
    showSheet(track.title, items.map((i) => i.label), (i) => items[i].run(), items.findIndex((i) => i.destructive));
  };

  return (
    <Pressable onPress={onPress} style={s.row}>
      {track.artwork ? <Image source={{ uri: track.artwork }} style={s.art} /> : <View style={s.art} />}
      <View style={s.info}>
        <View style={s.titleRow}>
          {active && <Ionicons name={status.playing ? 'volume-high' : 'volume-low'} size={16} color={colors.accent} style={{ marginRight: 6 }} />}
          <Text numberOfLines={1} style={[s.title, active && { color: colors.accent }]}>{track.title}</Text>
        </View>
        <Text numberOfLines={1} style={s.artist}>{saved ? '⬇ ' : ''}{track.source === 'soundcloud' ? '☁ ' : ''}{track.artist}</Text>
      </View>
      <Pressable hitSlop={10} style={s.btn} onPress={() => toggleLike(track)}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.accent : colors.muted} />
      </Pressable>
      <Pressable hitSlop={10} style={s.btn} onPress={openMenu}>
        <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={colors.muted} />
      </Pressable>
      {onRemove && (
        <Pressable hitSlop={10} style={s.btn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={22} color={colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
}
