import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { usePlayer } from '../PlayerContext';

export default function TrackItem({ track, onPress }) {
  const { current, isLiked, toggleLike } = usePlayer();
  const active = current?.id === track.id;
  return (
    <Pressable onPress={onPress} style={s.row}>
      {track.artwork ? <Image source={{ uri: track.artwork }} style={s.art} /> : <View style={[s.art, { backgroundColor: colors.surface }]} />}
      <View style={s.info}>
        <Text numberOfLines={1} style={[s.title, active && { color: colors.accent }]}>{track.title}</Text>
        <Text numberOfLines={1} style={s.artist}>{track.artist}</Text>
      </View>
      <Pressable hitSlop={12} onPress={() => toggleLike(track)}>
        <Ionicons name={isLiked(track.id) ? 'heart' : 'heart-outline'} size={22} color={isLiked(track.id) ? colors.accent : colors.muted} />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  art: { width: 54, height: 54, borderRadius: 6 },
  info: { flex: 1, marginHorizontal: 12 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600' },
  artist: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
