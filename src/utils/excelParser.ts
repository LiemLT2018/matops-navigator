// Excel Import Parser - Regex + Dictionary matching engine
import * as XLSX from 'xlsx';

// ── Types ──
export interface ParsedRow {
  _key: string;
  rowNum: number;
  rawText: string;
  materialUuid: string;
  materialName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitUuid: string;
  manufacturerUuid: string;
  manufacturer: string;
  status: 'parsed' | 'partial' | 'failed';
  focusField?: 'material' | 'specification' | 'unit' | 'manufacturer';
}

export interface ParseRule {
  field: string;
  pattern: string;
  priority: number;
  flags: string;
}

export interface DictItem {
  uuid: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  rawText?: string;
}

export interface ImportDictionary {
  materials: DictItem[];
  specifications: DictItem[];
  units: DictItem[];
  manufacturers: DictItem[];
}

// ── Normalize ──
export const removeViDiacritics = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const normalizeText = (text: string): string =>
  text.replace(/\s+/g, ' ').trim();

// ── Mock API: Regex rules ──
export async function getParseRules(type: 'bom_import' | 'purchase_request_import'): Promise<ParseRule[]> {
  await new Promise(r => setTimeout(r, 50));
  return [
    { field: 'specification', pattern: '\\d{2,4}\\s*[xX×]\\s*\\d{2,4}\\s*[xX×]\\s*\\d{1,4}\\s*(?:mm)?', priority: 1, flags: 'i' },
    { field: 'specification', pattern: '[ØøΦφ]\\s*\\d+(?:\\.\\d+)?\\s*(?:[xX×]\\s*\\d+(?:\\.\\d+)?)?\\s*(?:mm)?', priority: 2, flags: 'i' },
    { field: 'specification', pattern: '\\d+(?:\\.\\d+)?\\s*(?:mm|cm|m)\\s*[xX×]\\s*\\d+(?:\\.\\d+)?\\s*(?:mm|cm|m)?', priority: 3, flags: 'i' },
    { field: 'quantity_unit', pattern: '(\\d+(?:[.,]\\d+)?)\\s*(cái|chiếc|tấm|cây|thanh|kg|kilogram|bộ|mét|hộp|cuộn|lít|chai|thùng|tấn|gam|ống|pcs|set|miếng|đôi|cặp|m2|m3|cuon|tam|cai|chiec|cay|bo|met|hop|lit|ong|thung|tan|gam)', priority: 4, flags: 'i' },
    { field: 'quantity_unit', pattern: '(\\d+(?:[.,]\\d+)?)\\s+([a-zA-ZÀ-ỹ]+)', priority: 5, flags: 'i' },
  ];
}

// ── Mock API: Dictionary data ──
export async function getImportDictionary(): Promise<ImportDictionary> {
  await new Promise(r => setTimeout(r, 50));
  return {
    materials: [
      { uuid: 'mat-011', name: 'PHÍP NGỌC', normalizedName: 'phip ngoc', aliases: ['phip ngac', 'phim ngoc'] },
      { uuid: 'mat-012', name: 'RICOCEL NHẬT', normalizedName: 'ricocel nhat', aliases: ['ricocel jp', 'ricocel japan', 'ricocel nhat ban'] },
      { uuid: 'mat-013', name: 'BAKELIT ĐEN ESD', normalizedName: 'bakelit den esd', aliases: ['bakelit esd', 'bakelite esd', 'bakelit den esd'] },
      { uuid: 'mat-014', name: 'FR4 ĐEN ESD', normalizedName: 'fr4 den esd', aliases: ['fr4 esd', 'fr4 den'] },
      { uuid: 'mat-015', name: 'Nhôm HQ', normalizedName: 'nhom hq', aliases: ['nhom han quoc', 'aluminum korea', 'al hq'] },
      { uuid: 'mat-016', name: 'RICOCEL TQ', normalizedName: 'ricocel tq', aliases: ['ricocel trung quoc', 'ricocel china'] },
      { uuid: 'mat-017', name: 'BAKELIT ĐEN', normalizedName: 'bakelit den', aliases: ['bakelite den', 'bakelite black'] },
      { uuid: 'mat-018', name: 'POM ĐEN', normalizedName: 'pom den', aliases: ['pom black', 'polyacetal den'] },
      { uuid: 'mat-019', name: 'POM TRẮNG', normalizedName: 'pom trang', aliases: ['pom white', 'polyacetal trang'] },
      { uuid: 'mat-001', name: 'Nhôm TQ', normalizedName: 'nhom tq', aliases: ['nhom trung quoc', 'aluminum china', 'al tq', 'nhom trung quốc'] },
      { uuid: 'mat-020', name: 'MICA', normalizedName: 'mica', aliases: ['mica tam', 'acrylic'] },
      { uuid: 'mat-021', name: 'URETHAN 90 ĐỘ (XANH)', normalizedName: 'urethan 90 do (xanh)', aliases: ['urethan 90', 'urethan xanh', 'urethane 90'] },
      { uuid: 'mat-002', name: 'Nhôm 6061', normalizedName: 'nhom 6061', aliases: ['al 6061', 'aluminum 6061'] },
      { uuid: 'mat-003', name: 'Sắt tấm', normalizedName: 'sat tam', aliases: ['thep tam', 'iron plate'] },
      { uuid: 'mat-004', name: 'Inox 304', normalizedName: 'inox 304', aliases: ['thep khong gi 304', 'stainless 304', 'sus304'] },
      { uuid: 'mat-005', name: 'Bạc đạn SKF 6205', normalizedName: 'bac dan skf 6205', aliases: ['vong bi skf 6205', 'bearing 6205'] },
      { uuid: 'mat-006', name: 'Thép hộp 40x80', normalizedName: 'thep hop 40x80', aliases: ['steel box 40x80'] },
      { uuid: 'mat-007', name: 'Ống thép đen phi 60', normalizedName: 'ong thep den phi 60', aliases: ['ong sat phi 60'] },
      { uuid: 'mat-008', name: 'Bu lông M12x50', normalizedName: 'bu long m12x50', aliases: ['bolt m12'] },
      { uuid: 'mat-009', name: 'Đai ốc M12', normalizedName: 'dai oc m12', aliases: ['nut m12'] },
      { uuid: 'mat-010', name: 'Que hàn 2.5mm', normalizedName: 'que han 2.5mm', aliases: ['welding rod 2.5'] },
    ],
    specifications: [
      '406x305x6mm','240x190x5mm','336x436x6mm','336x344x6mm','336x347x6mm','336x386x6mm',
      '610x237x10mm','176x172x10mm','525x326x8mm','400x346x10mm','400x353x10mm','525x366x8mm',
      '525x386x8mm','320x110x4mm','525x406x8mm','336x424x6mm','336x295x6mm','1010x130x20mm',
      '422x245x20mm','300x200x12mm','50x25x25mm','70x45x25mm','280x200x10mm','75x40x40mm',
      '63x55x55mm','300x300x10mm','170x143x10mm','106x60x30mm','270x270x12mm','75x65x30mm',
      '250x130x12mm','233x203x30mm','410x280x6mm','400x170x16mm','270x235x12mm','48x45x40mm',
      '100x36x55mm','116x60x35mm','276x196x5mm','306x227x8mm','372x284x10mm','740x360x10mm',
      '740x261x10mm','731x280x10mm','736x356x10mm','375x28x10mm','200x200x10mm','328x267x10mm',
      '354x215x25mm','340x200x25mm','354x305x25mm','250x140x10mm','376x256x5mm','486x366x5mm',
      '456x306x5mm','476x356x5mm','466x336x5mm','491x406x5mm','456x256x5mm','376x406x5mm',
      '336x306x5mm','446x326x5mm','316x296x5mm','466x406x5mm','360x336x5mm','390x346x5mm',
      '356x346x5mm','506x406x5mm','347x330x10mm','336x256x6mm','366x256x6mm','366x128x10mm',
      '306x205x5mm','356x280x10mm','356x132x20mm','366x512x10mm','336x390x6mm','210x190x10mm',
      '208x208x5mm','208x208x15mm','250x275x6mm','275x100x10mm','313x168x15mm','300x200x25mm',
      '253x187x15mm','350x250x10mm',
    ].map((s, i) => ({ uuid: `spec-${String(i + 100).padStart(3, '0')}`, name: s, normalizedName: s.toLowerCase(), aliases: [] as string[] })),
    units: [
      { uuid: 'unit-001', name: 'chiếc', normalizedName: 'chiec', aliases: ['cái', 'pcs', 'cai', 'chiec'] },
      { uuid: 'unit-002', name: 'cái', normalizedName: 'cai', aliases: ['chiếc', 'pcs', 'chiec'] },
      { uuid: 'unit-003', name: 'tấm', normalizedName: 'tam', aliases: ['sheet', 'miếng', 'mieng'] },
      { uuid: 'unit-004', name: 'cây', normalizedName: 'cay', aliases: ['thanh', 'bar'] },
      { uuid: 'unit-005', name: 'kg', normalizedName: 'kg', aliases: ['kilogram', 'ký', 'ky'] },
      { uuid: 'unit-006', name: 'bộ', normalizedName: 'bo', aliases: ['set', 'combo'] },
      { uuid: 'unit-007', name: 'mét', normalizedName: 'met', aliases: ['m', 'meter'] },
      { uuid: 'unit-008', name: 'hộp', normalizedName: 'hop', aliases: ['box'] },
      { uuid: 'unit-009', name: 'cuộn', normalizedName: 'cuon', aliases: ['roll', 'coil'] },
      { uuid: 'unit-010', name: 'lít', normalizedName: 'lit', aliases: ['l', 'liter'] },
      { uuid: 'unit-011', name: 'thùng', normalizedName: 'thung', aliases: ['barrel', 'drum'] },
      { uuid: 'unit-012', name: 'chai', normalizedName: 'chai', aliases: ['bottle'] },
      { uuid: 'unit-013', name: 'ống', normalizedName: 'ong', aliases: ['tube', 'pipe'] },
      { uuid: 'unit-014', name: 'tấn', normalizedName: 'tan', aliases: ['ton'] },
      { uuid: 'unit-015', name: 'gam', normalizedName: 'gam', aliases: ['g', 'gram'] },
      { uuid: 'unit-016', name: 'đôi', normalizedName: 'doi', aliases: ['pair'] },
      { uuid: 'unit-017', name: 'cặp', normalizedName: 'cap', aliases: ['pair', 'couple'] },
      { uuid: 'unit-018', name: 'm²', normalizedName: 'm2', aliases: ['mét vuông', 'sqm'] },
      { uuid: 'unit-019', name: 'm³', normalizedName: 'm3', aliases: ['mét khối', 'cbm'] },
      { uuid: 'unit-020', name: 'lọ', normalizedName: 'lo', aliases: ['jar', 'hũ', 'hu'] },
    ],
    manufacturers: [
      { uuid: 'mfr-001', name: 'Hòa Phát', normalizedName: 'hoa phat', aliases: ['hp'] },
      { uuid: 'mfr-002', name: 'SKF', normalizedName: 'skf', aliases: ['skf bearing'] },
      { uuid: 'mfr-003', name: 'Posco', normalizedName: 'posco', aliases: ['posco steel', 'posco vietnam'] },
      { uuid: 'mfr-004', name: 'Hyundai', normalizedName: 'hyundai', aliases: ['hyundai steel'] },
      { uuid: 'mfr-005', name: 'China OEM', normalizedName: 'china oem', aliases: ['trung quoc', 'chinese', 'tq'] },
      { uuid: 'mfr-006', name: 'Nippon Steel', normalizedName: 'nippon steel', aliases: ['ns', 'nhat ban'] },
      { uuid: 'mfr-007', name: 'Pomina', normalizedName: 'pomina', aliases: ['pomina steel'] },
      { uuid: 'mfr-008', name: 'Việt Đức', normalizedName: 'viet duc', aliases: ['vd'] },
      { uuid: 'mfr-009', name: 'NSK', normalizedName: 'nsk', aliases: ['nsk bearing'] },
      { uuid: 'mfr-010', name: 'FAG', normalizedName: 'fag', aliases: ['fag bearing', 'schaeffler'] },
      { uuid: 'mfr-011', name: 'Xinghua', normalizedName: 'xinghua', aliases: ['xing hua', 'xh'] },
      { uuid: 'mfr-012', name: 'HHC', normalizedName: 'hhc', aliases: [] },
      { uuid: 'mfr-013', name: 'EC', normalizedName: 'ec', aliases: [] },
      { uuid: 'mfr-014', name: 'MV', normalizedName: 'mv', aliases: [] },
      { uuid: 'mfr-015', name: 'Mitsubishi', normalizedName: 'mitsubishi', aliases: ['mits'] },
      { uuid: 'mfr-016', name: 'Sumitomo', normalizedName: 'sumitomo', aliases: [] },
      { uuid: 'mfr-017', name: 'JFE Steel', normalizedName: 'jfe steel', aliases: ['jfe'] },
      { uuid: 'mfr-018', name: 'ThyssenKrupp', normalizedName: 'thyssenkrupp', aliases: ['tk'] },
      { uuid: 'mfr-019', name: 'ArcelorMittal', normalizedName: 'arcelormittal', aliases: ['arcelor'] },
      { uuid: 'mfr-020', name: 'Tata Steel', normalizedName: 'tata steel', aliases: ['tata'] },
      { uuid: 'mfr-021', name: 'Baosteel', normalizedName: 'baosteel', aliases: ['bao steel'] },
      { uuid: 'mfr-022', name: 'SSAB', normalizedName: 'ssab', aliases: [] },
      { uuid: 'mfr-023', name: 'Kobelco', normalizedName: 'kobelco', aliases: ['kobe steel'] },
      { uuid: 'mfr-024', name: 'Sandvik', normalizedName: 'sandvik', aliases: [] },
      { uuid: 'mfr-025', name: 'Timken', normalizedName: 'timken', aliases: [] },
      { uuid: 'mfr-026', name: 'NTN', normalizedName: 'ntn', aliases: ['ntn bearing'] },
      { uuid: 'mfr-027', name: 'INA', normalizedName: 'ina', aliases: ['ina bearing'] },
      { uuid: 'mfr-028', name: 'Bosch Rexroth', normalizedName: 'bosch rexroth', aliases: ['bosch', 'rexroth'] },
      { uuid: 'mfr-029', name: 'Parker', normalizedName: 'parker', aliases: ['parker hannifin'] },
      { uuid: 'mfr-030', name: 'SMC', normalizedName: 'smc', aliases: ['smc pneumatic'] },
    ],
  };
}

// ── Mock API: Generate material code ──
export async function genMaterialCodeApi(): Promise<string> {
  await new Promise(r => setTimeout(r, 30));
  return `MAT-${String(Date.now()).slice(-6)}`;
}

// ── Mock API: Add new items ──
export async function addMaterialApi(item: { uuid: string; name: string; normalizedName: string; aliases: string[] }): Promise<DictItem> {
  await new Promise(r => setTimeout(r, 50));
  return { ...item, rawText: '' };
}

export async function addSpecificationApi(materialUuid: string, specification: string): Promise<DictItem> {
  await new Promise(r => setTimeout(r, 50));
  return { uuid: `spec-new-${Date.now()}`, name: specification, normalizedName: specification.toLowerCase(), aliases: [] };
}

export async function addUnitApi(name: string): Promise<DictItem> {
  await new Promise(r => setTimeout(r, 50));
  const normalized = removeViDiacritics(name).replace(/\s+/g, ' ').trim();
  return { uuid: `unit-new-${Date.now()}`, name, normalizedName: normalized, aliases: [] };
}

export async function addManufacturerApi(code: string, name: string): Promise<DictItem> {
  await new Promise(r => setTimeout(r, 50));
  return { uuid: `mfr-new-${Date.now()}`, name, normalizedName: removeViDiacritics(name), aliases: [code] };
}

// ── Read Excel file ──
export function readExcelFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        const rows: string[] = [];
        for (const row of jsonData) {
          if (!row || row.length === 0) continue;
          // Join all cells in a row into one text line
          const text = row.map(cell => String(cell ?? '').trim()).filter(Boolean).join(' ');
          if (text.trim()) rows.push(text.trim());
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── String similarity (simple Dice coefficient) ──
function bigrams(s: string): Set<string> {
  const bg = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2));
  return bg;
}

export function similarity(a: string, b: string): number {
  const na = removeViDiacritics(a);
  const nb = removeViDiacritics(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na.includes(nb) || nb.includes(na) ? 0.5 : 0;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let inter = 0;
  ba.forEach(bg => { if (bb.has(bg)) inter++; });
  return (2 * inter) / (ba.size + bb.size);
}

// ── Match dictionary (EXACT only: normalizedName or alias must be fully contained as whole word) ──
function matchDictExact(text: string, items: DictItem[]): { item: DictItem; score: number } | null {
  const norm = removeViDiacritics(text).replace(/\s+/g, ' ').trim();

  for (const item of items) {
    // Exact full match
    if (norm === item.normalizedName) return { item, score: 1 };
    // Check aliases exact full match
    for (const alias of item.aliases) {
      const aliasNorm = removeViDiacritics(alias).replace(/\s+/g, ' ').trim();
      if (norm === aliasNorm) return { item, score: 1 };
    }
  }

  // Check if normalizedName or alias appears as a whole segment in text
  for (const item of items) {
    if (item.normalizedName.length < 2) continue;
    // normalizedName must match as whole word/segment
    const nameRe = new RegExp(`(^|\\s)${escapeRegex(item.normalizedName)}($|\\s)`, 'i');
    if (nameRe.test(norm)) return { item, score: 1 };
    for (const alias of item.aliases) {
      const aliasNorm = removeViDiacritics(alias).replace(/\s+/g, ' ').trim();
      if (aliasNorm.length < 2) continue;
      const aliasRe = new RegExp(`(^|\\s)${escapeRegex(aliasNorm)}($|\\s)`, 'i');
      if (aliasRe.test(norm)) return { item, score: 1 };
    }
  }

  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Get top suggestions for a field ──
export function getSuggestionsWithScore(text: string, items: DictItem[], limit = 10): { item: DictItem; score: number }[] {
  if (!text.trim()) return items.slice(0, limit).map(item => ({ item, score: 0 }));
  const norm = removeViDiacritics(text);
  const scored = items.map(item => {
    let score = similarity(text, item.name);
    if (item.normalizedName === norm) score = 1;
    else if (item.normalizedName.includes(norm) || norm.includes(item.normalizedName)) score = Math.max(score, 0.7);
    for (const alias of item.aliases) {
      const aliasNorm = removeViDiacritics(alias);
      if (aliasNorm === norm) { score = 1; break; }
      if (aliasNorm.includes(norm) || norm.includes(aliasNorm)) score = Math.max(score, 0.6);
    }
    return { item, score };
  }).filter(s => s.score > 0.1).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function getSuggestions(text: string, items: DictItem[], limit = 10): DictItem[] {
  return getSuggestionsWithScore(text, items, limit).map(s => s.item);
}

// ── Parse a single text row ──
export function parseRow(
  text: string,
  rules: ParseRule[],
  dict: ImportDictionary,
  rowNum: number,
): ParsedRow {
  const row: ParsedRow = {
    _key: crypto.randomUUID(),
    rowNum,
    rawText: text,
    materialUuid: '',
    materialName: '',
    specification: '',
    quantity: 0,
    unit: '',
    unitUuid: '',
    manufacturerUuid: '',
    manufacturer: '',
    status: 'failed',
  };

  let remaining = normalizeText(text);

  // 1. Match specification by regex
  const specRules = rules.filter(r => r.field === 'specification').sort((a, b) => a.priority - b.priority);
  for (const rule of specRules) {
    const re = new RegExp(rule.pattern, rule.flags);
    const m = remaining.match(re);
    if (m) {
      let specText = m[0].trim();
      // Normalize: remove trailing mm if already part of dimensions
      if (!/mm$/i.test(specText)) specText += 'mm';
      // Try to match against known specs
      const specMatch = matchDictExact(specText, dict.specifications);
      row.specification = specMatch ? specMatch.item.name : specText;
      remaining = remaining.replace(m[0], ' ').trim();
      break;
    }
  }

  // 2. Match quantity + unit by regex
  const qtyRules = rules.filter(r => r.field === 'quantity_unit');
  for (const rule of qtyRules) {
    const re = new RegExp(rule.pattern, rule.flags);
    const m = remaining.match(re);
    if (m) {
      const qtyStr = m[1].replace(',', '.');
      row.quantity = parseFloat(qtyStr) || 0;
      const unitText = m[2].trim();
      const unitMatch = matchDictExact(unitText, dict.units);
      if (unitMatch) {
        row.unit = unitMatch.item.name;
        row.unitUuid = unitMatch.item.uuid;
      } else {
        row.unit = unitText;
      }
      remaining = remaining.replace(m[0], ' ').trim();
      break;
    }
  }

  // 3. Match remaining text against materials and manufacturers
  remaining = normalizeText(remaining);
  if (remaining) {
    // Try material match
    const matMatch = matchDictExact(remaining, dict.materials);
    if (matMatch) {
      row.materialName = matMatch.item.name;
      row.materialUuid = matMatch.item.uuid;
      // Remove matched part from remaining
      const matNorm = removeViDiacritics(matMatch.item.name);
      const remNorm = removeViDiacritics(remaining);
      const idx = remNorm.indexOf(matNorm);
      if (idx >= 0) {
        remaining = (remaining.slice(0, idx) + ' ' + remaining.slice(idx + matMatch.item.name.length)).trim();
      } else {
        // Try aliases
        for (const alias of matMatch.item.aliases) {
          const aliasNorm = removeViDiacritics(alias);
          const aIdx = remNorm.indexOf(aliasNorm);
          if (aIdx >= 0) {
            remaining = (remaining.slice(0, aIdx) + ' ' + remaining.slice(aIdx + alias.length)).trim();
            break;
          }
        }
      }
    } else {
      // No exact match — still populate materialName with remaining text (Partial)
      row.materialName = remaining;
    }

    // Try manufacturer match on remaining
    remaining = normalizeText(remaining);
    if (remaining) {
      const mfrMatch = matchDictExact(remaining, dict.manufacturers);
      if (mfrMatch) {
        row.manufacturer = mfrMatch.item.name;
        row.manufacturerUuid = mfrMatch.item.uuid;
      } else if (!row.materialUuid) {
        // If material wasn't matched either, remaining could be manufacturer hint
        // Don't overwrite if materialName already has the remaining text
      } else {
        // Material was matched, leftover is likely manufacturer
        row.manufacturer = remaining;
      }
    }
  }

  // Determine status
  const hasMaterial = !!row.materialUuid;
  const hasSpec = !!row.specification;
  const hasQty = row.quantity > 0;
  const hasUnit = !!row.unit;

  if (hasMaterial && hasSpec && hasQty && hasUnit) {
    row.status = 'parsed';
  } else if (hasMaterial || hasSpec || hasQty || hasUnit) {
    row.status = 'partial';
  } else {
    row.status = 'failed';
  }

  return row;
}

/** Một dòng mô tả vật tư dạng tự do — cùng engine regex + từ điển với import Excel BOM. */
export async function parseCompositeMaterialLine(text: string, rowNum = 1): Promise<ParsedRow> {
  const [rules, dictionary] = await Promise.all([
    getParseRules('bom_import'),
    getImportDictionary(),
  ]);
  return parseRow(text.trim(), rules, dictionary, rowNum);
}

// ── Parse all rows ──
export async function parseExcelRows(
  rows: string[],
  importType: 'bom_import' | 'purchase_request_import',
): Promise<{ parsedRows: ParsedRow[]; dictionary: ImportDictionary; rules: ParseRule[] }> {
  const [rules, dictionary] = await Promise.all([
    getParseRules(importType),
    getImportDictionary(),
  ]);

  const parsedRows = rows.map((text, i) => parseRow(text, rules, dictionary, i + 1));
  return { parsedRows, dictionary, rules };
}

// ── Generate template Excel ──
export function generateTemplateExcel(type: 'bom' | 'pr'): void {
  const wb = XLSX.utils.book_new();
  const header = type === 'bom'
    ? ['Mô tả vật tư (Material Description)']
    : ['Mô tả vật tư (Material Description)'];
  const data = [
    header,
    ['Nhôm TQ 350x250x10mm 10 tấm Xinghua'],
    ['BAKELIT ĐEN ESD 406x305x6mm 5 tấm HHC'],
    ['POM ĐEN 300x200x12mm 3 cái EC'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, type === 'bom' ? 'BOM_Import_Template.xlsx' : 'PR_Import_Template.xlsx');
}
