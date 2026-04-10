import { ApiErrorCode } from '@/types/apiErrorCode';

type ErrorMessages = Record<string, { vi: string; en: string }>;

/** Client fallback when API returns empty errorMessage. Align with MatOps.Domain.Common.ApiErrorCode. */
export const errorDictionary: ErrorMessages = {
  [String(ApiErrorCode.SystemError)]: {
    vi: 'Không thể xử lý do lỗi hệ thống.',
    en: 'A system error occurred.',
  },
  [String(ApiErrorCode.Success)]: { vi: 'Đã xử lý thành công.', en: 'Success.' },
  [String(ApiErrorCode.Failed)]: {
    vi: 'Không thể xử lý yêu cầu.',
    en: 'The request could not be processed.',
  },
  [String(ApiErrorCode.Unauthorized)]: {
    vi: 'Không được phép truy cập.',
    en: 'Access denied.',
  },
  [String(ApiErrorCode.ValidationFailed)]: {
    vi: 'Dữ liệu đầu vào không hợp lệ.',
    en: 'Validation failed.',
  },
  [String(ApiErrorCode.ConcurrencyConflict)]: {
    vi: 'Dữ liệu đã được người khác thay đổi; vui lòng tải lại và thử lại.',
    en: 'Data was modified by someone else; please refresh and try again.',
  },
  [String(ApiErrorCode.ConnectionStringMissing)]: {
    vi: 'Thiếu chuỗi kết nối cơ sở dữ liệu.',
    en: 'Database connection string is missing.',
  },
  [String(ApiErrorCode.JwtSigningKeyMissing)]: {
    vi: 'Chưa cấu hình khóa ký JWT.',
    en: 'JWT signing key is not configured.',
  },
  [String(ApiErrorCode.ExternalSystemInactive)]: {
    vi: 'Hệ thống ngoài không tồn tại hoặc đã tắt.',
    en: 'External system is inactive or missing.',
  },
  [String(ApiErrorCode.ExternalEndpointMissing)]: {
    vi: 'Chưa cấu hình endpoint cho hệ thống ngoài.',
    en: 'External system endpoint is not configured.',
  },
  [String(ApiErrorCode.Auth.InvalidCredentials)]: {
    vi: 'Không thể đăng nhập do sai tên đăng nhập hoặc mật khẩu.',
    en: 'Invalid username or password.',
  },
  [String(ApiErrorCode.Auth.TokenExpired)]: {
    vi: 'Phiên đăng nhập đã hết hạn.',
    en: 'Session has expired.',
  },
  [String(ApiErrorCode.Auth.TokenInvalid)]: {
    vi: 'Token không hợp lệ.',
    en: 'Invalid token.',
  },
  [String(ApiErrorCode.Auth.AccountLocked)]: {
    vi: 'Tài khoản đã bị khóa.',
    en: 'Account is locked.',
  },
  [String(ApiErrorCode.Auth.RequestSignatureInvalid)]: {
    vi: 'Chữ ký request không hợp lệ (keycert/time).',
    en: 'Invalid request signature (keycert/time).',
  },
  [String(ApiErrorCode.Auth.CompanyMismatch)]: {
    vi: 'Không được truy cập dữ liệu của công ty khác.',
    en: 'Company scope mismatch.',
  },
  [String(ApiErrorCode.Auth.LoginEncryptionNotConfigured)]: {
    vi: 'Đăng nhập mã hóa chưa được cấu hình trên server.',
    en: 'Login encryption is not configured on the server.',
  },
  [String(ApiErrorCode.Auth.LoginPlainPasswordDisabled)]: {
    vi: 'Không cho phép gửi mật khẩu dạng thuần; hãy dùng mật khẩu mã hóa (RSA-OAEP).',
    en: 'Plain password login is disabled; use RSA-OAEP encrypted password.',
  },
};

export function getErrorMessage(errorCode: number | string, lang: string = 'vi'): string | null {
  const key = String(errorCode);
  const entry = errorDictionary[key];
  if (!entry) return null;
  const lng = lang.split('-')[0];
  return lng === 'en' ? entry.en : entry.vi;
}
