import type { InventoryBalanceItem } from '@/types/models';

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v) !== '') return String(v);
  }
  return '';
}

function pickNum(o: Record<string, unknown>, camel: string, pascal: string, def = 0): number {
  const v = o[camel] ?? o[pascal];
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function pickGuid(o: Record<string, unknown>, camel: string, pascal: string): string {
  const v = o[camel] ?? o[pascal];
  return v != null ? String(v) : '';
}

function pickOptGuid(o: Record<string, unknown>, camel: string, pascal: string): string | null {
  const v = o[camel] ?? o[pascal];
  if (v === null || v === undefined) return null;
  const s = String(v);
  return s === '' ? null : s;
}

function pickOptDate(o: Record<string, unknown>, camel: string, pascal: string): string | null {
  const v = o[camel] ?? o[pascal];
  if (v === null || v === undefined) return null;
  return String(v);
}

/**
 * Chuẩn hóa một dòng tồn kho từ API: camelCase / PascalCase và (nếu có) navigation lồng MdItemUu, MdWarehouseUu…
 */
export function normalizeInventoryBalanceItem(raw: unknown): InventoryBalanceItem {
  const r = asRecord(raw);
  const item = asRecord(r.mdItemUu ?? r.MdItemUu);
  const wh = asRecord(r.mdWarehouseUu ?? r.MdWarehouseUu);
  const uom = asRecord(r.mdUomUu ?? r.MdUomUu);
  const bin = asRecord(r.mdWarehouseBinUu ?? r.MdWarehouseBinUu);

  const itemCode = pickStr(r, 'itemCode', 'ItemCode') || pickStr(item, 'code', 'Code');
  const itemName = pickStr(r, 'itemName', 'ItemName') || pickStr(item, 'name', 'Name');
  const warehouseCode = pickStr(r, 'warehouseCode', 'WarehouseCode') || pickStr(wh, 'code', 'Code');
  const warehouseName = pickStr(r, 'warehouseName', 'WarehouseName') || pickStr(wh, 'name', 'Name');
  const uomCode = pickStr(r, 'uomCode', 'UomCode') || pickStr(uom, 'code', 'Code');

  const binFromRow = pickStr(r, 'warehouseBinCode', 'WarehouseBinCode');
  const binFromNav = pickStr(bin, 'code', 'Code');
  const warehouseBinCode =
    binFromRow !== '' ? binFromRow : binFromNav !== '' ? binFromNav : null;

  return {
    uuid: pickGuid(r, 'uuid', 'Uuid'),
    mdCompanyUuid: pickGuid(r, 'mdCompanyUuid', 'MdCompanyUuid'),
    mdWarehouseUuid: pickGuid(r, 'mdWarehouseUuid', 'MdWarehouseUuid'),
    mdWarehouseBinUuid: pickOptGuid(r, 'mdWarehouseBinUuid', 'MdWarehouseBinUuid'),
    mdItemUuid: pickGuid(r, 'mdItemUuid', 'MdItemUuid'),
    mdUomUuid: pickGuid(r, 'mdUomUuid', 'MdUomUuid'),
    onhandQty: pickNum(r, 'onhandQty', 'OnhandQty'),
    reservedQty: pickNum(r, 'reservedQty', 'ReservedQty'),
    availableQty: pickNum(r, 'availableQty', 'AvailableQty'),
    avgCost: pickNum(r, 'avgCost', 'AvgCost'),
    lastTxnAt: pickOptDate(r, 'lastTxnAt', 'LastTxnAt'),
    itemCode,
    itemName,
    uomCode,
    warehouseCode,
    warehouseName,
    warehouseBinCode: warehouseBinCode === '' || warehouseBinCode === 'null' ? null : warehouseBinCode,
  };
}
