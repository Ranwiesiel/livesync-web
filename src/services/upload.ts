import axios from 'axios'

import { api } from './api'

export interface PresignedUpload {
  upload_url: string
  method: 'PUT'
  key: string
  content_type: string
  expires_in: number
  expires_at: string
}

interface APIEnvelope<T> {
  success: boolean
  data: T | null
  error: { message?: string } | null
}

// Harus sama dengan allowedContentTypes di livesync-api/internal/handlers/storage.go.
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
] as const

// Sebagian browser tidak mengisi File.type untuk HEIC/HEIF, jadi ekstensi dipakai
// sebagai cadangan.
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadError'
  }
}

/** Menentukan content type yang akan ditandatangani, atau null jika tidak didukung. */
export function detectContentType(file: File): string | null {
  const declared = file.type.trim().toLowerCase()
  if ((ALLOWED_CONTENT_TYPES as readonly string[]).includes(declared)) {
    return declared
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_CONTENT_TYPES[extension] ?? null
}

/** Meminta URL PUT sementara ke backend Golang. */
export async function requestPresignedUpload(file: File): Promise<PresignedUpload> {
  const contentType = detectContentType(file)

  if (!contentType) {
    throw new UploadError(
      'Format file tidak didukung. Gunakan JPG, PNG, WEBP, GIF, HEIC, atau HEIF.',
    )
  }

  const response = await api.post<APIEnvelope<PresignedUpload>>(
    '/api/media/presign-upload',
    { filename: file.name, content_type: contentType },
  )

  const body = response.data

  if (!body.success || !body.data) {
    throw new UploadError(body.error?.message ?? 'Gagal membuat URL upload.')
  }

  return body.data
}

/**
 * Upload langsung ke R2 memakai URL hasil presign.
 *
 * Header Content-Type wajib persis sama dengan yang ditandatangani backend;
 * menambah header lain atau mengubah nilainya membuat signature tidak valid.
 */
export async function uploadToR2(
  file: File,
  presign: PresignedUpload,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  try {
    await axios.put(presign.upload_url, file, {
      headers: { 'Content-Type': presign.content_type },
      onUploadProgress: (event) => {
        const total = event.total ?? file.size
        if (!total) return
        onProgress?.(Math.min(1, Math.max(0, event.loaded / total)))
      },
    })
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 403) {
        throw new UploadError(
          'R2 menolak upload (403). Content-Type harus sama persis dengan yang di-presign.',
        )
      }
      if (!error.response) {
        throw new UploadError(
          'Tidak bisa menghubungi R2. Periksa koneksi internet dan aturan CORS bucket.',
        )
      }
      throw new UploadError(`Upload ke R2 gagal (${error.response.status}).`)
    }
    throw new UploadError('Upload ke R2 gagal.')
  }
}
