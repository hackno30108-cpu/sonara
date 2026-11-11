// Tải bài hát về máy để nghe offline. Chỉ lưu tên file; đường dẫn đầy đủ dựng lại mỗi lần
// vì thư mục ứng dụng trên iOS có thể đổi sau khi cài lại.
import { Platform } from 'react-native';

export const canDownload = Platform.OS !== 'web';
const fs = () => require('expo-file-system/legacy');
const dir = () => fs().documentDirectory + 'sonara/';

export const localUri = (file) => dir() + file;

export async function downloadTrack(id, url) {
  const FS = fs();
  await FS.makeDirectoryAsync(dir(), { intermediates: true }).catch(() => {});
  const file = `${id}.mp3`;
  const res = await FS.downloadAsync(url, dir() + file);
  if (res.status !== 200) {
    await FS.deleteAsync(dir() + file, { idempotent: true }).catch(() => {});
    throw new Error('http ' + res.status);
  }
  return file;
}

export const deleteFile = (file) => fs().deleteAsync(dir() + file, { idempotent: true }).catch(() => {});
export const deleteAll = () => fs().deleteAsync(dir(), { idempotent: true }).catch(() => {});

export async function existingFiles(files) {
  const FS = fs();
  const ok = new Set();
  for (const f of files) {
    try { if ((await FS.getInfoAsync(dir() + f)).exists) ok.add(f); } catch (e) {}
  }
  return ok;
}

export async function totalSize(files) {
  const FS = fs();
  let n = 0;
  for (const f of files) {
    try { const i = await FS.getInfoAsync(dir() + f); if (i.exists) n += i.size || 0; } catch (e) {}
  }
  return n;
}
