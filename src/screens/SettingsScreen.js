import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Share, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ACCENTS, SIZES } from '../theme';
import { usePlayer } from '../PlayerContext';
import { totalSize } from '../downloads';
import Segmented from '../components/Segmented';

const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

export default function SettingsScreen() {
  const { colors, fs, mode, setMode, accent, setAccent, size, setSize, fade, setFade, scId, setScId } = useTheme();
  const { downloads, canDownload, clearDownloads, exportBackup, importBackup } = usePlayer();
  const [bytes, setBytes] = useState(0);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [idText, setIdText] = useState(scId);
  useEffect(() => { setIdText(scId); }, [scId]);
  const files = Object.values(downloads).map((x) => x.file);
  const count = files.length;

  useEffect(() => {
    if (!canDownload) return;
    let alive = true;
    totalSize(files).then((n) => { if (alive) setBytes(n); }).catch(() => {});
    return () => { alive = false; };
  }, [count]);

  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.page },
    h1: { color: colors.text, fontSize: fs(30), fontWeight: '800', padding: 16 },
    h2: { color: colors.text, fontSize: fs(18), fontWeight: '700', paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
    dots: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    dotWrap: { alignItems: 'center', width: 76, marginBottom: 14 },
    dot: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
    dotOn: { borderColor: colors.text },
    dotLabel: { color: colors.muted, fontSize: fs(13), marginTop: 6 },
    preview: { marginHorizontal: 16, marginTop: 10, padding: 16, borderRadius: 14, backgroundColor: colors.surface },
    pTitle: { color: colors.text, fontSize: fs(17), fontWeight: '600' },
    pSub: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
    note: { color: colors.muted, fontSize: fs(13), lineHeight: fs(20), paddingHorizontal: 16, marginTop: 4 },
    actions: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 6 },
    pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, marginRight: 10 },
    pillText: { color: '#fff', fontWeight: '700', fontSize: fs(15), marginLeft: 6 },
    ghost: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, marginRight: 10 },
    ghostText: { color: colors.text, fontSize: fs(15), marginLeft: 6 },
    input: { marginHorizontal: 16, marginTop: 12, padding: 12, minHeight: 110, borderRadius: 12, backgroundColor: colors.surface, color: colors.text, fontSize: fs(14), textAlignVertical: 'top' },
  }), [colors, fs]);

  const doExport = async () => {
    try { await Share.share({ message: exportBackup() }); } catch (e) {}
  };
  const doImport = () => {
    const r = importBackup(text);
    Alert.alert(r.ok ? 'Nhập thành công' : 'Không nhập được', r.message);
    if (r.ok) { setText(''); setImporting(false); }
  };
  const confirmClear = () => Alert.alert('Xóa tất cả bản tải về?', 'Các bài sẽ không nghe được khi không có mạng.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => { clearDownloads(); setBytes(0); } },
  ]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Cài đặt</Text>

        <Text style={s.h2}>Chế độ hiển thị</Text>
        <Segmented
          options={[{ key: 'liquid', label: 'Liquid Glass' }, { key: 'dark', label: 'Tối' }, { key: 'light', label: 'Sáng' }]}
          value={mode} onChange={setMode}
        />

        <Text style={s.h2}>Màu chủ đạo</Text>
        <View style={s.dots}>
          {ACCENTS.map((a) => (
            <Pressable key={a.name} style={s.dotWrap} onPress={() => setAccent(a.name)}>
              <View style={[s.dot, { backgroundColor: a.color }, accent === a.name && s.dotOn]}>
                {accent === a.name && <Ionicons name="checkmark" size={24} color="#fff" />}
              </View>
              <Text style={s.dotLabel}>{a.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.h2}>Cỡ chữ</Text>
        <Segmented options={SIZES.map((z) => ({ key: z.name, label: z.name }))} value={size} onChange={setSize} />
        <View style={s.preview}>
          <Text style={s.pTitle}>Bài hát xem thử</Text>
          <Text style={s.pSub}>Tên nghệ sĩ hiển thị theo cỡ chữ bạn chọn</Text>
        </View>

        <Text style={s.h2}>Âm thanh</Text>
        <Segmented
          options={[{ key: 'on', label: 'Chuyển bài mượt' }, { key: 'off', label: 'Tắt' }]}
          value={fade ? 'on' : 'off'} onChange={(k) => setFade(k === 'on')}
        />
        <Text style={s.note}>
          Âm lượng tăng nhẹ khi vào bài và nhỏ dần ở 2 giây cuối, nên bài nọ nối sang bài kia êm hơn, không giật. Khi đổi tốc độ phát, cao độ giọng được giữ nguyên.
        </Text>

        <Text style={s.h2}>Nguồn nhạc</Text>
        <Text style={s.note}>
          SoundCloud client_id (lấy ở soundcloud.com/you/apps nếu đăng ký được). Chỉ dán client_id, không dán client_secret. Bài SoundCloud không tải offline được và có liên kết về trang gốc.
        </Text>
        <TextInput
          value={idText} onChangeText={setIdText} onEndEditing={() => setScId(idText.trim())} onSubmitEditing={() => setScId(idText.trim())}
          autoCorrect={false} autoCapitalize="none" returnKeyType="done"
          placeholder="Dán SoundCloud client_id" placeholderTextColor={colors.muted} style={[s.input, { minHeight: 0 }]}
        />

        {canDownload && (
          <>
            <Text style={s.h2}>Bộ nhớ offline</Text>
            <Text style={s.note}>{count ? `${count} bài đã tải, chiếm ${mb(bytes)}.` : 'Chưa có bài nào được tải về.'}</Text>
            {count > 0 && (
              <View style={s.actions}>
                <Pressable style={s.ghost} onPress={confirmClear}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  <Text style={s.ghostText}>Xóa tất cả bản tải</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        <Text style={s.h2}>Sao lưu</Text>
        <Text style={s.note}>
          Sao lưu gồm bài đã thích và playlist. Bấm Xuất rồi lưu vào Ghi chú hoặc Tệp; khi cần, dán lại vào ô Nhập. Dữ liệu cũ được giữ nguyên, chỉ thêm phần còn thiếu.
        </Text>
        <View style={s.actions}>
          <Pressable style={s.pill} onPress={doExport}>
            <Ionicons name="share-outline" size={18} color="#fff" /><Text style={s.pillText}>Xuất</Text>
          </Pressable>
          <Pressable style={s.ghost} onPress={() => setImporting((v) => !v)}>
            <Ionicons name="download-outline" size={18} color={colors.text} /><Text style={s.ghostText}>Nhập</Text>
          </Pressable>
        </View>
        {importing && (
          <View>
            <TextInput
              value={text} onChangeText={setText} multiline autoCorrect={false} autoCapitalize="none"
              placeholder="Dán nội dung sao lưu vào đây" placeholderTextColor={colors.muted} style={s.input}
            />
            <View style={s.actions}>
              <Pressable style={[s.pill, !text.trim() && { opacity: 0.5 }]} disabled={!text.trim()} onPress={doImport}>
                <Text style={s.pillText}>Nhập dữ liệu</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
