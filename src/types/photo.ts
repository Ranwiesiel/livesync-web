
export interface Photo {
  id: string;
  event_id: string;
  storage_key: string;
  url: string;
  blur_hash: string;
  uploader: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: {
    message: string;
  } | null;
}
