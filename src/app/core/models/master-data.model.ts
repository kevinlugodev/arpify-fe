export interface Management {
  id: string;
  tenant_id: string;
  name: string;
  responsible_team_member_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementListResponse {
  items: Management[];
  total: number;
}

export interface CreateManagementRequest {
  name: string;
  responsible_team_member_id?: string | null;
}

export interface UpdateManagementRequest {
  name?: string;
  responsible_team_member_id?: string | null;
}

export interface Area {
  id: string;
  tenant_id: string;
  management_id: string;
  management_name?: string;
  name: string;
  status?: string;
  responsible_team_member_id: string | null;
  responsible_name?: string;
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
  responsible_team_member_id?: string | null;
}

export interface UpdateAreaRequest {
  management_id?: string;
  name?: string;
  responsible_team_member_id?: string | null;
}
