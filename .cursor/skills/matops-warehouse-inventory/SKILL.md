---
name: matops-warehouse-inventory
description: >-
  Guides MatOps warehouse master data, inventory balances, goods receipts,
  stocktake adjustment, and cross-cutting UOM/specification concerns (unit
  conversion, viewing on-hand by dimension or alternate UOM). Use when the user
  mentions warehouse, kho, tồn kho, phiếu nhập, GoodsReceipt, InventoryBalance,
  WarehouseBin, kiểm kê, stocktake, UOM, quy đổi đơn vị, specification, quy
  cách, or edits under Warehouses, GoodsReceipts, Inventory, Warehouse.tsx,
  inventoryBalanceService, goodsReceiptService.
---

# MatOps — Quản lý kho (Core)

## Scope

- **Kho / vị trí:** `MdWarehouse`, `MdWarehouseBin`.
- **Tồn:** `TrxInventoryBalance` (có `MdUomUuid`; ledger `TrxInventoryTxn` khi cần truy sâu).
- **Nhập kho:** `TrxGoodsReceipt`, `TrxGoodsReceiptLine` (dòng có `MdUomUuid`).
- **Master UOM / quy cách:** `MdUom`, `MdSpecification`, `MdItemSpec`, `MdItem` — khi nghiệp vụ quy đổi hoặc xem tồn theo quy cách.

**Ngoài scope (Core):** `DeliveryOrder`, `MaterialIssue`, `MfgFinishedGoodsReceipt` — chỉ truy vết khi yêu cầu rõ xuất kho / thành phẩm, không trộn với luồng GR/tồn chính.

## Backend (erd_matops_api)

| Area | Location |
|------|----------|
| CQRS | `MatOps.Application/Warehouses/`, `WarehouseBins/`, `Inventory/`, `GoodsReceipts/` |
| UOM / spec / item (chéo) | `MatOps.Application/Uoms/`, `Specifications/`, `Items/` |
| DTOs | `MatOps.Application/DTOs/Warehouses/`, `WarehouseBins/`, `Inventory/`, `GoodsReceipts/` |
| API | `MatOps.Api/Controllers/WarehouseController.cs`, `WarehouseBinController.cs`, `InventoryBalanceController.cs` (stocktake: `api/InventoryBalance/stocktake-adjustment`), `GoodsReceiptController.cs` |
| EF configuration | `MatOps.Infrastructure/Persistence/Configurations/` — `MdWarehouse*`, `TrxInventoryBalance`, `TrxGoodsReceipt*` |
| Domain entities | `MatOps.Domain/Entities/MdWarehouse.cs`, `MdWarehouseBin.cs`, `TrxInventoryBalance.cs`, `TrxGoodsReceipt.cs`, `TrxGoodsReceiptLine.cs`, `MdUom.cs`, `MdSpecification.cs`, `MdItem.cs`, `MdItemSpec.cs` |

### Quy tắc khi sửa

1. Đọc entity Domain trước; đổi field → DTO + mapping + `FluentValidation` + `IEntityTypeConfiguration` + migration khi cần.
2. `Result<T>` / envelope chuẩn; chuỗi user-facing qua `IStringLocalizer` (không hardcode).
3. List/filter: collection trên request; `null` hoặc rỗng = không lọc.
4. Sau khi sửa post GR hoặc tồn: xác minh handler cập nhật `TrxInventoryBalance` và **UOM** đang lưu.

## UOM và specification

- Nghiệp vụ có thể khác đơn vị giữa nhập và xuất (ví dụ tấn vs tấm + kích thước); tồn phải **tính nhất quán**. Quy đổi cần **hệ số có nguồn** (master UOM, `MdItem` như `WeightPerUnit`/`DensityKgPerM3`, quy tắc nghiệp vụ) — không bịa số.
- Hiện tại `TrxInventoryBalance` và `TrxGoodsReceiptLine` có `MdUomUuid`; **không** thấy `MdSpecificationUuid` trên các entity này — kiểm tra lại entity/migration nếu product bổ sung.
- `MdSpecification` + `MdItemSpec` mô tả quy cách vật lý; liên kết **tồn ↔ spec** phải đọc code trước khi làm “tồn theo spec”.
- Phân biệt **projection hiển thị** (đổi cách xem trên UI/API read) vs **mở rộng khóa tồn** (ví dụ bucket theo `(item, uom, spec)`): cái sau cần domain + migration + handler post.

## Frontend (matops-navigator)

| Area | Location |
|------|----------|
| Trang kho | `src/pages/Warehouse.tsx` |
| HTTP services | `src/api/services.ts` — `warehouseService`, `warehouseBinService`, `goodsReceiptService`, `inventoryBalanceService` |
| Types | `src/types/models.ts` — `WarehouseDetail`, `GoodsReceiptHeader`, `InventoryBalanceItem`, … |
| Normalize tồn | `src/utils/inventoryBalanceRow.ts` |

### Quy tắc khi sửa

1. Contract / lỗi: `MatOps.Domain/Common/BaseModels.cs` (mirror `src/types/api.ts`).
2. HTTP qua `src/lib/apiClient.ts`.
3. i18n: `react-i18next`; không hardcode nhãn UI.

## Workflow nghiệp vụ (tóm tắt)

- CRUD kho và vị trí (bin).
- Danh sách / lọc tồn theo kho, loại kho (theo query hiện có).
- Tạo phiếu nhập → post: truy `PostGoodsReceipt` và chỗ cập nhật `TrxInventoryBalance`.
- Điều chỉnh kiểm kê: `InventoryBalanceController` stocktake endpoint.
- Thay đổi UOM/spec trên luồng tồn: quyết định đơn vị canonical hoặc mở rộng schema trước khi code.

## Checklist thay đổi end-to-end

```
- [ ] Domain + configuration + migration (nếu đổi schema)
- [ ] Command/Query + validator + mapping + DTO
- [ ] Controller route và kiểu response
- [ ] Navigator: services.ts + Warehouse.tsx + models.ts (+ i18n keys)
- [ ] errorDictionary nếu thêm ApiErrorCode mới
- [ ] Nếu đụng quy đổi/spec: MdItem / MdSpecification / MdItemSpec + nguồn hệ số; query tồn hoặc DTO hiển thị theo UOM/spec theo product
```

## Khi không chắc

- Controller → MediatR handler → command/query.
- So sánh `Items`, `GoodsReceipts` trong `MatOps.Application`.
- Với UOM/spec: đọc handler cập nhật tồn và `TrxInventoryBalance` / dòng GR.
