# Tính năng Yêu cầu mua hàng (Purchase Request — PR)

Tài liệu tóm tắt **logic quan trọng** của luồng PR trên MatOps Navigator và phần hợp đồng với API MatOps (`erd_matops_api`).

---

## 1. API & service (Navigator)

| Thành phần | Mô tả |
|------------|--------|
| `purchaseRequestService` | `GET/POST api/PurchaseRequest`, `GET/PUT api/PurchaseRequest/{uuid}`, `POST .../submit`, `POST .../lines/{lineUuid}/create-item` |
| `userService.list` | `GET api/User` — catalog user theo `mdCompanyUuid` (người yêu cầu) |
| `departmentService.list` | `GET api/Department` — catalog bộ phận theo `mdCompanyUuid` |
| `suggestApi` — `type: 'unit'` | Gọi `uomService.list` → `GET api/Uom` (gợi ý ĐVT thật, không còn mock) |
| Envelope | `BaseResponse`: `errorCode === 0` → `data`; client: `lib/apiClient.ts` |

**Lưu ý:** `purchaseRequestService.delete` có thể không khớp controller (không có DELETE) — UI không nên gọi xóa cho đến khi backend có endpoint.

---

## 2. Header PR (form soạn thảo)

### 2.1 Người yêu cầu & bộ phận

- **Người yêu cầu:** `Select` từ `userService.list` (CATALOG, theo công ty). Đổi user → nếu user có `mdDepartmentUuid` thì gợi ý cập nhật ô bộ phận.
- **Bộ phận:** `Select` từ `departmentService.list`; giá trị gửi lên **`mdDepartmentUuid`** trong `create` / `update` (không lấy cứng từ session).

### 2.2 Ghi chú header & meta (hạn chế contract API)

Backend **không** có field riêng cho “người yêu cầu” hay “danh sách BOM đã chọn” trên `TrxPurchaseRequest`. Phần này được mã hóa trong **`remark`** header:

- Khối: `---PRMETA---\n` + JSON + `\n---END---\n` + phần ghi chú người dùng.
- JSON: `v` (version), `bom`, `bomCode`, `ru` (requester uuid), `rn` (requester name), `bomPicks` (v2+).
- **v2:** `bomPicks: Array<{ templateUuid, label }>` — danh sách BOM templates đã dùng (deduplicated by templateUuid).
- **Decode** khi mở sửa / clone; **encode** khi lưu.
- Danh sách PR (grid): cột ghi chú hiển thị **chỉ phần sau meta** (`prListRemarkText`) để không lộ JSON.

---

## 3. Tham chiếu BOM & nhập vật tư

### 3.1 Ô chọn BOM

- `SuggestInputText` `type: 'bom'` → `productBomTemplateService.list` (template theo công ty).
- Mỗi lần chọn và **nhập thành công** (có ít nhất một dòng flatten): tạo `BomPickLayer` với `pickId`, `templateUuid`, `contributions` (Map key→BomFlatRow), push vào `prBomPickLayers`. Cập nhật `formBomTemplateUuid` / nhãn hiển thị theo lần chọn cuối.

### 3.2 Flatten BOM → dòng form vật tư

1. **Dòng trực tiếp** của template gốc: `productBomTemplateLineService.list` (`mdProductBomTemplateUuid`, không phân trang tới giới hạn API).
2. **BOM con / cháu:** `productBomTemplateService.getChildTree` → duyệt cây; với mỗi node (bỏ qua `cycleSkipped`), nhân **`QtyPer`** dọc đường đi và nhân số lượng dòng con vào tổng.
3. **Gộp dòng** trong form theo khóa: *vật tư* (`materialUuid` hoặc tên) + *quy cách* (`mdSpecificationUuid` hoặc chuỗi spec) + **`mdUomUuid`** — trùng khóa thì **cộng** `quantity` và `bomQtyPer`.

### 3.3 Dialog “BOM đã chọn”

- Nút mở khi `prBomPickList.length > 0`.
- Hiển thị: template (nhãn + UUID), **số lần chọn** trong phiên, và nút **Bỏ chọn** cho từng pick.
- **Bỏ chọn (`removePrBomPick`):** trừ `contributions` của layer đó khỏi `formMaterials` (qty, bomQtyPer); xóa dòng nếu qty ≤ 0; cập nhật `formBomTemplateUuid` theo layer cuối còn lại.
- **Hydrated layers** (từ edit/clone): `hydrated: true` → nút bỏ chọn disabled + tooltip giải thích.
- Tạo PR mới: reset layers. Sửa/clone: seed hydrated layers từ `meta.bomPicks` (v2) hoặc `meta.bomUuid` (v1).

---

## 4. Bảng vật tư (dòng PR trên form)

| Khái niệm | Logic |
|-----------|--------|
| **Tên vật tư** | `SuggestInputWithQuickAdd` `material` → gợi ý từ API (material suggestions); có thể kèm `mdUomUuid` / `unitName` từ gợi ý. |
| **Quy cách** | Giống BOM: specification + quick-add; `mdSpecificationUuid` khi khớp DB. |
| **ĐVT BOM** | Read-only khi có `bomMdUomUuid` (từ BOM import); hiển thị `bomUnitLabel`. Không có BOM → editable `SuggestInputWithQuickAdd`. |
| **SL theo BOM** | `bomQtyPer` — tích lũy khi import/merge từ BOM; read-only khi có `bomMdUomUuid`. |
| **ĐVT quy đổi** | Editable `SuggestInputWithQuickAdd` `unit`; khi khác ĐVT BOM → gọi `POST api/Item/compute-unit-conversion` để tính hệ số và cập nhật `quantity`. Giá trị này = `mdUomUuid` gửi lên API. Khi target là LENGTH, hiển thị thêm **chọn trục** (L/W/T). |
| **Số lượng cần** | `quantity` → map **`requestedQty`** khi POST/PUT. Tự tính lại khi đổi ĐVT quy đổi hoặc trục. |
| **Lưu dòng** | API không có cột specification riêng: quy cách được **ghép vào `remark` dòng** (prefix theo i18n `bom.specification:`); phần còn lại là ghi chú dòng. |

**Validation lưu:** mỗi dòng cần `mdUomUuid`, `requestedQty > 0`, tên + SL hợp lệ.

---

## 5. Chi tiết mở rộng (expand) trên danh sách PR

- Gọi `GET api/PurchaseRequest/{uuid}` → `lines`.
- Bảng: tách **quy cách** / **ghi chú** từ `remark` dòng bằng cùng prefix đã dùng lúc lưu (`splitPrLineRemark`).
- ĐVT trên expand vẫn có thể hiển thị rút gọn UUID nếu chưa resolve tên (tùy phiên bản UI).

---

## 6. File / module chính (Navigator)

| File | Vai trò |
|------|---------|
| `src/pages/PurchaseRequests.tsx` | UI, meta remark, flatten BOM, stats, form lines |
| `src/api/services.ts` | `purchaseRequestService`, `userService`, `departmentService`, `uomService`, … |
| `src/api/suggestApi.ts` | `unit` → `uomService.list`; `bom`, `material`, `specification`, … |
| `src/types/models.ts` | `PurchaseRequest*`, `UserCatalogRow`, `DepartmentCatalogRow` |
| `src/i18n/vi.json`, `en.json` | Chuỗi PR (qtyNeeded, BOM đã chọn, …) |

---

## 7. Backend (tham chiếu nhanh)

- Controller: `MatOps.Api/Controllers/PurchaseRequestController.cs`
- CQRS: `MatOps.Application/PurchaseRequests/`
- Entity header: `TrxPurchaseRequest` (`MdDepartmentUuid`, `Remark`, …); dòng: `TrxPurchaseRequestLine` (`MdItemUuid`, `MdUomUuid`, `Name`, `RequestedQty`, `Remark`, …) — **không** có `MdSpecificationUuid` trên dòng PR tại thời điểm tích hợp này.

---

*Tài liệu phản ánh trạng thái tích hợp Navigator; khi backend bổ sung field (requester, BOM refs, spec dòng), nên cập nhật payload và có thể đơn giản hóa / bỏ meta trong `remark`.*
