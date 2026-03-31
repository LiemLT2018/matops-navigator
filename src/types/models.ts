// ============================================================
// Shared enums & constants
// ============================================================

export enum EdTypeFind {
  CATALOG = 0,
  LIST = 1,
  DETAIL_LIST = 2,
}

export enum EdItemCategoryType {
  RAW_MATERIAL = 0,
  SEMI_FINISHED = 1,
  FINISHED_GOOD = 2,
  CONSUMABLE = 3,
  SERVICE = 4,
}

export type WarehouseType = 'RAW_MATERIAL' | 'WIP' | 'FINISHED_GOOD' | 'SCRAP' | 'TRANSIT';
export type ResetPolicy = 'NONE' | 'YEARLY' | 'MONTHLY';
export type GoodsReceiptSourceType = 'ADJUSTMENT' | 'PURCHASE' | 'PRODUCTION' | 'RETURN';

// ============================================================
// API List response shape (inside BaseResponse.data)
// ============================================================

export interface ApiListData<T> {
  data: { typeFind: number; isPaging: number };
  items: T[];
  pagination: { totalCount: number; totalPage: number };
}

// ============================================================
// Query params shared by most list endpoints
// ============================================================

export interface ListQuery {
  keyword?: string;
  status?: number;
  typeFind?: EdTypeFind;
  isPaging?: number;
  pageIndex?: number;
  pageSize?: number;
}

// ============================================================
// Company
// ============================================================

export interface CompanyCatalog {
  id: number; uuid: string; status: number;
  code: string; name: string;
  shortName: string | null; taxCode: string | null;
  phone: string | null; email: string | null; address: string | null;
}
export type CompanyList = CompanyCatalog;
export interface CompanyDetail extends CompanyList {
  createdAt: string; updatedAt: string;
}

export interface CompanyCreateBody {
  code: string; name: string;
  shortName?: string | null; taxCode?: string | null;
  phone?: string | null; email?: string | null; address?: string | null;
  description?: string | null;
  type?: number;
  status?: number;
}

// ============================================================
// Plant
// ============================================================

export interface PlantCatalog {
  id: number; uuid: string; status: number;
  mdCompanyUuid: string;
  code: string; name: string;
  address: string | null; description: string | null;
}
export interface PlantList extends PlantCatalog {
  mdCompany: CompanyCatalog | null;
}
export interface PlantDetail extends PlantList {
  createdAt: string; updatedAt: string;
}

export interface PlantCreateBody {
  mdCompanyUuid: string; code: string; name: string;
  address?: string | null; description?: string | null; status?: number;
}

// ============================================================
// Warehouse
// ============================================================

export interface WarehouseCatalog {
  id: number; uuid: string; status: number;
  mdCompanyUuid: string; mdPlantUuid: string | null;
  code: string; name: string; type: WarehouseType;
}
export interface WarehouseRefDto { id: number; uuid: string; status: number; code: string; name: string; }
export interface WarehouseList extends WarehouseCatalog {
  mdCompany: CompanyCatalog | null;
  mdPlant: WarehouseRefDto | null;
}
export interface WarehouseDetail extends WarehouseList {
  createdAt: string; updatedAt: string;
}

export interface WarehouseCreateBody {
  mdCompanyUuid: string; mdPlantUuid?: string | null;
  code: string; name: string; type: WarehouseType; status?: number;
}

export interface WarehouseListQuery extends ListQuery {
  mdCompanyUuid?: string; mdPlantUuid?: string; type?: WarehouseType;
}

// ============================================================
// WarehouseBin
// ============================================================

export interface WarehouseBinCatalog {
  id: number; uuid: string; status: number;
  mdWarehouseUuid: string;
  code: string; name: string; isDefault: number;
}
export interface WarehouseBinList extends WarehouseBinCatalog {
  mdWarehouse: WarehouseRefDto | null;
}
export interface WarehouseBinDetail extends WarehouseBinList {
  createdAt: string; updatedAt: string;
}

export interface WarehouseBinCreateBody {
  mdWarehouseUuid: string; code: string; name: string;
  isDefault: number; status?: number;
}

export interface WarehouseBinListQuery extends ListQuery {
  mdWarehouseUuid?: string;
}

// ============================================================
// UOM (Unit of Measure)
// ============================================================

export interface UomCatalog {
  id: number; uuid: string; status: number;
  code: string; name: string;
}
export interface UomDetail extends UomCatalog {
  type?: number; decimalPlaces: number;
  createdAt: string; updatedAt: string;
}

export interface UomCreateBody {
  code: string; name: string;
  type?: number; decimalPlaces?: number; status?: number;
}

// ============================================================
// ItemCategory (Nhóm vật tư)
// ============================================================

export interface ItemCategoryCatalog {
  id: number; uuid: string; status: number;
  code: string; name: string;
  parentItemCategoryUuid?: string | null;
  type?: number;
}
export interface ItemCategoryDetail extends ItemCategoryCatalog {
  createdAt: string; updatedAt: string;
}

export interface ItemCategoryCreateBody {
  code: string; name: string;
  parentItemCategoryUuid?: string | null;
  type?: number; status?: number;
}

// ============================================================
// Item (Vật tư)
// ============================================================

export interface ItemCatalog {
  id: number; uuid: string; status: number;
  mdCompanyUuid: string;
  mdItemCategoryUuid: string | null;
  mdUomUuid: string | null;
  code: string; name: string;
  type: number;
}
export interface ItemDetail extends ItemCatalog {
  minStockQty: number; maxStockQty: number; reorderQty: number;
  isStockItem: boolean; isPurchaseItem: boolean;
  createdAt: string; updatedAt: string;
}

export interface ItemCreateBody {
  mdCompanyUuid: string;
  mdItemCategoryUuid?: string | null;
  mdUomUuid?: string | null;
  code: string; name: string;
  type?: number;
  minStockQty?: number; maxStockQty?: number; reorderQty?: number;
  isStockItem?: boolean; isPurchaseItem?: boolean;
  status?: number;
}

export interface ItemListQuery extends ListQuery {
  mdCompanyUuid?: string;
}

// ============================================================
// PurchaseRequest
// ============================================================

export interface PurchaseRequestHeader {
  uuid: string;
  mdCompanyUuid: string;
  mdDepartmentUuid: string | null;
  code: string;
  requestDate: string;
  neededDate: string | null;
  status: number;
  remark: string | null;
  createdAt: string;
}

export interface PurchaseRequestLine {
  uuid: string;
  mdItemUuid: string | null;
  mdUomUuid: string;
  lineNo: number;
  name: string;
  requestedQty: number;
  orderedQty: number;
  neededDate: string | null;
  status: number;
  remark: string | null;
}

export interface PurchaseRequestDetailData extends PurchaseRequestHeader {
  lines: PurchaseRequestLine[];
}

export interface PurchaseRequestCreateBody {
  mdCompanyUuid: string;
  mdDepartmentUuid?: string | null;
  requestDate: string;
  neededDate?: string | null;
  remark?: string | null;
  lines: PurchaseRequestLineBody[];
}

export interface PurchaseRequestLineBody {
  mdItemUuid?: string | null;
  name: string;
  mdUomUuid: string;
  requestedQty: number;
  neededDate?: string | null;
  remark?: string | null;
}

export interface CreateItemFromLineBody {
  mdItemCategoryUuid: string;
  code?: string | null;
  type?: EdItemCategoryType;
}

// ============================================================
// GoodsReceipt
// ============================================================

export interface GoodsReceiptHeader {
  uuid: string;
  mdCompanyUuid: string;
  mdWarehouseUuid: string;
  mdBusinessPartnerUuid: string | null;
  code: string;
  receiptDate: string;
  sourceType: GoodsReceiptSourceType;
  sourceRefNo: string | null;
  status: number;
  remark: string | null;
  createdAt: string;
}

export interface GoodsReceiptLine {
  mdItemUuid: string;
  mdUomUuid: string;
  mdWarehouseBinUuid: string | null;
  receivedQty: number;
  unitCost: number;
  batchNo: string | null;
  lotNo: string | null;
  remark: string | null;
}

export interface GoodsReceiptCreateBody {
  mdCompanyUuid: string;
  mdWarehouseUuid: string;
  mdBusinessPartnerUuid?: string | null;
  receiptDate: string;
  sourceType: GoodsReceiptSourceType;
  sourceRefNo?: string | null;
  remark?: string | null;
  lines: GoodsReceiptLine[];
}

// ============================================================
// InventoryBalance
// ============================================================

export interface InventoryBalanceItem {
  uuid: string;
  mdCompanyUuid: string;
  mdWarehouseUuid: string;
  mdWarehouseBinUuid: string | null;
  mdItemUuid: string;
  mdUomUuid: string;
  onhandQty: number;
  reservedQty: number;
  availableQty: number;
  avgCost: number;
  lastTxnAt: string | null;
}

export interface InventoryBalanceQuery extends ListQuery {
  mdCompanyUuid?: string;
  mdWarehouseUuid?: string;
  mdItemUuid?: string;
}

export interface StocktakeAdjustmentBody {
  mdCompanyUuid: string;
  mdWarehouseUuid: string;
  mdWarehouseBinUuid?: string | null;
  mdItemUuid: string;
  mdUomUuid: string;
  physicalQty: number;
}

export interface StocktakeAdjustmentResult {
  previousOnhandQty: number;
  physicalQty: number;
  differenceQty: number;
  inventoryBalanceUuid: string;
}

// ============================================================
// DocumentNumberRule
// ============================================================

export interface DocumentNumberRuleCatalog {
  id: number; uuid: string; status: number;
  mdCompanyUuid: string;
  code: string; prefix: string;
  dateFormat: string;
  currentNo: number;
  paddingLength: number;
  resetPolicy: ResetPolicy;
}
export interface DocumentNumberRuleList extends DocumentNumberRuleCatalog {
  mdCompany: CompanyCatalog | null;
}
export interface DocumentNumberRuleDetail extends DocumentNumberRuleList {
  createdAt: string; updatedAt: string;
}

export interface DocumentNumberRuleCreateBody {
  mdCompanyUuid: string;
  code: string; prefix: string; dateFormat: string;
  currentNo: number; paddingLength: number;
  resetPolicy: ResetPolicy; status?: number;
}

export interface DocumentNumberRuleListQuery extends ListQuery {
  mdCompanyUuid?: string; code?: string;
}
