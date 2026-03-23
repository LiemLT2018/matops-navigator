export interface BaseRequest {
  time: string;
  keycert: string;
  IpAddress: string;
}

export interface BaseResponse<T = unknown> {
  errorCode: number | string;
  errorMessage: string;
  data: T;
}

export interface PagingResponse<T = unknown> {
  errorCode: number | string;
  errorMessage: string;
  data: T;
  pagination: PaginationData;
}

export interface PaginationData {
  totalCount: number;
  totalPages: number;
  currentPages: number;
}

export interface TimeWithPageRequest {
  keyword: string | null;
  fromDate: string;
  toDate: string;
  pageSize: number;
  page: number;
}

export type DatePresetKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "7_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year";
