export interface UserDirectoryItem {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  online: boolean;
  lastSeen: string | null;
  department?: string;
  organization?: string;
  joinedAt: string;
  role: string;
}

export interface UserDirectoryResponse {
  users: UserDirectoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
