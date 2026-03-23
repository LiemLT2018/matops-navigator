

# MatOps Platform — Kế hoạch xây dựng

## Tổng quan
Xây dựng giao diện web app ERP/MES cho nhà máy cơ khí chế tạo. Phong cách công nghiệp, tối ưu thao tác bàn phím, hiển thị dữ liệu dạng bảng với inline editing.

---

## 1. Nền tảng & Cấu trúc

### Thiết kế hệ thống
- **Layout**: Sidebar navigation (collapsible) + Header bar với user info, dark/light toggle, language switcher (VI/EN)
- **Theme**: Màu công nghiệp — primary xanh navy/steel blue, accent cam cảnh báo, nền tối xám đậm (dark) / trắng xám nhạt (light)
- **Đa ngôn ngữ**: i18n với react-i18next, mặc định Tiếng Việt

### API Infrastructure
- **`errorDictionary.ts`**: Mã lỗi đa ngôn ngữ (VI/EN), map errorCode → message
- **`BaseRequest`** với time, keycert (md5), ipAddress
- **`BaseResponse<T>`** và **`PagingResponse<T>`** với pagination
- **API client (apiClient.ts)**: Axios instance với interceptors — tự gắn BaseRequest, xử lý Unauthorized → logout, map errorCode → toast
- **Cấu hình**: BASE_URL, DPS_CERT trong Settings page
- **`DatePresetSelect`** component dùng chung cho tất cả bộ lọc thời gian (today, yesterday, this_week, last_week, 7_days, this_month, last_month, this_year, last_year) với UTC format
- **Mock API layer**: Tất cả module có mock data trả về qua api services tương ứng

### Quy tắc chung
- Password mã hóa md5(DPS_CERT + password)
- Số hiển thị format chuẩn (dấu chấm/phẩy phân cách)
- Phân trang chuẩn hóa với PagingResponse

---

## 2. Các Module chính

### Dashboard tổng quan
- **KPI Cards**: Tổng SO, BOM Design, PO, Production Order với trạng thái (pending/in-progress/done)
- **Warning Panel**: Danh sách cảnh báo với mức độ (critical/warning/info) — thiếu vật tư, chậm trả đơn, chậm thiết kế, PR về chậm
- **Chart so sánh**: Kế hoạch vs Thực tế (bar/line chart)

### Quản lý đơn hàng
- **Sales Order**: Bảng danh sách SO, filter theo trạng thái/thời gian, xem chi tiết, tạo/sửa
- **Product Order**: Bảng PO từ phòng kỹ thuật, liên kết với SO gốc, chuyển trạng thái

### Quản lý BOM
- **Hai chế độ hiển thị**:
  1. BOM Master grid → click mở BOM Detail page riêng
  2. Danh sách BOM Master (SP + KH) với expandable row xổ BOM Detail inline
- **Import BOM từ Excel**: Dialog chọn Product Order → Sản phẩm → Upload file Excel
- **BOM Detail**: Bảng cây (tree table) hiển thị cấu trúc vật tư nhiều cấp

### Quản lý mua hàng
- **Purchase Request (PR)**:
  - Tạo phiếu linh hoạt — cho phép thêm item chưa có trong danh mục vật tư
  - Autocomplete/suggest khi nhập tên vật tư, tự tạo item mới nếu chưa tồn tại
  - Tổng hợp từ nhiều BOM, suggest số lượng cần mua dựa trên tồn kho
  - Chọn NCC đề xuất
- **Purchase Order (PO)**: Bộ phận mua hàng cập nhật đơn giá final, NCC final từ PR

### Quản lý kho vật tư
- Nhập/xuất kho, tồn kho hiện tại, lịch sử giao dịch, cảnh báo tồn kho thấp

### Quản lý sản xuất
- Lệnh sản xuất, tiến độ, phân công, theo dõi trạng thái từng công đoạn

### QC sản phẩm
- Phiếu kiểm tra chất lượng, tiêu chí đánh giá, kết quả pass/fail, lịch sử QC

### Quản lý kho thành phẩm
- Nhập kho thành phẩm từ sản xuất, xuất kho theo SO, tồn kho thành phẩm

---

## 3. Trải nghiệm người dùng
- Bảng dữ liệu hỗ trợ inline editing, keyboard navigation (Tab, Enter, Escape)
- Tất cả form hỗ trợ phím tắt
- Toast notification cho mọi thao tác API
- Loading skeleton cho bảng dữ liệu
- Responsive nhưng ưu tiên desktop

## 4. Cấu trúc thư mục
```
src/
  api/          — apiClient, baseRequest, baseResponse, errorDictionary
  components/   — shared UI (DatePresetSelect, DataTable, NumberFormat...)
  hooks/        — useAuth, useLanguage, useTheme
  i18n/         — vi.json, en.json
  modules/      — dashboard, orders, bom, purchasing, warehouse, production, qc, finished-goods
  pages/        — route pages cho từng module
  types/        — shared TypeScript types
  mock/         — mock data & handlers cho từng module API
```

