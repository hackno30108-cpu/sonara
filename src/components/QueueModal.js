import React, { useMemo } from 'react';
import { Modal, View, Text, Image, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';

export default function QueueModal({ visible, onClose }) {
  const { queue, index, jumpTo, removeFromQueue } = usePlayer();
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.line, paddingTop: 18, paddingBottom: 28, maxHeight: '70%' },
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
    h: { flex: 1, color: colors.text, fontSize: fs(20), fontWeight: '800' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 20 },
    art: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.surface },
    info: { flex: 1, marginHorizontal: 12 },
    title: { color: colors.text, fontSize: fs(16), fontWeight: '600' },
    artist: { color: colors.muted, fontSize: fs(13), marginTop: 2 },
    label: { color: colors.muted, fontSize: fs(13), fontWeight: '700', paddingHorizontal: 20, marginTop: 8, marginBottom: 2 },
    empty: { color: colors.muted, fontSize: fs(15), textAlign: 'center', padding: 24 },
  }), [colors, fs]);
  const items = queue.map((t, i) => ({ t, i })).slice(Math.max(index, 0));
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.head}>
            <Text style={s.h}>Hàng đợi</Text>
            <Pressable hitSlop={12} onPress={onClose}><Ionicons name="close" size={28} color={colors.muted} /></Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(x) => `${x.i}-${x.t.id}`}
            ListEmptyComponent={<Text style={s.empty}>Hàng đợi trống.</Text>}
            renderItem={({ item, index: n }) => {
              const now = item.i === index;
              return (
                <View>
                  {n === 0 && <Text style={s.label}>ĐANG PHÁT</Text>}
                  {n === 1 && <Text style={s.label}>TIẾP THEO</Text>}
                  <Pressable style={s.row} onPress={() => { if (!now) jumpTo(item.i); }}>
                    {item.t.artwork ? <Image source={{ uri: item.t.artwork }} style={s.art} /> : <View style={s.art} />}
                    <View style={s.info}>
                      <Text numberOfLines={1} style={[s.title, now && { color: colors.accent }]}>{item.t.title}</Text>
                      <Text numberOfLines={1} style={s.artist}>{item.t.artist}</Text>
                    </View>
                    {!now && (
                      <Pressable hitSlop={10} onPress={() => removeFromQueue(item.i)}>
                        <Ionicons name="remove-circle-outline" size={24} color={colors.muted} />
                      </Pressable>
                    )}
                  </Pressable>
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
