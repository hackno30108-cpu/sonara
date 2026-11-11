import { ActionSheetIOS, Alert, Platform, Share } from 'react-native';

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

// Chia sẻ bài hát: gửi tên bài + nghệ sĩ và liên kết trang gốc (nếu có).
export async function shareTrack(track) {
  const text = `${track.title} – ${track.artist}`;
  try { await Share.share({ message: track.link ? `${text}\n${track.link}` : `${text} (nghe trên Sonara)` }); } catch (e) {}
}
