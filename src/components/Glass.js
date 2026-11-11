import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme';

// Khối kính mờ kiểu Liquid Glass: làm mờ phần phía sau, viền sáng mảnh, góc bo tròn.
// Ở chế độ Tối/Sáng chỉ là một khối màu thường.
export default function Glass({ style, radius = 22, intensity = 55, children }) {
  const { liquid, colors } = useTheme();
  if (!liquid) {
    return <View style={[{ backgroundColor: colors.surface, borderRadius: radius, overflow: 'hidden' }, style]}>{children}</View>;
  }
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.22)' }, style]}>
      <BlurView tint="dark" intensity={intensity} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 12, right: 12, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      {children}
    </View>
  );
}
