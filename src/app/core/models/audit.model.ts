export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: unknown;
  created_at: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
}
