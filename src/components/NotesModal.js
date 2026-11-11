import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';

const fmt = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

// Ghi chú / bình luận trên sóng nhạc: lưu riêng trong máy, chỉ mình bạn thấy.
export default function NotesModal({ visible, onClose }) {
  const { colors, fs } = useTheme();
  const { current, status, notes, addNote, deleteNote, seek } = usePlayer();
  const [text, setText] = useState('');
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    head: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    h1: { flex: 1, color: colors.text, fontSize: fs(22), fontWeight: '800' },
    sub: { color: colors.muted, fontSize: fs(14), paddingHorizontal: 16, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    time: { color: colors.accent, fontWeight: '700', fontSize: fs(15), width: 56 },
    note: { flex: 1, color: colors.text, fontSize: fs(16), lineHeight: fs(22) },
    inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
    input: { flex: 1, backgroundColor: colors.surface, color: colors.text, borderRadius: 12, padding: 12, fontSize: fs(16) },
    send: { marginLeft: 10, backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
    sendText: { color: '#fff', fontWeight: '700', fontSize: fs(15) },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 32, lineHeight: fs(24), fontSize: fs(15) },
  }), [colors, fs]);
  if (!current) return null;
  const list = notes[current.id] || [];
  const at = status.currentTime || 0;
  const add = () => { if (text.trim()) { addNote(current.id, at, text); setText(''); } };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>
        <View style={s.head}>
          <Text style={s.h1}>Ghi chú trên sóng nhạc</Text>
          <Pressable hitSlop={12} onPress={onClose}><Ionicons name="close" size={28} color={colors.text} /></Pressable>
        </View>
        <Text numberOfLines={1} style={s.sub}>{current.title} · chỉ mình bạn thấy, lưu trong máy</Text>
        <FlatList
          data={list} keyExtractor={(n) => n.id}
          ListEmptyComponent={<Text style={s.empty}>Chưa có ghi chú. Nghe tới đoạn bạn thích rồi viết ghi chú; chấm nhỏ sẽ hiện trên sóng nhạc ở vị trí đó.</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.row} onPress={() => { seek(item.t); onClose(); }}>
              <Text style={s.time}>{fmt(item.t)}</Text>
              <Text style={s.note}>{item.text}</Text>
              <Pressable hitSlop={10} onPress={() => deleteNote(current.id, item.id)}>
                <Ionicons name="trash-outline" size={20} color={colors.muted} />
              </Pressable>
            </Pressable>
          )}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput
              value={text} onChangeText={setText} placeholder={`Ghi chú tại ${fmt(at)}`} placeholderTextColor={colors.muted}
              style={s.input} returnKeyType="send" onSubmitEditing={add}
            />
            <Pressable style={s.send} onPress={add}><Text style={s.sendText}>Thêm</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
