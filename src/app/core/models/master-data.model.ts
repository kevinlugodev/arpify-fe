export interface ResponsiblePerson {
  id: string;
  full_name: string;
  email: string;
  prefix: string;
}

export interface Management {
  id: string;
  tenant_id: string;
  name: string;
  status?: string;
  responsible: ResponsiblePerson | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementListResponse {
  items: Management[];
  total: number;
}

export interface CreateManagementRequest {
  name: string;
}

export interface UpdateManagementRequest {
  name?: string;
}

export interface Area {
  id: string;
  tenant_id: string;
  management_id: string;
  management_name?: string;
  name: string;
  status?: string;
  responsible: ResponsiblePerson | null;
  created_at: string;
  updated_at: string;
}

export interface AreaListResponse {
  items: Area[];
  total: number;
}

export interface CreateAreaRequest {
  management_id: string;
  name: string;
}

export interface UpdateAreaRequest {
  management_id?: string;
  name?: string;
}
