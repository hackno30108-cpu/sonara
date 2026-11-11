import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ACCENTS, SIZES } from '../theme';
import Segmented from '../components/Segmented';

export default function SettingsScreen() {
  const { colors, fs, mode, setMode, accent, setAccent, size, setSize } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
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
  }), [colors, fs]);

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={s.h1}>Cài đặt</Text>

        <Text style={s.h2}>Chế độ hiển thị</Text>
        <Segmented
          options={[{ key: 'dark', label: 'Tối' }, { key: 'light', label: 'Sáng' }]}
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
      </ScrollView>
    </SafeAreaView>
  );
}
