export interface SeedRequest {
  tenant_name: string;
  tenant_slug?: string;
  owner_email: string;
  owner_password: string;
}

export interface SeedResponse {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  email: string;
  role: string;
}
