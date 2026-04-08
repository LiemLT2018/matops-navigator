import { itemService, productBomTemplateService } from '@/api/services';
import { getAuthUser } from '@/lib/authStorage';

// Suggest API — vật tư BOM dùng backend; các loại khác vẫn mock.

export interface SuggestData {
  type: string;
  uuid: string;
  name: string;
  normalizedName: string;
  alias: string[];
  rawText?: string;
  /** Gợi ý từ API BOM (material). */
  specification?: string;
  mdUomUuid?: string;
  unitName?: string;
  manufacturer?: string | null;
  itemAliasId?: string | null;
  source?: string;
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
    { type: 'material', uuid: 'mat-001', name: 'Nhôm TQ', normalizedName: 'nhom tq', alias: ['nhom trung quoc', 'aluminum china', 'al tq'] },
    { type: 'material', uuid: 'mat-002', name: 'Nhôm 6061', normalizedName: 'nhom 6061', alias: ['al 6061', 'aluminum 6061'] },
    { type: 'material', uuid: 'mat-003', name: 'Sắt tấm', normalizedName: 'sat tam', alias: ['thep tam', 'iron plate'] },
    { type: 'material', uuid: 'mat-004', name: 'Inox 304', normalizedName: 'inox 304', alias: ['thep khong gi 304', 'stainless 304', 'sus304'] },
    { type: 'material', uuid: 'mat-005', name: 'Bạc đạn SKF 6205', normalizedName: 'bac dan skf 6205', alias: ['vong bi skf 6205', 'bearing 6205'] },
    { type: 'material', uuid: 'mat-006', name: 'Thép hộp 40x80', normalizedName: 'thep hop 40x80', alias: ['steel box 40x80'] },
    { type: 'material', uuid: 'mat-007', name: 'Ống thép đen phi 60', normalizedName: 'ong thep den phi 60', alias: ['ong sat phi 60'] },
    { type: 'material', uuid: 'mat-008', name: 'Bu lông M12x50', normalizedName: 'bu long m12x50', alias: ['bolt m12'] },
    { type: 'material', uuid: 'mat-009', name: 'Đai ốc M12', normalizedName: 'dai oc m12', alias: ['nut m12'] },
    { type: 'material', uuid: 'mat-010', name: 'Que hàn 2.5mm', normalizedName: 'que han 2.5mm', alias: ['welding rod 2.5'] },
    { type: 'material', uuid: 'mat-011', name: 'PHÍP NGỌC', normalizedName: 'phip ngoc', alias: ['phip', 'ngoc'] },
    { type: 'material', uuid: 'mat-012', name: 'RICOCEL NHẬT', normalizedName: 'ricocel nhat', alias: ['ricocel jp', 'ricocel japan'] },
    { type: 'material', uuid: 'mat-013', name: 'BAKELIT ĐEN ESD', normalizedName: 'bakelit den esd', alias: ['bakelit esd', 'bakelite esd'] },
    { type: 'material', uuid: 'mat-014', name: 'FR4 ĐEN ESD', normalizedName: 'fr4 den esd', alias: ['fr4 esd', 'fr4 den'] },
    { type: 'material', uuid: 'mat-015', name: 'Nhôm HQ', normalizedName: 'nhom hq', alias: ['nhom han quoc', 'aluminum korea'] },
    { type: 'material', uuid: 'mat-016', name: 'RICOCEL TQ', normalizedName: 'ricocel tq', alias: ['ricocel trung quoc', 'ricocel china'] },
    { type: 'material', uuid: 'mat-017', name: 'BAKELIT ĐEN', normalizedName: 'bakelit den', alias: ['bakelite den', 'bakelite black'] },
    { type: 'material', uuid: 'mat-018', name: 'POM ĐEN', normalizedName: 'pom den', alias: ['pom black', 'polyacetal den'] },
    { type: 'material', uuid: 'mat-019', name: 'POM TRẮNG', normalizedName: 'pom trang', alias: ['pom white', 'polyacetal trang'] },
    { type: 'material', uuid: 'mat-020', name: 'MICA', normalizedName: 'mica', alias: ['mica tam', 'acrylic'] },
    { type: 'material', uuid: 'mat-021', name: 'URETHAN 90 ĐỘ (XANH)', normalizedName: 'urethan 90 do (xanh)', alias: ['urethan 90', 'urethan xanh'] },
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
    { type: 'specification', uuid: 'spec-011', name: '350x250x10mm', normalizedName: '350x250x10mm', alias: [] },
    { type: 'specification', uuid: 'spec-012', name: '406x305x6mm', normalizedName: '406x305x6mm', alias: [] },
    { type: 'specification', uuid: 'spec-013', name: '300x200x12mm', normalizedName: '300x200x12mm', alias: [] },
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
    { type: 'unit', uuid: 'unit-011', name: 'thùng', normalizedName: 'thung', alias: ['barrel', 'drum'] },
    { type: 'unit', uuid: 'unit-012', name: 'chai', normalizedName: 'chai', alias: ['bottle'] },
    { type: 'unit', uuid: 'unit-013', name: 'ống', normalizedName: 'ong', alias: ['tube', 'pipe'] },
    { type: 'unit', uuid: 'unit-014', name: 'tấn', normalizedName: 'tan', alias: ['ton'] },
    { type: 'unit', uuid: 'unit-015', name: 'gam', normalizedName: 'gam', alias: ['g', 'gram'] },
    { type: 'unit', uuid: 'unit-016', name: 'đôi', normalizedName: 'doi', alias: ['pair'] },
    { type: 'unit', uuid: 'unit-017', name: 'cặp', normalizedName: 'cap', alias: ['couple'] },
    { type: 'unit', uuid: 'unit-018', name: 'm²', normalizedName: 'm2', alias: ['mét vuông', 'sqm'] },
    { type: 'unit', uuid: 'unit-019', name: 'm³', normalizedName: 'm3', alias: ['mét khối', 'cbm'] },
    { type: 'unit', uuid: 'unit-020', name: 'lọ', normalizedName: 'lo', alias: ['jar', 'hũ'] },
  ],
  manufacturer: [
    { type: 'manufacturer', uuid: 'mfr-001', name: 'Hòa Phát', normalizedName: 'hoa phat', alias: ['hp'] },
    { type: 'manufacturer', uuid: 'mfr-002', name: 'SKF', normalizedName: 'skf', alias: ['skf bearing'] },
    { type: 'manufacturer', uuid: 'mfr-003', name: 'Posco', normalizedName: 'posco', alias: ['posco steel', 'posco vietnam'] },
    { type: 'manufacturer', uuid: 'mfr-004', name: 'Hyundai', normalizedName: 'hyundai', alias: ['hyundai steel'] },
    { type: 'manufacturer', uuid: 'mfr-005', name: 'China OEM', normalizedName: 'china oem', alias: ['trung quoc', 'chinese', 'tq'] },
    { type: 'manufacturer', uuid: 'mfr-006', name: 'Nippon Steel', normalizedName: 'nippon steel', alias: ['ns', 'nhat ban'] },
    { type: 'manufacturer', uuid: 'mfr-007', name: 'Pomina', normalizedName: 'pomina', alias: ['pomina steel'] },
    { type: 'manufacturer', uuid: 'mfr-008', name: 'Việt Đức', normalizedName: 'viet duc', alias: ['vd'] },
    { type: 'manufacturer', uuid: 'mfr-009', name: 'NSK', normalizedName: 'nsk', alias: ['nsk bearing'] },
    { type: 'manufacturer', uuid: 'mfr-010', name: 'FAG', normalizedName: 'fag', alias: ['fag bearing', 'schaeffler'] },
    { type: 'manufacturer', uuid: 'mfr-011', name: 'Xinghua', normalizedName: 'xinghua', alias: ['xing hua', 'xh'] },
    { type: 'manufacturer', uuid: 'mfr-012', name: 'HHC', normalizedName: 'hhc', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-013', name: 'EC', normalizedName: 'ec', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-014', name: 'MV', normalizedName: 'mv', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-015', name: 'Mitsubishi', normalizedName: 'mitsubishi', alias: ['mits'] },
    { type: 'manufacturer', uuid: 'mfr-016', name: 'Sumitomo', normalizedName: 'sumitomo', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-017', name: 'JFE Steel', normalizedName: 'jfe steel', alias: ['jfe'] },
    { type: 'manufacturer', uuid: 'mfr-018', name: 'ThyssenKrupp', normalizedName: 'thyssenkrupp', alias: ['tk'] },
    { type: 'manufacturer', uuid: 'mfr-019', name: 'ArcelorMittal', normalizedName: 'arcelormittal', alias: ['arcelor'] },
    { type: 'manufacturer', uuid: 'mfr-020', name: 'Tata Steel', normalizedName: 'tata steel', alias: ['tata'] },
    { type: 'manufacturer', uuid: 'mfr-021', name: 'Baosteel', normalizedName: 'baosteel', alias: ['bao steel'] },
    { type: 'manufacturer', uuid: 'mfr-022', name: 'SSAB', normalizedName: 'ssab', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-023', name: 'Kobelco', normalizedName: 'kobelco', alias: ['kobe steel'] },
    { type: 'manufacturer', uuid: 'mfr-024', name: 'Sandvik', normalizedName: 'sandvik', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-025', name: 'Timken', normalizedName: 'timken', alias: [] },
    { type: 'manufacturer', uuid: 'mfr-026', name: 'NTN', normalizedName: 'ntn', alias: ['ntn bearing'] },
    { type: 'manufacturer', uuid: 'mfr-027', name: 'INA', normalizedName: 'ina', alias: ['ina bearing'] },
    { type: 'manufacturer', uuid: 'mfr-028', name: 'Bosch Rexroth', normalizedName: 'bosch rexroth', alias: ['bosch', 'rexroth'] },
    { type: 'manufacturer', uuid: 'mfr-029', name: 'Parker', normalizedName: 'parker', alias: ['parker hannifin'] },
    { type: 'manufacturer', uuid: 'mfr-030', name: 'SMC', normalizedName: 'smc', alias: ['smc pneumatic'] },
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
 */
export async function suggestSearch(
  q: string,
  type: string,
  limit: number = 50
): Promise<SuggestResponse> {
  if (type === 'material') {
    try {
      const user = getAuthUser();
      const rows = await productBomTemplateService.materialSuggestions(q, limit, user?.mdCompanyUuid);
      const items: SuggestData[] = rows.map(r => ({
        type: 'material',
        uuid: r.materialVariantId,
        name: r.name,
        normalizedName: removeViDiacritics(r.name),
        alias: [],
        specification: r.specification ?? undefined,
        mdUomUuid: r.mdUomUuid,
        unitName: r.unitName ?? undefined,
        manufacturer: r.manufacturer,
        itemAliasId: r.itemAliasId,
        source: r.source,
      }));
      return { type, items, limit, hasMore: items.length >= limit };
    } catch {
      // fall through to mock
    }
  }

  if (type === 'bom') {
    try {
      const user = getAuthUser();
      const res = await productBomTemplateService.list({
        pageIndex: 1,
        pageSize: limit,
        isPaging: 1,
        typeFind: 1,
        keyword: q,
        mdCompanyUuid: user?.mdCompanyUuid,
      });
      const items: SuggestData[] = res.items.map(r => {
        const productName = r.mdItem?.name ?? r.name ?? '';
        const display = `${r.code} — ${productName}`.trim();
        return {
          type: 'bom',
          uuid: r.uuid, // template uuid
          name: display,
          rawText: r.code, // expose code for UI columns
          normalizedName: removeViDiacritics(display),
          alias: [r.code, productName].filter(Boolean),
        };
      });
      return { type, items, limit, hasMore: res.pagination.totalCount > items.length };
    } catch {
      // fall through to mock
    }
  }

  if (type === 'item') {
    try {
      const user = getAuthUser();
      const res = await itemService.list({
        pageIndex: 1,
        pageSize: limit,
        isPaging: 1,
        typeFind: 1,
        keyword: q,
        mdCompanyUuid: user?.mdCompanyUuid,
      });
      const items: SuggestData[] = res.items.map(r => {
        const display = `${r.code} — ${r.name}`.trim();
        return {
          type: 'item',
          uuid: r.uuid,
          name: display,
          rawText: r.code,
          normalizedName: removeViDiacritics(display),
          alias: [r.code, r.name].filter(Boolean),
        };
      });
      return { type, items, limit, hasMore: res.pagination.totalCount > items.length };
    } catch {
      // fall through to mock
    }
  }

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
