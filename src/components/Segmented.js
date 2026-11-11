import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export default function Segmented({ options, value, onChange, scroll }) {
  const { colors, fs } = useTheme();
  const s = useMemo(() => StyleSheet.create({
    wrap: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: colors.line, marginHorizontal: 16, marginBottom: 8 },
    item: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    scrollItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
    text: { fontSize: fs(15), fontWeight: '600' },
  }), [colors, fs]);
  const items = options.map((o) => {
    const on = o.key === value;
    return (
      <Pressable key={o.key} onPress={() => onChange(o.key)} style={[scroll ? s.scrollItem : s.item, on && { backgroundColor: colors.accent }]}>
        <Text style={[s.text, { color: on ? '#fff' : colors.muted }]}>{o.label}</Text>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <View style={[s.wrap, { padding: 0, overflow: 'hidden' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 4 }}>{items}</ScrollView>
      </View>
    );
  }
  return <View style={s.wrap}>{items}</View>;
}
