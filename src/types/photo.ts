
export interface PhotoExif {
  camera_make?: string;
  camera_model?: string;
  lens_model?: string;
  date_time_original?: string;
  iso?: number;
  aperture?: number;
  shutter_speed?: string;
}

export interface Photo {
  id: string;
  event_id: string;
  storage_key: string;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  blur_hash?: string;
  uploader: string;
  created_at: string;
  exif?: PhotoExif;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: {
    message: string;
  } | null;
}

export interface PaginatedPhotos {
  items: Photo[];
  next_cursor: string;
  has_more: boolean;
}

export interface BatchPhotoInput {
  storage_key: string;
  blur_hash?: string;
}

export interface BatchPhotoFailure {
  storage_key: string;
  message: string;
}

export interface BatchConfirmResult {
  items: Photo[];
  failed: BatchPhotoFailure[];
}
