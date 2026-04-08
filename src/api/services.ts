/**
 * Real API service layer — calls backend via apiClient.
 * All list endpoints use the standard query pattern:
 *   keyword, status, typeFind, isPaging, pageIndex, pageSize
 * Response envelope: { errorCode, errorMessage, data: { data, items, pagination } }
 */

import { apiClient } from '@/lib/apiClient';
import {
  EdTypeFind,
  type ApiListData,
  type ListQuery,
  type CompanyDetail,
  type CompanyCreateBody,
  BusinessPartnerDetail, BusinessPartnerCreateBody,
  PlantDetail, PlantCreateBody,
  WarehouseDetail, WarehouseCreateBody, WarehouseListQuery,
  WarehouseBinDetail, WarehouseBinCreateBody, WarehouseBinListQuery,
  UomCatalog, UomDetail, UomDetailWithUsage, UomCreateBody, UomListQuery,
  ItemCategoryCatalog, ItemCategoryDetail, ItemCategoryCreateBody,
  ItemDetail, ItemCreateBody, ItemListQuery,
  ItemAliasDetail, ItemAliasCreateBody, ItemAliasListQuery,
  PurchaseRequestHeader, PurchaseRequestDetailData, PurchaseRequestCreateBody,
  CreateItemFromLineBody,
  GoodsReceiptHeader, GoodsReceiptCreateBody,
  InventoryBalanceItem, InventoryBalanceQuery,
  StocktakeAdjustmentBody, StocktakeAdjustmentResult,
  DocumentNumberRuleDetail, DocumentNumberRuleCreateBody, DocumentNumberRuleListQuery,
  ProductBomTemplateListRow, ProductBomTemplateLineListRow,
  ProductBomTemplateListQuery, ProductBomTemplateLineListQuery,
  ProductBomTemplateCreateBody,
  ProductBomTemplateLineMutateBody,
} from '@/types/models';

// ============================================================
// Helper: build query params, strip undefined
// ============================================================

function q(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

/** ASP.NET bind `List<short> Statuses` — lặp `statuses=0&statuses=1` */
function serializePageParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        sp.append(k, String(item));
      }
    } else {
      sp.append(k, String(v));
    }
  }
  return sp.toString();
}

// Default list query values
function listParams(query?: ListQuery, extra?: Record<string, unknown>) {
  const status = query?.status;
  return q({
    typeFind: query?.typeFind ?? 1,
    isPaging: query?.isPaging ?? 1,
    pageIndex: query?.pageIndex ?? 1,
    pageSize: query?.pageSize ?? 20,
    keyword: query?.keyword,
    ...(status !== undefined && status !== null ? { statuses: [status] } : {}),
    ...extra,
  });
}

// ============================================================
// Generic list/detail/create/update/delete
// ============================================================

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** Chuẩn hóa payload danh sách (camelCase hoặc PascalCase) — tránh `items` undefined → lỗi khi xem chi tiết BOM. */
function normalizeApiListData<T>(raw: unknown): ApiListData<T> {
  const p = asRecord(raw);
  const itemsRaw = p.items ?? p.Items;
  const items = Array.isArray(itemsRaw) ? (itemsRaw as T[]) : [];
  const pag = asRecord(p.pagination ?? p.Pagination);
  const totalCount = Number(pag.totalCount ?? pag.TotalCount ?? 0);
  const totalPage = Number(
    pag.totalPage ?? pag.TotalPage ?? pag.totalPages ?? pag.TotalPages ?? 1,
  );
  const meta = asRecord(p.data ?? p.Data);
  return {
    data: {
      typeFind: Number(meta.typeFind ?? meta.TypeFind ?? 0),
      isPaging: Number(meta.isPaging ?? meta.IsPaging ?? 0),
    },
    items,
    pagination: { totalCount, totalPage },
  };
}

async function getList<T>(url: string, query?: ListQuery, extra?: Record<string, unknown>): Promise<ApiListData<T>> {
  const res = await apiClient.get(url, {
    params: listParams(query, extra),
    paramsSerializer: { serialize: serializePageParams },
  });
  return normalizeApiListData<T>(res.data);
}

async function getDetail<T>(url: string): Promise<T> {
  const res = await apiClient.get(url);
  return res.data as T;
}

async function create<T>(url: string, body: unknown): Promise<T> {
  const res = await apiClient.post(url, body);
  return res.data as T;
}

async function update<T>(url: string, body: unknown): Promise<T> {
  const res = await apiClient.put(url, body);
  return res.data as T;
}

async function remove(url: string): Promise<{ deleted: boolean; uuid: string; status: number }> {
  const res = await apiClient.delete(url);
  return res.data as { deleted: boolean; uuid: string; status: number };
}

// ============================================================
// UOM — api/Uom
// ============================================================

export const uomService = {
  list: (query?: UomListQuery) =>
    getList<UomCatalog>(
      'api/Uom',
      query,
      query?.types?.length ? { types: query.types } : undefined,
    ),
  get: (uuid: string) => getDetail<UomDetailWithUsage>(`api/Uom/${uuid}`),
  create: (body: UomCreateBody) => create<UomDetail>('api/Uom', body),
  update: (uuid: string, body: UomCreateBody) => update<UomDetail>(`api/Uom/${uuid}`, body),
  delete: (uuid: string) => remove(`api/Uom/${uuid}`),
};

// ============================================================
// ItemCategory — api/ItemCategory
// ============================================================

export const itemCategoryService = {
  list: (query?: ListQuery) => getList<ItemCategoryCatalog>('api/ItemCategory', query),
  get: (uuid: string) => getDetail<ItemCategoryDetail>(`api/ItemCategory/${uuid}`),
  create: (body: ItemCategoryCreateBody) => create<ItemCategoryDetail>('api/ItemCategory', body),
  update: (uuid: string, body: ItemCategoryCreateBody) => update<ItemCategoryDetail>(`api/ItemCategory/${uuid}`, body),
  delete: (uuid: string) => remove(`api/ItemCategory/${uuid}`),
};

// ============================================================
// Item — api/Item
// ============================================================

export const itemService = {
  list: (query?: ItemListQuery) => getList<ItemDetail>('api/Item', query, { mdCompanyUuid: query?.mdCompanyUuid }),
  get: (uuid: string) => getDetail<ItemDetail>(`api/Item/${uuid}`),
  create: (body: ItemCreateBody) => create<ItemDetail>('api/Item', body),
  update: (uuid: string, body: ItemCreateBody) => update<ItemDetail>(`api/Item/${uuid}`, body),
  delete: (uuid: string) => remove(`api/Item/${uuid}`),
};

// ============================================================
// ItemAlias (bí danh vật tư) — api/ItemAlias
// ============================================================

export const itemAliasService = {
  list: (query?: ItemAliasListQuery) =>
    getList<ItemAliasDetail>('api/ItemAlias', query, {
      mdItemUuid: query?.mdItemUuid,
      ...(query?.types?.length ? { types: query.types } : {}),
    }),
  get: (uuid: string) => getDetail<ItemAliasDetail>(`api/ItemAlias/${uuid}`),
  create: (body: ItemAliasCreateBody) => create<ItemAliasDetail>('api/ItemAlias', body),
  update: (uuid: string, body: ItemAliasCreateBody) => update<ItemAliasDetail>(`api/ItemAlias/${uuid}`, body),
  delete: (uuid: string) => remove(`api/ItemAlias/${uuid}`),
};

// ============================================================
// PurchaseRequest — api/PurchaseRequest
// ============================================================

export const purchaseRequestService = {
  list: (query?: ListQuery) => getList<PurchaseRequestHeader>('api/PurchaseRequest', query),
  get: (uuid: string) => getDetail<PurchaseRequestDetailData>(`api/PurchaseRequest/${uuid}`),
  create: (body: PurchaseRequestCreateBody) => create<PurchaseRequestDetailData>('api/PurchaseRequest', body),
  update: (uuid: string, body: PurchaseRequestCreateBody) => update<PurchaseRequestDetailData>(`api/PurchaseRequest/${uuid}`, body),
  delete: (uuid: string) => remove(`api/PurchaseRequest/${uuid}`),
  submit: async (uuid: string) => {
    const res = await apiClient.post(`api/PurchaseRequest/${uuid}/submit`);
    return res.data;
  },
  createItemFromLine: async (lineUuid: string, body: CreateItemFromLineBody) => {
    const res = await apiClient.post(`api/PurchaseRequest/lines/${lineUuid}/create-item`, body);
    return res.data as ItemDetail;
  },
};

// ============================================================
// GoodsReceipt — api/GoodsReceipt
// ============================================================

export const goodsReceiptService = {
  list: (query?: ListQuery) => getList<GoodsReceiptHeader>('api/GoodsReceipt', query),
  get: (uuid: string) => getDetail<GoodsReceiptHeader & { lines: unknown[] }>(`api/GoodsReceipt/${uuid}`),
  create: (body: GoodsReceiptCreateBody) => create<GoodsReceiptHeader>('api/GoodsReceipt', body),
  post: async (uuid: string) => {
    const res = await apiClient.post(`api/GoodsReceipt/${uuid}/post`);
    return res.data;
  },
};

// ============================================================
// InventoryBalance — api/InventoryBalance
// ============================================================

export const inventoryBalanceService = {
  list: (query?: InventoryBalanceQuery) => getList<InventoryBalanceItem>(
    'api/InventoryBalance', query,
    { mdCompanyUuid: query?.mdCompanyUuid, mdWarehouseUuid: query?.mdWarehouseUuid, mdItemUuid: query?.mdItemUuid },
  ),
  stocktakeAdjustment: async (body: StocktakeAdjustmentBody) => {
    const res = await apiClient.post('api/InventoryBalance/stocktake-adjustment', body);
    return res.data as StocktakeAdjustmentResult;
  },
};

/** Cộng dồn availableQty trên mọi dòng tồn kho của một vật tư (nhiều kho/bin). */
export async function getTotalAvailableQtyForItem(mdItemUuid: string, mdCompanyUuid?: string): Promise<number> {
  const res = await inventoryBalanceService.list({
    mdItemUuid,
    mdCompanyUuid,
    pageIndex: 1,
    pageSize: 500,
    isPaging: 1,
    typeFind: EdTypeFind.LIST,
  });
  return res.items.reduce((sum, row) => sum + Number(row.availableQty ?? 0), 0);
}

// ============================================================
// ProductBomTemplate — api/ProductBomTemplate
// ============================================================

/** Khớp backend BomMaterialSuggestDto. */
export interface BomMaterialSuggestItem {
  source: string;
  materialVariantId: string;
  itemAliasId: string | null;
  code: string;
  name: string;
  specification: string | null;
  unitName: string | null;
  mdUomUuid: string;
  manufacturer: string | null;
}

/** Cây BOM con/cháu từ GET api/ProductBomTemplate/{uuid}/child-tree */
export interface ProductBomTemplateChildTreeNode {
  mdProductBomTemplateChildRefUuid: string;
  mdChildProductBomTemplateUuid: string;
  childCode: string;
  childName: string;
  qtyPer: number;
  unitName: string;
  remark?: string | null;
  cycleSkipped: boolean;
  children: ProductBomTemplateChildTreeNode[];
}

function normalizeChildTreeNode(raw: unknown): ProductBomTemplateChildTreeNode {
  const r = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const childrenRaw = r.children ?? r.Children;
  const children = Array.isArray(childrenRaw) ? childrenRaw.map(normalizeChildTreeNode) : [];
  return {
    mdProductBomTemplateChildRefUuid: String(r.mdProductBomTemplateChildRefUuid ?? r.MdProductBomTemplateChildRefUuid ?? ''),
    mdChildProductBomTemplateUuid: String(r.mdChildProductBomTemplateUuid ?? r.MdChildProductBomTemplateUuid ?? ''),
    childCode: String(r.childCode ?? r.ChildCode ?? ''),
    childName: String(r.childName ?? r.ChildName ?? ''),
    qtyPer: Number(r.qtyPer ?? r.QtyPer ?? 0),
    unitName: String(r.unitName ?? r.UnitName ?? ''),
    remark: (r.remark ?? r.Remark) as string | null | undefined,
    cycleSkipped: Boolean(r.cycleSkipped ?? r.CycleSkipped),
    children,
  };
}

export const productBomTemplateService = {
  list: (query?: ProductBomTemplateListQuery) =>
    getList<ProductBomTemplateListRow>('api/ProductBomTemplate', query, {
      mdCompanyUuid: query?.mdCompanyUuid,
      mdItemUuid: query?.mdItemUuid,
      versionNo: query?.versionNo,
      revisionNo: query?.revisionNo,
    }),
  get: (uuid: string) => getDetail<ProductBomTemplateListRow>(`api/ProductBomTemplate/${uuid}`),
  create: (body: ProductBomTemplateCreateBody) =>
    create<ProductBomTemplateListRow>('api/ProductBomTemplate', body),
  update: (uuid: string, body: ProductBomTemplateCreateBody) =>
    update<ProductBomTemplateListRow>(`api/ProductBomTemplate/${uuid}`, body),
  materialSuggestions: (q: string, limit = 50, mdCompanyUuid?: string) =>
    getDetail<BomMaterialSuggestItem[]>(
      `api/ProductBomTemplate/material-suggestions?q=${encodeURIComponent(q)}&limit=${limit}${mdCompanyUuid ? `&mdCompanyUuid=${encodeURIComponent(mdCompanyUuid)}` : ''}`,
    ),
  getChildTree: async (uuid: string): Promise<ProductBomTemplateChildTreeNode[]> => {
    const data = await getDetail<unknown>(`api/ProductBomTemplate/${uuid}/child-tree`);
    const arr = Array.isArray(data) ? data : [];
    return arr.map(normalizeChildTreeNode);
  },
};

// ============================================================
// ProductBomTemplateLine — api/ProductBomTemplateLine
// ============================================================

export const productBomTemplateLineService = {
  list: (query?: ProductBomTemplateLineListQuery) =>
    getList<ProductBomTemplateLineListRow>('api/ProductBomTemplateLine', query, {
      mdProductBomTemplateUuid: query?.mdProductBomTemplateUuid,
      mdItemUuid: query?.mdItemUuid,
    }),
  get: (uuid: string) => getDetail<ProductBomTemplateLineListRow>(`api/ProductBomTemplateLine/${uuid}`),
  create: (body: ProductBomTemplateLineMutateBody) =>
    create<ProductBomTemplateLineListRow>('api/ProductBomTemplateLine', body),
  update: (uuid: string, body: ProductBomTemplateLineMutateBody) =>
    update<ProductBomTemplateLineListRow>(`api/ProductBomTemplateLine/${uuid}`, body),
  delete: (uuid: string) => remove(`api/ProductBomTemplateLine/${uuid}`),
};

// ============================================================
// Company — api/Company
// ============================================================

export const companyService = {
  list: (query?: ListQuery) => getList<CompanyDetail>('api/Company', query),
  get: (uuid: string) => getDetail<CompanyDetail>(`api/Company/${uuid}`),
  create: (body: CompanyCreateBody) => create<CompanyDetail>('api/Company', body),
  update: (uuid: string, body: CompanyCreateBody) => update<CompanyDetail>(`api/Company/${uuid}`, body),
  delete: (uuid: string) => remove(`api/Company/${uuid}`),
};

// ============================================================
// BusinessPartner — api/BusinessPartner
// ============================================================

export const businessPartnerService = {
  list: (query?: ListQuery & { mdCompanyUuid?: string; type?: string }) =>
    getList<BusinessPartnerDetail>('api/BusinessPartner', query, { mdCompanyUuid: query?.mdCompanyUuid, type: query?.type }),
  get: (uuid: string) => getDetail<BusinessPartnerDetail>(`api/BusinessPartner/${uuid}`),
  create: (body: BusinessPartnerCreateBody) => create<BusinessPartnerDetail>('api/BusinessPartner', body),
  update: (uuid: string, body: BusinessPartnerCreateBody) => update<BusinessPartnerDetail>(`api/BusinessPartner/${uuid}`, body),
  delete: (uuid: string) => remove(`api/BusinessPartner/${uuid}`),
};

// ============================================================
// Plant — api/Plant
// ============================================================

export const plantService = {
  list: (query?: ListQuery & { mdCompanyUuid?: string }) =>
    getList<PlantDetail>('api/Plant', query, { mdCompanyUuid: query?.mdCompanyUuid }),
  get: (uuid: string) => getDetail<PlantDetail>(`api/Plant/${uuid}`),
  create: (body: PlantCreateBody) => create<PlantDetail>('api/Plant', body),
  update: (uuid: string, body: PlantCreateBody) => update<PlantDetail>(`api/Plant/${uuid}`, body),
  delete: (uuid: string) => remove(`api/Plant/${uuid}`),
};

// ============================================================
// Warehouse — api/Warehouse
// ============================================================

export const warehouseService = {
  list: (query?: WarehouseListQuery) =>
    getList<WarehouseDetail>('api/Warehouse', query, {
      mdCompanyUuid: query?.mdCompanyUuid,
      mdPlantUuid: query?.mdPlantUuid,
      type: query?.type,
    }),
  get: (uuid: string) => getDetail<WarehouseDetail>(`api/Warehouse/${uuid}`),
  create: (body: WarehouseCreateBody) => create<WarehouseDetail>('api/Warehouse', body),
  update: (uuid: string, body: WarehouseCreateBody) => update<WarehouseDetail>(`api/Warehouse/${uuid}`, body),
  delete: (uuid: string) => remove(`api/Warehouse/${uuid}`),
};

// ============================================================
// WarehouseBin — api/WarehouseBin
// ============================================================

export const warehouseBinService = {
  list: (query?: WarehouseBinListQuery) =>
    getList<WarehouseBinDetail>('api/WarehouseBin', query, { mdWarehouseUuid: query?.mdWarehouseUuid }),
  get: (uuid: string) => getDetail<WarehouseBinDetail>(`api/WarehouseBin/${uuid}`),
  create: (body: WarehouseBinCreateBody) => create<WarehouseBinDetail>('api/WarehouseBin', body),
  update: (uuid: string, body: WarehouseBinCreateBody) => update<WarehouseBinDetail>(`api/WarehouseBin/${uuid}`, body),
  delete: (uuid: string) => remove(`api/WarehouseBin/${uuid}`),
};

// ============================================================
// DocumentNumberRule — api/DocumentNumberRule
// ============================================================

export const documentNumberRuleService = {
  list: (query?: DocumentNumberRuleListQuery) =>
    getList<DocumentNumberRuleDetail>('api/DocumentNumberRule', query, {
      mdCompanyUuid: query?.mdCompanyUuid, code: query?.code,
    }),
  get: (uuid: string) => getDetail<DocumentNumberRuleDetail>(`api/DocumentNumberRule/${uuid}`),
  create: (body: DocumentNumberRuleCreateBody) => create<DocumentNumberRuleDetail>('api/DocumentNumberRule', body),
  update: (uuid: string, body: DocumentNumberRuleCreateBody) => update<DocumentNumberRuleDetail>(`api/DocumentNumberRule/${uuid}`, body),
  delete: (uuid: string) => remove(`api/DocumentNumberRule/${uuid}`),
};

// ============================================================
// Auth
// ============================================================
export const authService = {
  /** Fetch RSA public key for password encryption */
  getLoginPublicKey: async () => {
    const res = await apiClient.get('api/Auth/login-public-key');
    return res.data as {
      publicKeyPem: string;
      encryption: string;
      hash: string;
    };
  },

  /** Login with RSA-OAEP encrypted password */
  login: async (account: string, encryptedPassword: string) => {
    const res = await apiClient.post('api/Auth/login', {
      account,
      encryptedPassword,
    });
    return res.data as {
      accessToken: string;
      tokenType: string;
      expiresAtUtc: string;
      user: { uuid: string; account: string; name: string; mdCompanyUuid: string; mdDepartmentUuid: string | null };
      allowedCompanies?: { uuid: string; code: string; name: string; isDefault?: boolean }[];
    };
  },

  /** Companies the current user can switch to (requires tenant session cookie from login). */
  myCompanies: async () => {
    const res = await apiClient.get('api/Auth/my-companies');
    return res.data as { uuid: string; code: string; name: string; isDefault?: boolean }[];
  },

  /** Switch active tenant (server updates Redis session). */
  switchCompany: async (mdCompanyUuid: string) => {
    const res = await apiClient.post('api/Auth/switch-company', { mdCompanyUuid });
    return res.data as { mdCompanyUuid: string; code: string; name: string };
  },
};
