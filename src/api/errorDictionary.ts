type ErrorMessages = Record<string, { vi: string; en: string }>;

export const errorDictionary: ErrorMessages = {
  "-1": { vi: "Lỗi hệ thống", en: "System error" },
  "0": { vi: "Thành công", en: "Success" },
  "1": { vi: "Thất bại", en: "Failed" },
  "2": { vi: "Dữ liệu không hợp lệ", en: "Invalid data" },
  "3": { vi: "Không có quyền truy cập", en: "Access denied" },
  "4": { vi: "Dữ liệu đã tồn tại", en: "Data already exists" },
  "5": { vi: "Không tìm thấy dữ liệu", en: "Data not found" },
  "401": { vi: "Phiên đăng nhập hết hạn", en: "Session expired" },
  "10": { vi: "Thiếu vật tư trong kho", en: "Material shortage in warehouse" },
  "11": { vi: "BOM chưa được duyệt", en: "BOM not approved" },
  "12": { vi: "Đơn hàng đã bị hủy", en: "Order has been cancelled" },
  "13": { vi: "Số lượng vượt quá tồn kho", en: "Quantity exceeds stock" },
  "14": { vi: "Nhà cung cấp không hợp lệ", en: "Invalid supplier" },
};

export function getErrorMessage(errorCode: number | string, lang: string = 'vi'): string | null {
  const key = String(errorCode);
  const entry = errorDictionary[key];
  if (!entry) return null;
  return lang === 'en' ? entry.en : entry.vi;
}
