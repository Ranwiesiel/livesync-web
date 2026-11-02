
import axios from 'axios'

import { api } from '@/services/api'

export const MAX_FILE_SIZE = 20 * 1024 * 1024

const ALLOWED_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadError'
  }
}

export interface PresignedUpload {
  upload_url: string
  method: 'PUT'
  key: string
  content_type: string
  expires_in: number
  expires_at: string
}

export interface BatchPhotoInput {
  storage_key: string
}

export interface ConfirmedPhoto {
  storage_key: string
  thumbnail_url?: string | null
}

export interface BatchConfirmResult {
  items: ConfirmedPhoto[]
  failed: {
    storage_key: string
    message: string
  }[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error: {
    message: string
  } | null
}

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ''
}

export function validateUploadFile(file: File): void {
  const extension = getExtension(file.name)
  const expectedType = ALLOWED_TYPES[extension]

  if (!expectedType) {
    throw new UploadError(
      `Format file "${file.name}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`,
    )
  }

  if (file.size === 0) {
    throw new UploadError(`File "${file.name}" kosong dan tidak dapat diunggah.`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      `File "${file.name}" melebihi batas maksimal 20 MB.`,
    )
  }

  if (file.type && file.type !== expectedType) {
    throw new UploadError(
      `Tipe file "${file.name}" tidak sesuai dengan ekstensinya.`,
    )
  }
}

function detectContentType(file: File): string {
  validateUploadFile(file)

  const extension = getExtension(file.name)
  return ALLOWED_TYPES[extension]
}

function getApiErrorMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined

  const responseData = error.response?.data as
    | ApiResponse<unknown>
    | { message?: string; error?: { message?: string } }
    | undefined

  if (!responseData) return undefined

  if ('error' in responseData && responseData.error?.message) {
    return responseData.error.message
  }

  if ('message' in responseData && responseData.message) {
    return responseData.message
  }

  return undefined
}

export function normalizeUploadError(error: unknown): UploadError {
  if (error instanceof UploadError) return error

  const serverMessage = getApiErrorMessage(error)

  if (serverMessage) {
    return new UploadError(serverMessage)
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new UploadError(
        'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
      )
    }

    switch (error.response.status) {
      case 400:
        return new UploadError('Data upload tidak valid.')
      case 401:
        return new UploadError('Sesi Anda telah berakhir. Silakan login kembali.')
      case 403:
        return new UploadError('Anda tidak memiliki izin untuk mengunggah foto.')
      case 413:
        return new UploadError('Ukuran file melebihi batas maksimal 20 MB.')
      case 415:
        return new UploadError('Format file tidak didukung oleh server.')
      default:
        return new UploadError('Terjadi kesalahan pada server saat mengunggah foto.')
    }
  }

  if (error instanceof Error && error.message) {
    return new UploadError(error.message)
  }

  return new UploadError('Upload gagal. Silakan coba lagi.')
}

function unwrapResponse<T>(response: { data: ApiResponse<T> | T }): T {
  const body = response.data

  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    'data' in body
  ) {
    const envelope = body as ApiResponse<T>

    if (!envelope.success) {
      throw new UploadError(
        envelope.error?.message ?? 'Permintaan upload gagal.',
      )
    }

    return envelope.data
  }

  return body as T
}

export async function requestPresignedUpload(
  file: File,
): Promise<PresignedUpload> {
  try {
    validateUploadFile(file)

    const contentType = detectContentType(file)

    const response = await api.post<ApiResponse<PresignedUpload>>(
      '/api/media/presign-upload',
      {
        filename: file.name,
        content_type: contentType,
      },
    )

    return unwrapResponse(response)
  } catch (error) {
    throw normalizeUploadError(error)
  }
}

export async function uploadToR2(
  file: File,
  presign: PresignedUpload,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  try {
    validateUploadFile(file)

    await axios.put(presign.upload_url, file, {
      headers: {
        'Content-Type': presign.content_type,
      },
      onUploadProgress: (event) => {
        if (!event.total) return

        const fraction = Math.min(event.loaded / event.total, 1)
        onProgress?.(fraction)
      },
    })

    onProgress?.(1)
  } catch (error) {
    throw normalizeUploadError(error)
  }
}

export async function confirmPhotosBatch(input: {
  eventId: string
  uploader?: string
  photos: BatchPhotoInput[]
}): Promise<BatchConfirmResult> {
  try {
    const response = await api.post<ApiResponse<BatchConfirmResult>>(
      '/api/media/confirm-batch',
      {
        event_id: input.eventId,
        ...(input.uploader ? { uploader: input.uploader } : {}),
        photos: input.photos,
      },
    )

    return unwrapResponse(response)
  } catch (error) {
    throw normalizeUploadError(error)
  }
}

export async function confirmPhotoUpload(input: {
  eventId: string
  storageKey: string
  uploader?: string
  blurHash?: string
}): Promise<unknown> {
  try {
    const response = await api.post('/api/media/confirm', {
      event_id: input.eventId,
      storage_key: input.storageKey,
      ...(input.uploader ? { uploader: input.uploader } : {}),
      ...(input.blurHash ? { blur_hash: input.blurHash } : {}),
    })

    return unwrapResponse(response)
  } catch (error) {
    throw normalizeUploadError(error)
  }
}

export async function uploadPhoto(
  file: File,
  input: {
    eventId: string
    uploader?: string
  },
): Promise<unknown> {
  validateUploadFile(file)

  const presign = await requestPresignedUpload(file)
  await uploadToR2(file, presign)

  return confirmPhotoUpload({
    eventId: input.eventId,
    storageKey: presign.key,
    uploader: input.uploader,
  })
}
