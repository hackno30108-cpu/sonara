import { ActionSheetIOS, Alert, Platform } from 'react-native';

// Bảng chọn gốc của iOS. options: mảng chuỗi; onSelect(index).
export function showSheet(title, options, onSelect, destructiveIndex) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...options, 'Hủy'], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
      (i) => { if (i < options.length) onSelect(i); },
    );
  } else {
    Alert.alert(title, undefined, [
      ...options.map((o, i) => ({ text: o, onPress: () => onSelect(i) })),
      { text: 'Hủy', style: 'cancel' },
    ]);
  }
}
