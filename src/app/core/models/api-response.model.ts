export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiMeta {
  request_id: string;
  tenant_id: string;
}
