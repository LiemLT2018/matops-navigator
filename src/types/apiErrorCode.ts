/**
 * Mirrors MatOps.Domain.Common.ApiErrorCode (numeric values only).
 * Keep in sync when backend adds codes.
 */
export const ApiErrorCode = {
  SystemError: -1,
  Success: 0,
  Failed: 1,
  Unauthorized: 401,
  ValidationFailed: 9001,
  ConcurrencyConflict: 9052,
  ConnectionStringMissing: 9101,
  JwtSigningKeyMissing: 9102,
  ExternalSystemInactive: 9201,
  ExternalEndpointMissing: 9202,
  Auth: {
    InvalidCredentials: 1001,
    TokenExpired: 1002,
    TokenInvalid: 1003,
    AccountLocked: 1004,
    RequestSignatureInvalid: 1005,
    CompanyMismatch: 1006,
    LoginEncryptionNotConfigured: 1007,
    LoginPlainPasswordDisabled: 1008,
  },
} as const;
