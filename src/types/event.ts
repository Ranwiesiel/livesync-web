
export interface Event {
  id: string;
  title: string;
  code: string;
  cover_image?: string;
  created_at: string;
  is_active: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    message: string;
  } | null;
}
