import React from 'react';
import { FlatList, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { usePlayer } from '../PlayerContext';
import TrackItem from './TrackItem';

export default function TrackList({ tracks, loading, error, emptyText, onRefresh, header }) {
  const { playAt } = usePlayer();
  if (loading && !tracks.length) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => String(t.id)}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => <TrackItem track={item} onPress={() => playAt(tracks, index)} />}
      ListEmptyComponent={<Text style={s.empty}>{error || emptyText}</Text>}
      refreshing={!!loading}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
const s = StyleSheet.create({ empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 32, lineHeight: 22 } });
