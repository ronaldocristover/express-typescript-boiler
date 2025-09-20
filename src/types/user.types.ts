export interface CreateUserDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
