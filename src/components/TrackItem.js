import React, { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';

export default function TrackItem({ track, onPress, onRemove }) {
  const { current, isLiked, toggleLike, setPickTrack } = usePlayer();
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
    art: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.surface },
    info: { flex: 1, marginHorizontal: 12 },
    title: { color: colors.text, fontSize: fs(17), fontWeight: '600' },
    artist: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
    btn: { marginLeft: 14 },
  }), [colors, fs]);
  const active = current?.id === track.id;
  const liked = isLiked(track.id);
  return (
    <Pressable onPress={onPress} style={s.row}>
      {track.artwork ? <Image source={{ uri: track.artwork }} style={s.art} /> : <View style={s.art} />}
      <View style={s.info}>
        <Text numberOfLines={1} style={[s.title, active && { color: colors.accent }]}>{track.title}</Text>
        <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
      </View>
      <Pressable hitSlop={10} style={s.btn} onPress={() => toggleLike(track)}>
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={24} color={liked ? colors.accent : colors.muted} />
      </Pressable>
      <Pressable hitSlop={10} style={s.btn} onPress={() => setPickTrack(track)}>
        <Ionicons name="add-circle-outline" size={24} color={colors.muted} />
      </Pressable>
      {onRemove && (
        <Pressable hitSlop={10} style={s.btn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={22} color={colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
}
