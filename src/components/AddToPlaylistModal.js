import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';

export default function AddToPlaylistModal({ enabled = true }) {
  const { pickTrack, setPickTrack, playlists, addToPlaylist, createPlaylist } = usePlayer();
  const { colors, fs } = useTheme();
  const [name, setName] = useState('');
  const s = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
    h: { color: colors.text, fontSize: fs(20), fontWeight: '800' },
    sub: { color: colors.muted, fontSize: fs(14), marginTop: 2, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
    rowText: { flex: 1, color: colors.text, fontSize: fs(16), marginLeft: 12 },
    count: { color: colors.muted, fontSize: fs(14) },
    empty: { color: colors.muted, fontSize: fs(14), paddingVertical: 12 },
    newRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    input: { flex: 1, backgroundColor: colors.surface, color: colors.text, borderRadius: 10, padding: 12, fontSize: fs(16) },
    btn: { marginLeft: 10, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: fs(16) },
  }), [colors, fs]);
  if (!pickTrack || !enabled) return null;
  const close = () => { setPickTrack(null); setName(''); };
  const create = () => {
    if (!name.trim()) return;
    const id = createPlaylist(name.trim());
    addToPlaylist(id, pickTrack);
    close();
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={s.sheet}>
          <Text style={s.h}>Thêm vào playlist</Text>
          <Text numberOfLines={1} style={s.sub}>{pickTrack.title}</Text>
          <ScrollView style={{ maxHeight: 220 }}>
            {playlists.length === 0 && <Text style={s.empty}>Bạn chưa có playlist nào. Tạo playlist đầu tiên bên dưới.</Text>}
            {playlists.map((p) => (
              <Pressable key={p.id} style={s.row} onPress={() => { addToPlaylist(p.id, pickTrack); close(); }}>
                <Ionicons name="musical-notes" size={22} color={colors.accent} />
                <Text style={s.rowText}>{p.name}</Text>
                <Text style={s.count}>{p.tracks.length} bài</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.newRow}>
            <TextInput
              value={name} onChangeText={setName} placeholder="Tên playlist mới"
              placeholderTextColor={colors.muted} style={s.input} returnKeyType="done" onSubmitEditing={create}
            />
            <Pressable style={s.btn} onPress={create}><Text style={s.btnText}>Tạo</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
