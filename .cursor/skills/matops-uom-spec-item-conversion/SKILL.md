---
name: matops-uom-spec-item-conversion
description: >-
  Guides MatOps conversion between UOMs using item density (MdItem.DensityKgPerM3),
  rectangular specification dimensions (MdSpecification L/W/T), MdUomConversion,
  ItemMassCalculator, and POST api/Item/compute-unit-conversion (QTY↔WEIGHT,
  QTY↔LENGTH with lengthAxis). Use when the user mentions quy đổi ĐVT, UOM vs
  specification, kg per tấm, mét theo trục L/W/T, compute-unit-conversion,
  PurchaseRequests BOM ĐVT, bomMdUomUuid, convertMdUomUuid, lengthAxis,
  DensityKgPerM3, ItemMassCalculator, or edits to ComputeItemUnitConversion,
  ItemController compute endpoint, MdSpecification detail by UUID, ItemDetailListDto
  density, services.ts computeUnitConversion, or models.ts ComputeItemUnitConversion*.
---

# MatOps — Quy đổi UOM ↔ quy cách ↔ vật tư

## Mục đích

Nối **ba lớp dữ liệu** khi BOM/PR cần đổi đơn vị mà `MdUomConversion` chỉ giải quyết **cùng nhóm đo** (LENGTH↔LENGTH, WEIGHT↔WEIGHT, …):

1. **Vật tư (`MdItem`):** `DensityKgPerM3` — mật độ để suy ra kg từ thể tích (m³).
2. **Quy cách (`MdSpecification`):** `Length`, `Width`, `Thickness`, `DimensionMdUomUuid` (null = coi kích thước đã là mm trong domain cho `ItemMassCalculator`).
3. **ĐVT (`MdUom`):** `Type` → `UomMeasureKind` (Quantity, Weight, Length, …) + bảng `MdUomConversion` / `UomConverter`.

**Không** dùng `MdItem.WeightPerUnit` làm nguồn trong luồng PR/BOM quy đổi kg↔tấm (tránh trùng nguồn với mật độ + quy cách). Nếu schema vẫn có field lịch sử, tích hợp mới bám `DensityKgPerM3` + spec.

## Backend (erd_matops_api)

| Khái niệm | Vị trí |
|-----------|--------|
| Khối hộp L×W×T × ρ | `MatOps.Domain/Inventory/ItemMassCalculator.cs` — `TryComputeRectangularSolidMassKg` |
| Quy đổi UOM theo nhóm | `MatOps.Domain/Inventory/UomConverter.cs` (kèm `MdUomMeasureBase`, `MdUomConversion`) |
| Handler tổng hợp | `MatOps.Application/Items/Queries/ComputeItemUnitConversion/ComputeItemUnitConversionQuery.cs` |
| Request/response DTO | `MatOps.Application/DTOs/Items/ComputeItemUnitConversionDto.cs` |
| API | `POST api/Item/compute-unit-conversion` — `ItemController.ComputeUnitConversion` |
| Chi tiết quy cách (FE load kích thước) | `GET api/MdSpecification/{uuid}` — `MdSpecificationController`, `GetMdSpecificationByUuidQuery`, `MdSpecificationDetailDto` |
| Density trên list/detail item | `ItemDetailListDto` + `ItemMappingProfile` |

### Hành vi endpoint `compute-unit-conversion`

- **Input:** `MdItemUuid`, `MdSpecificationUuid`, `SourceMdUomUuid`, `TargetMdUomUuid`, optional `LengthAxis` (`"length"` \| `"width"` \| `"thickness"`, default `"length"`).
- **Output:** `MassKgPerUnit` (kg / 1 đơn vị đếm khi đủ L×W×T + density), `MetersPerUnit` (m / 1 đơn vị đếm theo **cạnh** đã chọn), `ConversionFactor` sao cho **1 đơn vị nguồn = factor × 1 đơn vị đích**, `Ok`, `ErrorKey`.
- **Cùng `UomMeasureKind`:** hệ số chỉ từ `UomConverter` (không cần density).
- **QTY → WEIGHT:** dùng `MassKgPerUnit` rồi đưa kg về đơn vị đích (canonical weight).
- **WEIGHT → QTY:** ngược lại chia cho `MassKgPerUnit`.
- **QTY → LENGTH / LENGTH → QTY:** dùng `MetersPerUnit` từ một cạnh spec (theo `LengthAxis`), không phải “chu vi” hay tối ưu cắt — mô hình “nối cạnh” theo kế hoạch sản phẩm.

**MVP hình học:** chỉ **khối chữ nhật**; profile H-beam, ống CHS, v.v. cần **strategy** sau (không gộp vào một công thức hộp).

### Khi sửa logic quy đổi

1. Đọc `ComputeItemUnitConversionQueryHandler` và `ItemMassCalculator` trước; mọi thay đổi nhóm đo phải khớp `UomMeasureKind` và conversion đang active (`Status == 1`).
2. Lỗi nghiệp vụ: localize qua `IStringLocalizer`; envelope `Result<T>` / `BaseResponse` theo chuẩn dự án.
3. Thêm mã lỗi mới → `ApiErrorCode` + FE `errorDictionary` nếu cần map UI.

## Frontend (matops-navigator)

| Khu vực | File |
|---------|------|
| HTTP | `src/api/services.ts` — `itemService.computeUnitConversion` |
| Types | `src/types/models.ts` — `ComputeItemUnitConversionRequest`, `ComputeItemUnitConversionResult` |
| PR / BOM | `src/pages/PurchaseRequests.tsx` — ĐVT theo BOM (read-only) vs ĐVT quy đổi; gọi API khi đổi cặp ĐVT cần cầu nối vật lý |

### Quy tắc UI / merge

- **`bomMdUomUuid`:** ĐVT gốc từ dòng BOM (read-only trên form PR).
- **`convertMdUomUuid` / nhãn:** ĐVT đặt hàng — đây là `mdUomUuid` gửi khi lưu PR; `quantity` hiển thị theo ĐVT này.
- Khi ĐVT BOM = ĐVT quy đổi: **không đổi số**, chỉ đồng bộ nhãn.
- Gộp dòng PR: `(item, spec, mdUomUuid đặt hàng)`; nếu ĐVT là **LENGTH** và có nhiều trục hợp lệ, **thêm `lengthAxis`** vào khóa gộp để không gộp nhầm hai dòng cùng vật tư nhưng khác trục mét.

## Quan hệ với skill kho

Skill `matops-warehouse-inventory` phủ **tồn kho / GR / master UOM**. Skill này phủ **cầu vật lý item+spec** cho PR/BOM và endpoint `compute-unit-conversion`. Khi một thay đổi đụng cả hai (ví dụ định nghĩa UOM mới), cập nhật conversion master và kiểm tra cả luồng tồn và luồng tính kg/m.

## Checklist nhanh

```
- [ ] Đủ DensityKgPerM3 + L/W/T + conversion LENGTH (kích thước) + conversion WEIGHT/LENGTH đích
- [ ] lengthAxis đúng khi target là mét
- [ ] FE: merge key có lengthAxis khi đặt theo mét
- [ ] Không dựa WeightPerUnit cho luồng này
- [ ] Hình học không phải hộp → thiết kế strategy mới, không ép vào TryComputeRectangularSolidMassKg
```
