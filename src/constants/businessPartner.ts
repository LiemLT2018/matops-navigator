/**
 * Khớp `MdBusinessPartner.Type` / CreateBusinessPartnerCommand.Type.
 * Lọc danh sách dùng chuỗi như `GetBusinessPartnersQuery.Types` (CUSTOMER, SUPPLIER, BOTH).
 */
export const BUSINESS_PARTNER_TYPE = {
  CUSTOMER: 1,
  SUPPLIER: 2,
  BOTH: 3,
} as const;

/**
 * Gửi lặp `types=` — dùng mã số để ASP.NET bind `List<string>` ổn định;
 * `BusinessPartnerTypeMapper.ToStorage` parse "1"→CUSTOMER, "2"→SUPPLIER, "3"→BOTH.
 */
export const BUSINESS_PARTNER_LIST_TYPES_CUSTOMER = ['1', '3'] as const;
export const BUSINESS_PARTNER_LIST_TYPES_SUPPLIER = ['2', '3'] as const;
