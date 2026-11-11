import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { usePlayer } from '../PlayerContext';
import TrackList from '../components/TrackList';
import Segmented from '../components/Segmented';
import { computeStats, fmtDuration } from '../stats';

const SEGS = [
  { key: 'likes', label: 'Đã thích' },
  { key: 'playlists', label: 'Playlist' },
  { key: 'downloads', label: 'Đã tải' },
  { key: 'history', label: 'Lịch sử' },
  { key: 'reposts', label: 'Repost' },
  { key: 'stats', label: 'Thống kê' },
];
const DAY = 86400000;
const PERIODS = [{ key: 'week', label: '7 ngày', ms: 7 * DAY }, { key: 'month', label: '30 ngày', ms: 30 * DAY }, { key: 'all', label: 'Tất cả', ms: 0 }];

export default function LibraryScreen() {
  const { colors, fs } = useTheme();
  const { likes, playlists, history, downloads, createPlaylist, deletePlaylist, removeFromPlaylist, clearHistory, playAt, reposts, log, clearLog } = usePlayer();
  const [seg, setSeg] = useState('likes');
  const [openId, setOpenId] = useState(null);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState('week');
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.page },
    h1: { color: colors.text, fontSize: fs(30), fontWeight: '800', padding: 16, paddingBottom: 8 },
    topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    plName: { flex: 1, color: colors.text, fontSize: fs(22), fontWeight: '800', marginLeft: 6 },
    actions: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 6 },
    pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accent, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10 },
    pillText: { color: '#fff', fontWeight: '700', fontSize: fs(15), marginLeft: 6 },
    ghost: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
    ghostText: { color: colors.muted, fontSize: fs(15), marginLeft: 6 },
    newRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
    input: { flex: 1, backgroundColor: colors.surface, color: colors.text, borderRadius: 10, padding: 12, fontSize: fs(16) },
    btn: { marginLeft: 10, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: fs(16) },
    plRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
    plIcon: { width: 54, height: 54, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    plTitle: { color: colors.text, fontSize: fs(17), fontWeight: '600' },
    plCount: { color: colors.muted, fontSize: fs(14), marginTop: 2 },
    card: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, marginRight: 10 },
    cardNum: { color: colors.text, fontSize: fs(24), fontWeight: '800' },
    cardLbl: { color: colors.muted, fontSize: fs(13), marginTop: 2 },
    h2: { color: colors.text, fontSize: fs(18), fontWeight: '700', paddingHorizontal: 16, marginTop: 14, marginBottom: 6 },
    artistRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6 },
    rank: { color: colors.accent, fontWeight: '800', width: 26, fontSize: fs(16) },
    artistName: { flex: 1, color: colors.text, fontSize: fs(16) },
    artistCount: { color: colors.muted, fontSize: fs(14) },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 30, paddingHorizontal: 32, fontSize: fs(15), lineHeight: fs(24) },
  }), [colors, fs]);

  const create = () => { if (name.trim()) { createPlaylist(name.trim()); setName(''); } };
  const open = playlists.find((p) => p.id === openId);

  const confirmDelete = (p) => Alert.alert('Xóa playlist?', `Xóa "${p.name}" cùng danh sách bài trong đó.`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => { deletePlaylist(p.id); setOpenId(null); } },
  ]);

  let body;
  if (seg === 'likes') {
    body = <TrackList tracks={likes} emptyText="Chạm biểu tượng trái tim ở bất kỳ bài nào để lưu vào đây." />;
  } else if (seg === 'downloads') {
    const dl = Object.values(downloads).map((x) => x.track);
    body = (
      <TrackList
        tracks={dl} emptyText="Chưa có bài nào được tải. Chạm dấu ⋯ ở bài hát rồi chọn Tải về để nghe khi không có mạng."
      />
    );
  } else if (seg === 'history') {
    body = (
      <TrackList
        tracks={history} emptyText="Những bài bạn đã nghe sẽ hiện ở đây."
        header={history.length ? (
          <View style={s.actions}>
            <Pressable style={s.ghost} onPress={clearHistory}>
              <Ionicons name="trash-outline" size={18} color={colors.muted} />
              <Text style={s.ghostText}>Xóa lịch sử</Text>
            </Pressable>
          </View>
        ) : null}
      />
    );
  } else if (seg === 'reposts') {
    body = <TrackList tracks={reposts} emptyText="Chạm dấu ⋯ ở bài hát rồi chọn Repost để đăng lại vào đây. Repost chỉ lưu trong máy bạn, không công khai." />;
  } else if (seg === 'stats') {
    const p = PERIODS.find((x) => x.key === period) || PERIODS[0];
    const st = computeStats(log, p.ms ? Date.now() - p.ms : 0);
    const top = st.topTracks.map((x) => x.track);
    body = (
      <TrackList
        tracks={top} emptyText="Chưa có dữ liệu. Mỗi bài nghe được từ 20 giây sẽ được tính vào thống kê."
        header={(
          <View>
            <Segmented options={PERIODS.map((x) => ({ key: x.key, label: x.label }))} value={period} onChange={setPeriod} />
            <View style={[s.actions, { paddingTop: 4 }]}>
              <View style={s.card}><Text style={s.cardNum}>{st.plays}</Text><Text style={s.cardLbl}>lượt nghe</Text></View>
              <View style={s.card}><Text style={s.cardNum}>{fmtDuration(st.seconds)}</Text><Text style={s.cardLbl}>thời gian nghe (ước tính)</Text></View>
            </View>
            {st.topArtists.length > 0 && <Text style={s.h2}>Nghệ sĩ nghe nhiều nhất</Text>}
            {st.topArtists.slice(0, 5).map((a, i) => (
              <View key={a.name} style={s.artistRow}>
                <Text style={s.rank}>{i + 1}</Text>
                <Text numberOfLines={1} style={s.artistName}>{a.name}</Text>
                <Text style={s.artistCount}>{a.count} lượt</Text>
              </View>
            ))}
            {top.length > 0 && <Text style={s.h2}>Bài nghe nhiều nhất</Text>}
            {log.length > 0 && (
              <View style={s.actions}>
                <Pressable style={s.ghost} onPress={() => Alert.alert('Xóa thống kê?', 'Toàn bộ nhật ký nghe sẽ bị xóa.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: clearLog }])}>
                  <Ionicons name="trash-outline" size={18} color={colors.muted} /><Text style={s.ghostText}>Xóa thống kê</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    );
  } else if (open) {
    body = (
      <View style={{ flex: 1 }}>
        <View style={s.topRow}>
          <Pressable hitSlop={12} onPress={() => setOpenId(null)}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text numberOfLines={1} style={s.plName}>{open.name}</Text>
        </View>
        <View style={s.actions}>
          <Pressable style={s.pill} onPress={() => open.tracks.length && playAt(open.tracks, 0)}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={s.pillText}>Phát tất cả</Text>
          </Pressable>
          <Pressable style={s.ghost} onPress={() => confirmDelete(open)}>
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
            <Text style={s.ghostText}>Xóa playlist</Text>
          </Pressable>
        </View>
        <TrackList
          tracks={open.tracks} emptyText="Playlist còn trống. Chạm dấu + ở bất kỳ bài nào để thêm vào đây."
          onRemove={(t) => removeFromPlaylist(open.id, t.id)}
        />
      </View>
    );
  } else {
    body = (
      <View style={{ flex: 1 }}>
        <View style={s.newRow}>
          <TextInput
            value={name} onChangeText={setName} placeholder="Tên playlist mới" placeholderTextColor={colors.muted}
            style={s.input} returnKeyType="done" onSubmitEditing={create}
          />
          <Pressable style={s.btn} onPress={create}><Text style={s.btnText}>Tạo</Text></Pressable>
        </View>
        <FlatList
          data={playlists} keyExtractor={(p) => p.id}
          ListEmptyComponent={<Text style={s.empty}>Chưa có playlist nào. Đặt tên ở trên rồi bấm Tạo.</Text>}
          renderItem={({ item }) => (
            <Pressable style={s.plRow} onPress={() => setOpenId(item.id)}>
              <View style={s.plIcon}><Ionicons name="musical-notes" size={26} color={colors.accent} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={s.plTitle}>{item.name}</Text>
                <Text style={s.plCount}>{item.tracks.length} bài</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {!(seg === 'playlists' && open) && <Text style={s.h1}>Thư viện</Text>}
      {!(seg === 'playlists' && open) && <Segmented scroll options={SEGS} value={seg} onChange={(k) => { setSeg(k); setOpenId(null); }} />}
      {body}
    </SafeAreaView>
  );
}
