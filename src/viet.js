// Nhận diện nhạc Việt từ tên bài / nghệ sĩ / thể loại, để ưu tiên hoặc lọc nhạc Việt.
// Không gọi mạng, không phụ thuộc React Native nên dễ kiểm thử.

// Các chữ cái chỉ có trong tiếng Việt (không tính à á â ã è é ê ì í ò ó ô õ ù ú ý vì trùng với Pháp/Bồ Đào Nha).
const VN_ONLY = /[ăắằẳẵặấầẩẫậếềểễệỉĩịỏọốồổỗộơớờởỡợủũụưứừửữựỳỷỹỵđảẻẽẹ]/i;

export const deaccent = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const PHRASES = [
  'vinahouse', 'viet house', 'nonstop', 'vpop', 'v-pop', 'v pop', 'nhac viet', 'nhac tre', 'viet nam', 'vietnam',
  'vietnamese', 'rap viet', 'lofi viet', 'bolero', 'nhac vang', 'tru tinh', 'remix viet', 'dj viet', 'ballad viet',
  'cai luong', 'dan ca', 'quan ho', 'nhac xua', 'tien chien', 'nhac hoa', 'nhac thieu nhi', 'nhac xuan', 'nhac tet',
  'viet remix', 'viet mix', 'viet rap', 'viet lofi', 'vietnam music',
];
const ARTISTS = [
  'son tung', 'm-tp', 'mtp', 'den vau', 'hoang thuy linh', 'hieuthuhai', 'binz', 'chi pu', 'duc phuc', 'noo phuoc thinh',
  'my tam', 'tuan hung', 'soobin', 'karik', 'wren evans', 'ha anh tuan', 'bich phuong', 'grey d', 'tlinh', 'obito',
  'wxrdie', 'phuong ly', 'duongg', 'dlow', 'lou hoang', 'hoaprox', 'phan manh quynh', 'dam vinh hung', 'ho ngoc ha',
  'dong nhi', 'toc tien', 'van mai huong', 'thuy chi', 'quang le', 'che linh', 'khanh ly', 'duy manh', 'ngot band',
  'chillies', 'da lab', 'quoc thien', 'lam truong', 'trinh cong son', 'trong tan', 'thanh tung', 'nguyen van chung',
  'vu cat tuong', 'hoang ton', 'justatee', 'rhymastic', 'suboi', 'masew', 'mr siro', 'jack 5 cu',
  'cukak', 'orinn', 'hoang dung', 'anh tu', 'only c', 'lynk lee', 'khoi vu',
];
// Từ tiếng Việt không dấu hay gặp trong tên bài. Cần từ 2 từ trở lên mới tính.
const WORDS = new Set([
  'yeu', 'nguoi', 'thuong', 'buon', 'nho', 'tinh', 'troi', 'khong', 'cuoi', 'xuan', 'nhung', 'chua', 'cua', 'voi',
  'duoc', 'nang', 'em', 'anh', 'ngay', 'dem', 'mai', 'nguoi', 'oi', 'ay', 'khoc', 'thoi', 'gio', 'mua', 'tung',
  'minh', 'mot', 'het', 'xa', 'nay', 'dau',
]);

export function vietScore(t) {
  if (!t) return 0;
  const raw = String(t.title || '') + ' ' + String(t.artist || '') + ' ' + String(t.genre || '');
  const text = raw.normalize('NFC');
  let score = 0;
  if (VN_ONLY.test(text)) score += 3;
  const plain = ' ' + deaccent(text).replace(/[^a-z0-9\- ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  if (PHRASES.some((p) => plain.includes(' ' + p + ' ') || plain.includes(' ' + p))) score += 3;
  if (ARTISTS.some((a) => plain.includes(' ' + a + ' '))) score += 3;
  let hits = 0;
  for (const w of new Set(plain.trim().split(' '))) if (WORDS.has(w)) hits++;
  if (hits >= 2) score += 3;
  if (t.lang === 'vi') score += 3;
  return score;
}

export const isViet = (t) => vietScore(t) >= 3;

// mode: 'first' = nhạc Việt lên đầu (giữ nguyên thứ tự còn lại); 'only' = chỉ nhạc Việt; 'off' = giữ nguyên.
export function applyViet(list, mode) {
  if (!Array.isArray(list) || mode === 'off' || !mode) return list || [];
  const yes = [];
  const no = [];
  for (const t of list) (isViet(t) ? yes : no).push(t);
  return mode === 'only' ? yes : [...yes, ...no];
}

// Bỏ bài trùng (cùng nguồn id, hoặc cùng tên + nghệ sĩ giữa các nguồn khác nhau).
export function dedupe(list) {
  const ids = new Set();
  const keys = new Set();
  const out = [];
  for (const t of list) {
    if (!t || ids.has(t.id)) continue;
    const k = deaccent(t.title).replace(/[^a-z0-9]+/g, '') + '|' + deaccent(t.artist).replace(/[^a-z0-9]+/g, '');
    if (k.length > 3 && keys.has(k)) continue;
    ids.add(t.id);
    keys.add(k);
    out.push(t);
  }
  return out;
}

// Xen kẽ nhiều danh sách: lấy lần lượt từng bài của mỗi nguồn để kết quả đa dạng.
export function interleave(lists, max = 400) {
  const out = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && out.length < max; i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}
