import React, { useMemo } from 'react';
import { FlatList, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import TrackItem from './TrackItem';

export default function TrackList({ tracks, queue, offset = 0, loading, error, emptyText, onRefresh, header, onRemove }) {
  const { playAt } = usePlayer();
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 32, lineHeight: fs(24), fontSize: fs(15) },
  }), [colors, fs]);
  if (loading && !tracks.length) return <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />;
  return (
    <FlatList
      data={tracks}
      keyExtractor={(t) => String(t.id)}
      ListHeaderComponent={header}
      renderItem={({ item, index }) => (
        <TrackItem
          track={item}
          onPress={() => playAt(queue || tracks, offset + index)}
          onRemove={onRemove ? () => onRemove(item) : undefined}
        />
      )}
      ListEmptyComponent={<Text style={s.empty}>{error || emptyText}</Text>}
      refreshing={!!loading}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
}
