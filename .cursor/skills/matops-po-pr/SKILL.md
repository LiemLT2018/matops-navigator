---
name: matops-po-pr
description: >-
  Guides implementation and debugging of MatOps Purchase Requests (PR) and
  Purchase Orders (PO): CQRS, DTOs, status flows, PR→PO line linkage,
  create-item-from-line, and aggregating PR lines from BOM (incl. child BOMs,
  merge by specification, duplicate merge). Use when the user mentions PR, PO,
  PurchaseRequest, PurchaseOrder, yêu cầu mua, đơn mua hàng, phiếu đề nghị mua,
  BOM vào PR, tổng hợp PR từ BOM, gộp quy cách, or edits under PurchaseRequests,
  PurchaseOrders, PurchaseRequests.tsx, PurchaseOrders.tsx.
---

# MatOps — PR & PO (Purchase Request / Purchase Order)

## Scope

- **PR:** `TrxPurchaseRequest`, `TrxPurchaseRequestLine` — nhu cầu mua nội bộ; có thể có dòng vật tư chưa có master (`ItemId` nullable / MMS).
- **PO:** `TrxPurchaseOrder`, `TrxPurchaseOrderLine` — đơn hàng với NCC (`MdBusinessPartner`); dòng PO có thể tham chiếu dòng PR qua `TrxPurchaseOrderLine.TrxPurchaseRequestLineUuid`.
- **Liên quan chéo:** nhập kho — `TrxGoodsReceiptLine.TrxPurchaseOrderLineUuid`; tổng hợp từ BOM mua — `TrxPurchaseBom` / `TrxPurchaseBomLine` ↔ `TrxPurchaseRequestLine` (`TrxPurchaseBomLineUuid` trên dòng PR khi truy vết nguồn).

## Nghiệp vụ: Đưa BOM vào PR (tổng hợp vật tư)

1. **Nguồn dữ liệu:** PR có thể lấy danh sách nhu cầu từ BOM (purchase BOM / BOM phục vụ mua hàng — domain `TrxPurchaseBom`, `TrxPurchaseBomLine`, liên kết `TrxProductBomLine` khi có).
2. **Phạm vi cây BOM:** Khi đổ vào PR, phải quét **toàn bộ** vật tư khai báo trên BOM, **kể cả vật tư nằm trong BOM con** (đệ quy theo cấu trúc cây; không bỏ sót cấp con).
3. **Gộp số lượng theo quy cách:** Hai nguồn dòng (ví dụ một dòng ở BOM cha, một ở BOM con) chỉ gộp thành **một dòng PR** khi coi là **cùng vật tư và cùng quy cách** (cùng “định danh” quy cách — thực thi bằng field quy cách trên model hiện tại, ví dụ specification / dimension gắn với dòng BOM hoặc vật tư). **Cộng dồn `RequestedQty`** (sau khi đã quy đổi về cùng đơn vị nếu nghiệp vụ yêu cầu).
   - *Ví dụ:* BOM cha 10 tấm thép 20×30×5 mm + BOM con 20 tấm cùng quy cách → PR **một dòng**, tổng **30** (cùng UOM trên dòng gộp).
4. **Khác quy cách = dòng riêng:** Cùng loại vật tư nhưng khác quy cách → **không** gộp; mỗi tổ hợp (vật tư + quy cách [+ UOM theo rule sản phẩm]) là một dòng PR riêng.
5. **Thêm dòng / nhập thêm từ BOM (chống trùng):** Mỗi lần thêm vật tư vào PR (thủ công hoặc từ BOM), phải **kiểm tra trùng** theo cùng khóa gộp như mục 3. Nếu PR **đã có** dòng trùng khóa → **không tạo dòng mới**; **cộng thêm số lượng** vào dòng hiện có (và cập nhật audit/metadata nếu có).

**Gợi ý triển khai:** Định nghĩa rõ **khóa gộp** (composite key) trong code (ví dụ `MdItemUuid` + định danh quy cách + `MdUomUuid` khi cần) và dùng thống nhất cho cả “flatten cây BOM” và “merge vào PR”; đơn vị phải thống nhất trước khi cộng.

## Backend (erd_matops_api)

| Area | Location |
|------|----------|
| PR CQRS | `MatOps.Application/PurchaseRequests/` |
| PO CQRS | `MatOps.Application/PurchaseOrders/` |
| PR DTOs | `MatOps.Application/DTOs/PurchaseRequests/` |
| PO DTOs | `MatOps.Application/DTOs/PurchaseOrders/` |
| API | `MatOps.Api/Controllers/PurchaseRequestController.cs`, `PurchaseOrderController.cs` |
| Domain | `MatOps.Domain/Entities/TrxPurchaseRequest.cs`, `TrxPurchaseRequestLine.cs`, `TrxPurchaseOrder.cs`, `TrxPurchaseOrderLine.cs` |
| EF | `TrxPurchaseRequestConfiguration.cs`, `TrxPurchaseRequestLineConfiguration.cs`, `TrxPurchaseOrderConfiguration.cs`, `TrxPurchaseOrderLineConfiguration.cs` |
| Tạo Item từ dòng PR | `MatOps.Application/Items/Commands/CreateItemFromPurchaseRequestLine/` + `CreateItemFromPurchaseRequestLineRequest` (DTO PR) |

### API surface (chuẩn hiện tại)

- **PR:** `GET/POST api/PurchaseRequest`, `GET/PUT api/PurchaseRequest/{uuid}`, `POST api/PurchaseRequest/{uuid}/submit`, `POST api/PurchaseRequest/lines/{lineUuid}/create-item`
- **PO:** `GET/POST api/PurchaseOrder`, `GET/PUT api/PurchaseOrder/{uuid}`, `POST api/PurchaseOrder/{uuid}/approve`, `POST api/PurchaseOrder/{uuid}/cancel`

### Quy tắc khi sửa

1. Đọc entity + validator command/query trước; giữ invariant và workflow trạng thái trong handler/entity theo `.cursorrules`.
2. Đổi field: DTO + `MappingProfile` + FluentValidation + `IEntityTypeConfiguration` + migration khi cần.
3. `Result<T>` + envelope; chuỗi user-facing qua `IStringLocalizer`.
4. List/filter: collection trên query; `null` hoặc rỗng = không lọc.
5. MMS: không giả định mọi dòng đã có `ItemId` GUID cố định.

## Frontend (matops-navigator)

| Area | Location |
|------|----------|
| Trang | `src/pages/PurchaseRequests.tsx`, `src/pages/PurchaseOrders.tsx` |
| Services | `src/api/services.ts` — `purchaseRequestService`, `purchaseOrderService` |
| Types | `src/types/models.ts` (và mirror contract `src/types/api.ts`) |

### Lưu ý đồng bộ API

- `purchaseRequestService.delete` gọi `DELETE api/PurchaseRequest/{uuid}` — **controller hiện không có action DELETE**; khi thêm UI xóa PR hoặc sửa service, kiểm tra backend hoặc bỏ gọi cho đến khi có endpoint.

### Quy tắc khi sửa

1. Contract / lỗi: bám `MatOps.Domain/Common/BaseModels.cs`.
2. HTTP qua `src/lib/apiClient.ts`; i18n không hardcode nhãn người dùng.

## Luồng nghiệp vụ (tóm tắt)

- **PR:** soạn → cập nhật dòng → `submit` khi đủ điều kiện validator; dòng có thể promote sang `MdItem` qua `create-item`.
- **PO:** tạo/cập nhật (giá, NCC, ngày giao…) → `approve` / `cancel` theo rule handler.

## Checklist thay đổi end-to-end

```
- [ ] Domain + configuration + migration (nếu đổi schema)
- [ ] Command/Query + validator + mapping + DTO
- [ ] Controller route và response type
- [ ] Navigator: services.ts + trang PR/PO + i18n
- [ ] errorDictionary nếu thêm ApiErrorCode mới
- [ ] BOM→PR: flatten cây BOM + khóa gộp (vật tư + quy cách [+ UOM]) + merge trùng / cộng Qty
```

## Khi không chắc

- Truy vết: Controller → MediatR handler → query/command.
- So sánh pattern module giao dịch khác (ví dụ `DeliveryOrders`, `GoodsReceipts`) trong `MatOps.Application`.
