export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  action_label: string;
  entity_type: string;
  entity_type_label: string;
  entity_id: string;
  entity_description?: string;
  description: string;
  changes: unknown;
  reason: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  action?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface AuditLogListResponse {
  items: AuditLog[];
  total: number;
}
