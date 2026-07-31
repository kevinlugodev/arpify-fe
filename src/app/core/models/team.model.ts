export type TeamMemberStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';

export interface TeamMember {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  address: string;
  birth_date: string | null;
  document_type: string;
  document_number: string;
  position: string;
  management_id: string | null;
  area_id: string | null;
  is_management_responsible: boolean;
  is_area_responsible: boolean;
  responsible_for_management_id: string | null;
  responsible_for_area_id: string | null;
  metadata: Record<string, unknown>;
  status: TeamMemberStatus;
  has_account: boolean;
  hire_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTeamMemberRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  province?: string;
  district?: string;
  address?: string;
  birth_date?: string | null;
  document_type?: string;
  document_number?: string;
  position?: string;
  management_id?: string | null;
  area_id?: string | null;
  create_account?: boolean;
  hire_date?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTeamMemberRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  province?: string;
  district?: string;
  address?: string;
  birth_date?: string | null;
  document_type?: string;
  document_number?: string;
  position?: string;
  management_id?: string | null;
  area_id?: string | null;
  status?: TeamMemberStatus;
  hire_date?: string;
  metadata?: Record<string, unknown>;
}

export interface TeamListFilters {
  status?: TeamMemberStatus;
  management_id?: string;
  area_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface TeamListResponse {
  items: TeamMember[];
  total: number;
}

export interface AssignResponsibleRequest {
  management_id?: string | null;
  area_id?: string | null;
}

export interface DeactivateTeamMemberRequest {
  reason?: string;
}

export interface UpdateTeamMemberStatusRequest {
  status: TeamMemberStatus;
}
