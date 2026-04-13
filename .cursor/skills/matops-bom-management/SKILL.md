---
name: matops-bom-management
description: >-
  Guides implementation and debugging of MatOps Product BOM Templates (master
  header, lines, child BOM refs, material suggest, status workflow). Use when
  the user mentions BOM, quản lý bom, ProductBomTemplate, dòng BOM, BOM master,
  cây BOM con, nhập BOM Excel, or edits under ProductBomTemplates / BOM.tsx.
---

# MatOps — Quản lý BOM (Product BOM Template)

## Scope

- **Master data:** `MdProductBomTemplate`, `MdProductBomTemplateLine`, `MdProductBomTemplateChildRef` (Domain).
- **Runtime/production BOM:** `TrxProductBom` / `TrxProductBomLine` — chỉ đụng khi yêu cầu liên quan lệnh sản xuất / BOM giao dịch, không trộn logic với template.

## Backend (erd_matops_api)

| Area | Location |
|------|----------|
| CQRS (commands/queries) | `MatOps.Application/ProductBomTemplates/` |
| DTOs | `MatOps.Application/DTOs/ProductBomTemplates/` |
| API | `MatOps.Api/Controllers/ProductBomTemplateController.cs`, `ProductBomTemplateLineController.cs` |
| EF configuration | `MatOps.Infrastructure/Persistence/Configurations/` — entities `MdProductBomTemplate*` |
| Domain entities | `MatOps.Domain/Entities/MdProductBomTemplate.cs`, `MdProductBomTemplateLine.cs`, `MdProductBomTemplateChildRef.cs` |
| Graph / material | `ProductBomTemplates/Services/BomTemplateGraphGuard.cs`, `BomLineMaterialResolver.cs` |
| Material autocomplete | Query `SearchBomMaterialSuggestions` |

### Quy tắc khi sửa

1. Đọc entity Domain trước; giữ invariant ở entity khi phù hợp với `.cursorrules`.
2. Thêm/sửa field: DTO + `MappingProfile` + `FluentValidation` validator + `IEntityTypeConfiguration` + migration khi cần.
3. Trả về `Result<T>` / envelope chuẩn; chuỗi user-facing qua `IStringLocalizer` (không hardcode).
4. List/filter: dùng collection trên request; `null` hoặc rỗng = không lọc (theo convention dự án).
5. MMS: `ItemId` có thể null; mã tạm `UNKNOWN_...` — không giả định mọi dòng đã resolve GUID.

## Frontend (matops-navigator)

| Area | Location |
|------|----------|
| Trang BOM chính | `src/pages/BOM.tsx` |
| HTTP services | `src/api/services.ts` — `productBomTemplateService`, `productBomTemplateLineService` |
| Types BOM UI | `src/types/bom.ts` |

### Quy tắc khi sửa

1. Contract JSON / lỗi: bám `MatOps.Domain/Common/BaseModels.cs` (mirror `src/types/api.ts`).
2. Gọi API qua `src/lib/apiClient.ts`; đồng bộ field với DTO backend (PascalCase từ proxy — trang BOM đã có normalize một phần).
3. i18n: `react-i18next`; không chèn chuỗi cố định cho nhãn người dùng.

## Workflow nghiệp vụ (template)

- CRUD header: create/update/delete template; trạng thái qua commands trong `ChangeProductBomTemplateStatus` (submit/start/approve — kiểm tra controller để khớp endpoint).
- Dòng BOM: CRUD line; suggest vật tư qua API search.
- BOM con: quan hệ qua child ref + API cây (`GetProductBomTemplateChildTree`).

## Checklist thay đổi end-to-end

```
- [ ] Domain + configuration + migration (nếu đổi schema)
- [ ] Command/Query + validator + mapping + DTO
- [ ] Controller route và kiểu response
- [ ] Navigator: services.ts + BOM.tsx (+ i18n keys)
- [ ] errorDictionary nếu thêm ApiErrorCode mới
```

## Khi không chắc

- Truy vết từ controller → MediatR handler → query/command.
- So sánh pattern module tương tự (ví dụ Items, PurchaseRequests) trong cùng `MatOps.Application`.
