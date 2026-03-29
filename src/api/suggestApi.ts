// Mock Suggest API for SuggestInputText component

export interface SuggestData {
  type: string;
  uuid: string;
  name: string;
  normalizedName: string;
  alias: string[];
}

export interface SuggestResponse {
  type: string;
  items: SuggestData[];
  limit: number;
  hasMore: boolean;
}

const removeViDiacritics = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

// ── Mock data per type ──

const MOCK_DATA: Record<string, SuggestData[]> = {
  material: [
    { type: 'material', uuid: 'mat-001', name: 'Nhôm Trung Quốc', normalizedName: 'nhom trung quoc', alias: ['nhom tq', 'aluminum china'] },
    { type: 'material', uuid: 'mat-002', name: 'Nhôm 6061', normalizedName: 'nhom 6061', alias: ['al 6061', 'aluminum 6061'] },
    { type: 'material', uuid: 'mat-003', name: 'Sắt tấm', normalizedName: 'sat tam', alias: ['thep tam', 'iron plate'] },
    { type: 'material', uuid: 'mat-004', name: 'Inox 304', normalizedName: 'inox 304', alias: ['thep khong gi 304', 'stainless 304', 'sus304'] },
    { type: 'material', uuid: 'mat-005', name: 'Bạc đạn SKF 6205', normalizedName: 'bac dan skf 6205', alias: ['vong bi skf 6205', 'bearing 6205'] },
    { type: 'material', uuid: 'mat-006', name: 'Thép hộp 40x80', normalizedName: 'thep hop 40x80', alias: ['steel box 40x80'] },
    { type: 'material', uuid: 'mat-007', name: 'Ống thép đen phi 60', normalizedName: 'ong thep den phi 60', alias: ['ong sat phi 60'] },
    { type: 'material', uuid: 'mat-008', name: 'Bu lông M12x50', normalizedName: 'bu long m12x50', alias: ['bolt m12'] },
    { type: 'material', uuid: 'mat-009', name: 'Đai ốc M12', normalizedName: 'dai oc m12', alias: ['nut m12'] },
    { type: 'material', uuid: 'mat-010', name: 'Que hàn 2.5mm', normalizedName: 'que han 2.5mm', alias: ['welding rod 2.5'] },
  ],
  specification: [
    { type: 'specification', uuid: 'spec-001', name: '360x204x38', normalizedName: '360x204x38', alias: [] },
    { type: 'specification', uuid: 'spec-002', name: '500x300x7', normalizedName: '500x300x7', alias: [] },
    { type: 'specification', uuid: 'spec-003', name: 'dày 2mm', normalizedName: 'day 2mm', alias: ['2mm', 't2'] },
    { type: 'specification', uuid: 'spec-004', name: '40x80x1.2', normalizedName: '40x80x1.2', alias: [] },
    { type: 'specification', uuid: 'spec-005', name: 'model 6205', normalizedName: 'model 6205', alias: ['6205'] },
    { type: 'specification', uuid: 'spec-006', name: 'phi 60x3', normalizedName: 'phi 60x3', alias: ['d60x3'] },
    { type: 'specification', uuid: 'spec-007', name: '100x100x5', normalizedName: '100x100x5', alias: [] },
    { type: 'specification', uuid: 'spec-008', name: 'M12x50 8.8', normalizedName: 'm12x50 8.8', alias: [] },
    { type: 'specification', uuid: 'spec-009', name: '1220x2440x2', normalizedName: '1220x2440x2', alias: ['4x8 feet 2mm'] },
    { type: 'specification', uuid: 'spec-010', name: '2.5mm E6013', normalizedName: '2.5mm e6013', alias: ['e6013'] },
  ],
  unit: [
    { type: 'unit', uuid: 'unit-001', name: 'chiếc', normalizedName: 'chiec', alias: ['cái', 'pcs'] },
    { type: 'unit', uuid: 'unit-002', name: 'cái', normalizedName: 'cai', alias: ['chiếc', 'pcs'] },
    { type: 'unit', uuid: 'unit-003', name: 'tấm', normalizedName: 'tam', alias: ['sheet', 'miếng'] },
    { type: 'unit', uuid: 'unit-004', name: 'cây', normalizedName: 'cay', alias: ['thanh', 'bar'] },
    { type: 'unit', uuid: 'unit-005', name: 'kg', normalizedName: 'kg', alias: ['kilogram', 'ký'] },
    { type: 'unit', uuid: 'unit-006', name: 'bộ', normalizedName: 'bo', alias: ['set', 'combo'] },
    { type: 'unit', uuid: 'unit-007', name: 'mét', normalizedName: 'met', alias: ['m', 'meter'] },
    { type: 'unit', uuid: 'unit-008', name: 'hộp', normalizedName: 'hop', alias: ['box'] },
    { type: 'unit', uuid: 'unit-009', name: 'cuộn', normalizedName: 'cuon', alias: ['roll', 'coil'] },
    { type: 'unit', uuid: 'unit-010', name: 'lít', normalizedName: 'lit', alias: ['l', 'liter'] },
  ],
  manufacturer: [
    { type: 'manufacturer', uuid: 'mfr-001', name: 'Hòa Phát', normalizedName: 'hoa phat', alias: ['hoa phat group', 'hp'] },
    { type: 'manufacturer', uuid: 'mfr-002', name: 'SKF', normalizedName: 'skf', alias: ['skf bearing', 'skf group'] },
    { type: 'manufacturer', uuid: 'mfr-003', name: 'Posco', normalizedName: 'posco', alias: ['posco steel', 'posco vietnam'] },
    { type: 'manufacturer', uuid: 'mfr-004', name: 'Hyundai', normalizedName: 'hyundai', alias: ['hyundai steel', 'hyundai welding'] },
    { type: 'manufacturer', uuid: 'mfr-005', name: 'China OEM', normalizedName: 'china oem', alias: ['trung quoc', 'chinese', 'tq'] },
    { type: 'manufacturer', uuid: 'mfr-006', name: 'Nippon Steel', normalizedName: 'nippon steel', alias: ['ns', 'nhat ban'] },
    { type: 'manufacturer', uuid: 'mfr-007', name: 'Pomina', normalizedName: 'pomina', alias: ['pomina steel'] },
    { type: 'manufacturer', uuid: 'mfr-008', name: 'Việt Đức', normalizedName: 'viet duc', alias: ['vd'] },
    { type: 'manufacturer', uuid: 'mfr-009', name: 'NSK', normalizedName: 'nsk', alias: ['nsk bearing'] },
    { type: 'manufacturer', uuid: 'mfr-010', name: 'FAG', normalizedName: 'fag', alias: ['fag bearing', 'schaeffler'] },
  ],
  bom: [
    { type: 'bom', uuid: 'bom-001', name: 'Khung thép KT-500', normalizedName: 'khung thep kt-500', alias: ['kt500', 'khung thep'] },
    { type: 'bom', uuid: 'bom-002', name: 'Bệ máy BM-200', normalizedName: 'be may bm-200', alias: ['bm200', 'be may'] },
    { type: 'bom', uuid: 'bom-003', name: 'Trục khuỷu TK-100', normalizedName: 'truc khuyu tk-100', alias: ['tk100', 'truc khuyu'] },
    { type: 'bom', uuid: 'bom-004', name: 'Hộp số HS-300', normalizedName: 'hop so hs-300', alias: ['hs300', 'hop so'] },
    { type: 'bom', uuid: 'bom-005', name: 'Van điều khiển VD-100', normalizedName: 'van dieu khien vd-100', alias: ['vd100', 'van dk'] },
    { type: 'bom', uuid: 'bom-006', name: 'Bánh răng BR-45', normalizedName: 'banh rang br-45', alias: ['br45', 'banh rang'] },
    { type: 'bom', uuid: 'bom-007', name: 'Trục chính TC-200', normalizedName: 'truc chinh tc-200', alias: ['tc200', 'truc chinh'] },
    { type: 'bom', uuid: 'bom-008', name: 'Vỏ hộp số VH-300', normalizedName: 'vo hop so vh-300', alias: ['vh300', 'vo hop so'] },
  ],
};

/**
 * Mock suggest API: GET /api/suggest/search
 * Simulates network delay and returns filtered results.
 */
export async function suggestSearch(
  q: string,
  type: string,
  limit: number = 50
): Promise<SuggestResponse> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 80 + Math.random() * 120));

  const data = MOCK_DATA[type] || [];
  const norm = removeViDiacritics(q);

  const filtered = data.filter(item => {
    if (item.normalizedName.includes(norm)) return true;
    if (removeViDiacritics(item.name).includes(norm)) return true;
    return item.alias.some(a => removeViDiacritics(a).includes(norm));
  });

  const items = filtered.slice(0, limit);

  return {
    type,
    items,
    limit,
    hasMore: filtered.length > limit,
  };
}
