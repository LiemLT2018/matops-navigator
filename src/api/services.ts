/**
 * Real API service layer — calls backend via apiClient.
 * All list endpoints use the standard query pattern:
 *   keyword, status, typeFind, isPaging, pageIndex, pageSize
 * Response envelope: { errorCode, errorMessage, data: { data, items, pagination } }
 */

import { apiClient } from './apiClient';
import type { BaseResponse } from '@/types/api';
import type {
  ApiListData, ListQuery, EdTypeFind,
  CompanyDetail, CompanyCreateBody,
  BusinessPartnerDetail, BusinessPartnerCreateBody,
  PlantDetail, PlantCreateBody,
  WarehouseDetail, WarehouseCreateBody, WarehouseListQuery,
  WarehouseBinDetail, WarehouseBinCreateBody, WarehouseBinListQuery,
  UomCatalog, UomDetail, UomCreateBody,
  ItemCategoryCatalog, ItemCategoryDetail, ItemCategoryCreateBody,
  ItemDetail, ItemCreateBody, ItemListQuery,
  PurchaseRequestHeader, PurchaseRequestDetailData, PurchaseRequestCreateBody,
  CreateItemFromLineBody,
  GoodsReceiptHeader, GoodsReceiptCreateBody,
  InventoryBalanceItem, InventoryBalanceQuery,
  StocktakeAdjustmentBody, StocktakeAdjustmentResult,
  DocumentNumberRuleDetail, DocumentNumberRuleCreateBody, DocumentNumberRuleListQuery,
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

// Default list query values
function listParams(query?: ListQuery, extra?: Record<string, unknown>) {
  return q({
    typeFind: query?.typeFind ?? 1,
    isPaging: query?.isPaging ?? 1,
    pageIndex: query?.pageIndex ?? 1,
    pageSize: query?.pageSize ?? 20,
    keyword: query?.keyword,
    status: query?.status,
    ...extra,
  });
}

// ============================================================
// Generic list/detail/create/update/delete
// ============================================================

async function getList<T>(url: string, query?: ListQuery, extra?: Record<string, unknown>): Promise<ApiListData<T>> {
  const res = await apiClient.get(url, { params: listParams(query, extra) });
  return (res.data as BaseResponse<ApiListData<T>>).data;
}

async function getDetail<T>(url: string): Promise<T> {
  const res = await apiClient.get(url);
  return (res.data as BaseResponse<T>).data;
}

async function create<T>(url: string, body: unknown): Promise<T> {
  const res = await apiClient.post(url, body);
  return (res.data as BaseResponse<T>).data;
}

async function update<T>(url: string, body: unknown): Promise<T> {
  const res = await apiClient.put(url, body);
  return (res.data as BaseResponse<T>).data;
}

async function remove(url: string): Promise<{ deleted: boolean; uuid: string; status: number }> {
  const res = await apiClient.delete(url);
  return (res.data as BaseResponse<{ deleted: boolean; uuid: string; status: number }>).data;
}

// ============================================================
// UOM — api/Uom
// ============================================================

export const uomService = {
  list: (query?: ListQuery) => getList<UomCatalog>('api/Uom', query),
  get: (uuid: string) => getDetail<UomDetail>(`api/Uom/${uuid}`),
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
    return (res.data as BaseResponse).data;
  },
  createItemFromLine: async (lineUuid: string, body: CreateItemFromLineBody) => {
    const res = await apiClient.post(`api/PurchaseRequest/lines/${lineUuid}/create-item`, body);
    return (res.data as BaseResponse<ItemDetail>).data;
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
    return (res.data as BaseResponse).data;
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
    return (res.data as BaseResponse<StocktakeAdjustmentResult>).data;
  },
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
  list: (query?: ListQuery & { mdCompanyUuid?: string }) =>
    getList<BusinessPartnerDetail>('api/BusinessPartner', query, { mdCompanyUuid: query?.mdCompanyUuid }),
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
  login: async (account: string, encryptedPassword: string) => {
    const res = await apiClient.post<BaseResponse>('api/Auth/login', {
      account,
      password: encryptedPassword,
    });
    return res.data.data as {
      accessToken: string;
      tokenType: string;
      expiresAtUtc: string;
      user: { uuid: string; account: string; name: string; mdCompanyUuid: string; mdDepartmentUuid: string | null };
    };
  },
};
