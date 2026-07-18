export interface UserProfile {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  photo_url: string | null;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  photo_url?: string | null;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
