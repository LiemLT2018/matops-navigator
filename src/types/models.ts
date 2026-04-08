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
// BusinessPartner (Nhà cung cấp / Khách hàng)
// ============================================================

export interface BusinessPartnerCatalog {
  id: number; uuid: string; status: number;
  mdCompanyUuid: string;
  code: string; name: string;
  taxCode: string | null;
  phone: string | null; email: string | null; address: string | null;
  contactPerson: string | null;
  paymentTerm: string | null;
  deliveryTerm: string | null;
}
export interface BusinessPartnerDetail extends BusinessPartnerCatalog {
  createdAt: string; updatedAt: string;
}

export interface BusinessPartnerCreateBody {
  mdCompanyUuid: string;
  code: string; name: string;
  taxCode?: string | null;
  phone?: string | null; email?: string | null; address?: string | null;
  contactPerson?: string | null;
  paymentTerm?: string | null;
  deliveryTerm?: string | null;
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

export interface UomListQuery extends ListQuery {
  /** Phạm vi ĐVT (0/1/2); gửi lặp `types=` theo backend. */
  types?: number[];
}

export interface UomCatalog {
  id: number;
  uuid: string;
  status: number;
  code: string;
  name: string;
  symbol?: string;
  /** 0 Dùng chung / 1 NVL / 2 SP (API trả số). */
  type: number;
  decimalPlaces: number;
  description?: string;
}

export interface UomUsageRow {
  uuid: string;
  code: string;
  name: string;
}

export interface UomDetail extends UomCatalog {
  createdAt: string;
  updatedAt: string;
}

export interface UomDetailWithUsage extends UomDetail {
  itemsUsingUom: UomUsageRow[];
  itemCategoriesUsingUom: UomUsageRow[];
}

export interface UomCreateBody {
  code: string;
  name: string;
  type?: number;
  decimalPlaces?: number;
  status?: number;
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

/** Khớp `MdItemAlias.Type` — COMMON_NAME, SUPPLIER_NAME, SEARCH_KEYWORD */
export enum EdItemAliasType {
  COMMON_NAME = 0,
  SUPPLIER_NAME = 1,
  SEARCH_KEYWORD = 2,
}

export interface ItemAliasDetail {
  id: number;
  uuid: string;
  mdItemUuid: string | null;
  name: string;
  normalizedText?: string | null;
  type: number;
  status?: number;
  description?: string | null;
  createdAt?: string;
}

export interface ItemAliasCreateBody {
  mdItemUuid?: string | null;
  name: string;
  type: number;
  status?: number;
  description?: string | null;
}

export interface ItemAliasListQuery extends ListQuery {
  mdItemUuid?: string;
  types?: number[];
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
// ProductBomTemplate (BOM sản phẩm — khớp DTO backend)
// ============================================================

export interface ProductBomTemplateListRow {
  uuid: string;
  code: string;
  name: string;
  versionNo: string;
  revisionNo: number;
  status: number;
  remark: string | null;
  mdItemUuid?: string;
  mdBusinessPartnerUuid?: string | null;
  mdItem: { code: string; name: string } | null;
  mdCompany: { code: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductBomTemplateLineListRow {
  uuid: string;
  mdProductBomTemplateUuid: string;
  mdItemUuid: string | null;
  mdItemAliasUuid?: string | null;
  mdUomUuid: string;
  lineNo: number;
  qtyPer: number;
  lossRate: number;
  code: string | null;
  remark: string | null;
  mdItem: { code: string; name: string } | null;
  mdItemAlias?: { uuid: string; name: string; status?: number } | null;
  mdUom: { code: string; name: string } | null;
}

/** POST api/ProductBomTemplate — dòng BOM (khớp CreateProductBomTemplateLineInput). */
export interface ProductBomTemplateCreateLineBody {
  /** UUID line (only used for update to upsert/delete) */
  uuid?: string | null;
  mdItemUuid?: string | null;
  mdItemAliasUuid?: string | null;
  name?: string | null;
  mdUomUuid: string;
  lineNo?: number;
  qtyPer: number;
  lossRate?: number;
  code?: string | null;
  remark?: string | null;
}

export interface ProductBomTemplateChildRefBody {
  mdChildProductBomTemplateUuid: string;
  qtyPer: number;
  unitName: string;
  remark?: string | null;
}

export interface ProductBomTemplateCreateBody {
  mdCompanyUuid: string;
  mdBusinessPartnerUuid?: string | null;
  mdItemUuid?: string | null;
  code?: string | null;
  name: string;
  versionNo: string;
  revisionNo?: number;
  status?: number;
  remark?: string | null;
  lines?: ProductBomTemplateCreateLineBody[];
  childRefs?: ProductBomTemplateChildRefBody[];
}

export interface ProductBomTemplateListQuery extends ListQuery {
  mdCompanyUuid?: string;
  mdItemUuid?: string;
  versionNo?: string;
  revisionNo?: number;
}

export interface ProductBomTemplateLineListQuery extends ListQuery {
  mdProductBomTemplateUuid?: string;
  mdItemUuid?: string;
}

/** POST/PUT api/ProductBomTemplateLine — khớp Create/UpdateProductBomTemplateLineCommand. */
export interface ProductBomTemplateLineMutateBody {
  mdProductBomTemplateUuid: string;
  mdItemUuid?: string | null;
  mdItemAliasUuid?: string | null;
  name?: string | null;
  mdUomUuid: string;
  lineNo: number;
  qtyPer: number;
  lossRate: number;
  code?: string | null;
  remark?: string | null;
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
