export interface Folder {
  id: string;
  tenant_id: string;
  owner_team_member_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string | null;
}

export interface FolderContentResponse {
  folders: Folder[];
  files: FileItem[];
}

export interface FileItem {
  id: string;
  tenant_id: string;
  owner_team_member_id: string;
  folder_id: string | null;
  storage_key: string;
  filename: string;
  size: number;
  content_type: string;
  download_url: string;
  created_at: string;
  updated_at: string;
}
