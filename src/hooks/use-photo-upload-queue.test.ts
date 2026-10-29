import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/upload', () => ({
  requestPresignedUpload: vi.fn(),
  uploadToR2: vi.fn(),
  confirmPhotosBatch: vi.fn(),
}))

vi.mock('@/services/photo.service', () => ({
  photoService: { getEventPhotos: vi.fn() },
}))

import { usePhotoUploadQueue } from './use-photo-upload-queue'
import {
  confirmPhotosBatch,
  requestPresignedUpload,
  uploadToR2,
  type PresignedUpload,
} from '@/services/upload'
import { photoService } from '@/services/photo.service'
import type { Photo } from '@/types/photo'

const eventId = '66f1c0ffee00000000000002'

function presignFor(key: string): PresignedUpload {
  return {
    upload_url: `https://r2.example.com/livesync-dev/${key}?sig=abc`,
    method: 'PUT',
    key,
    content_type: 'image/png',
    expires_in: 900,
    expires_at: '2026-10-22T10:11:29Z',
  }
}

function photoFor(key: string, withThumbnail = true): Photo {
  return {
    id: key,
    event_id: eventId,
    storage_key: key,
    url: `https://cdn.example.com/${key}`,
    ...(withThumbnail ? { thumbnail_url: `https://cdn.example.com/${key}?thumb=1` } : {}),
    uploader: 'Peserta',
    created_at: '2026-10-22T10:00:00Z',
  }
}

function fileFor(name: string) {
  return new File(['x'], name, { type: 'image/png' })
}

function gallery(items: Photo[]) {
  return { items, next_cursor: '', has_more: false }
}

describe('usePhotoUploadQueue', () => {
  beforeEach(() => {
    vi.mocked(requestPresignedUpload).mockReset()
    vi.mocked(uploadToR2).mockReset()
    vi.mocked(confirmPhotosBatch).mockReset()
    vi.mocked(photoService.getEventPhotos).mockReset()
  })

  it('menjalankan satu file sampai done lewat presign, PUT, batch confirm, polling', async () => {
    const key = 'uploads/2026/10/29/a.png'
    vi.mocked(requestPresignedUpload).mockResolvedValue(presignFor(key))
    vi.mocked(uploadToR2).mockImplementation(async (_file, _presign, onProgress) => {
      onProgress?.(0.5)
      onProgress?.(1)
    })
    vi.mocked(confirmPhotosBatch).mockResolvedValue({
      items: [photoFor(key)],
      failed: [],
    })
    vi.mocked(photoService.getEventPhotos).mockResolvedValue(
      gallery([photoFor(key)]),
    )

    const { result } = renderHook(() =>
      usePhotoUploadQueue({ eventId, uploader: 'Peserta' }),
    )

    act(() => {
      result.current.addFiles([fileFor('a.png')])
    })

    await waitFor(() =>
      expect(result.current.items[0]?.status).toBe('done'),
    )

    expect(requestPresignedUpload).toHaveBeenCalledTimes(1)
    expect(uploadToR2).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'a.png' }),
      expect.objectContaining({ key }),
      expect.any(Function),
    )
    expect(confirmPhotosBatch).toHaveBeenCalledTimes(1)
    expect(confirmPhotosBatch).toHaveBeenCalledWith({
      eventId,
      uploader: 'Peserta',
      photos: [{ storage_key: key }],
    })
    expect(result.current.items[0]).toMatchObject({
      progress: 1,
      storageKey: key,
      thumbnailPending: false,
    })
  })

  it('mengirim semua file yang berhasil dalam satu batch confirm', async () => {
    const keys = ['uploads/2026/10/29/a.png', 'uploads/2026/10/29/b.png']

    vi.mocked(requestPresignedUpload)
      .mockResolvedValueOnce(presignFor(keys[0]))
      .mockResolvedValueOnce(presignFor(keys[1]))
    vi.mocked(uploadToR2).mockResolvedValue(undefined)
    vi.mocked(confirmPhotosBatch).mockResolvedValue({
      items: keys.map((key) => photoFor(key)),
      failed: [],
    })
    vi.mocked(photoService.getEventPhotos).mockResolvedValue(
      gallery(keys.map((key) => photoFor(key))),
    )

    const { result } = renderHook(() => usePhotoUploadQueue({ eventId }))

    act(() => {
      result.current.addFiles([fileFor('a.png'), fileFor('b.png')])
    })

    await waitFor(() =>
      expect(result.current.items.every((item) => item.status === 'done')).toBe(
        true,
      ),
    )

    expect(confirmPhotosBatch).toHaveBeenCalledTimes(1)
    expect(confirmPhotosBatch).toHaveBeenCalledWith({
      eventId,
      photos: [{ storage_key: keys[0] }, { storage_key: keys[1] }],
    })
  })

  it('menandai file gagal upload sebagai error dan tidak mengonfirmasinya', async () => {
    const key = 'uploads/2026/10/29/ok.png'

    vi.mocked(requestPresignedUpload)
      .mockResolvedValueOnce(presignFor('uploads/2026/10/29/gagal.png'))
      .mockResolvedValueOnce(presignFor(key))
    vi.mocked(uploadToR2)
      .mockRejectedValueOnce(new Error('R2 menolak upload (403).'))
      .mockResolvedValueOnce(undefined)
    vi.mocked(confirmPhotosBatch).mockResolvedValue({
      items: [photoFor(key)],
      failed: [],
    })
    vi.mocked(photoService.getEventPhotos).mockResolvedValue(
      gallery([photoFor(key)]),
    )

    const { result } = renderHook(() => usePhotoUploadQueue({ eventId }))

    act(() => {
      result.current.addFiles([fileFor('gagal.png'), fileFor('ok.png')])
    })

    await waitFor(() =>
      expect(result.current.items.map((item) => item.status)).toEqual([
        'error',
        'done',
      ]),
    )

    expect(result.current.items[0].error).toContain('403')
    expect(confirmPhotosBatch).toHaveBeenCalledWith({
      eventId,
      photos: [{ storage_key: key }],
    })
  })

  it('memakai pesan dari backend saat satu item ditolak batch confirm', async () => {
    const key = 'uploads/2026/10/29/ditolak.png'

    vi.mocked(requestPresignedUpload).mockResolvedValue(presignFor(key))
    vi.mocked(uploadToR2).mockResolvedValue(undefined)
    vi.mocked(confirmPhotosBatch).mockResolvedValue({
      items: [],
      failed: [{ storage_key: key, message: 'storage key tidak valid' }],
    })

    const { result } = renderHook(() => usePhotoUploadQueue({ eventId }))

    act(() => {
      result.current.addFiles([fileFor('ditolak.png')])
    })

    await waitFor(() =>
      expect(result.current.items[0].status).toBe('error'),
    )

    expect(result.current.items[0].error).toBe('storage key tidak valid')
    expect(photoService.getEventPhotos).not.toHaveBeenCalled()
  })

  it('menandai done dengan catatan thumbnail saat polling melewati batas waktu', async () => {
    const key = 'uploads/2026/10/29/lambat.png'

    vi.mocked(requestPresignedUpload).mockResolvedValue(presignFor(key))
    vi.mocked(uploadToR2).mockResolvedValue(undefined)
    vi.mocked(confirmPhotosBatch).mockResolvedValue({
      items: [photoFor(key, false)],
      failed: [],
    })
    vi.mocked(photoService.getEventPhotos).mockResolvedValue(
      gallery([photoFor(key, false)]),
    )

    const { result } = renderHook(() =>
      usePhotoUploadQueue({
        eventId,
        pollIntervalMs: 10,
        pollTimeoutMs: 40,
      }),
    )

    act(() => {
      result.current.addFiles([fileFor('lambat.png')])
    })

    await waitFor(
      () => expect(result.current.items[0].status).toBe('done'),
      { timeout: 2000 },
    )

    expect(result.current.items[0].thumbnailPending).toBe(true)
  })

  it('mengulang file yang gagal lewat retry', async () => {
    const key = 'uploads/2026/10/29/ulang.png'

    vi.mocked(requestPresignedUpload).mockResolvedValue(presignFor(key))
    vi.mocked(uploadToR2)
      .mockRejectedValueOnce(new Error('jaringan putus'))
      .mockResolvedValueOnce(undefined)
    vi.mocked(confirmPhotosBatch).mockResolvedValue({
      items: [photoFor(key)],
      failed: [],
    })
    vi.mocked(photoService.getEventPhotos).mockResolvedValue(
      gallery([photoFor(key)]),
    )

    const { result } = renderHook(() => usePhotoUploadQueue({ eventId }))

    act(() => {
      result.current.addFiles([fileFor('ulang.png')])
    })

    await waitFor(() =>
      expect(result.current.items[0].status).toBe('error'),
    )

    act(() => {
      result.current.retry(result.current.items[0].id)
    })

    await waitFor(() =>
      expect(result.current.items[0].status).toBe('done'),
    )

    expect(requestPresignedUpload).toHaveBeenCalledTimes(2)
    expect(confirmPhotosBatch).toHaveBeenCalledTimes(1)
  })
})
