import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios', () => ({
  default: {
    put: vi.fn(),
    isAxiosError: (error: unknown) =>
      Boolean((error as { isAxiosError?: boolean } | null)?.isAxiosError),
  },
}))

vi.mock('./api', () => ({
  api: { post: vi.fn() },
}))

import { api } from './api'
import {
  requestPresignedUpload,
  uploadToR2,
  UploadError,
  type PresignedUpload,
} from './upload'

const presign: PresignedUpload = {
  upload_url: 'https://r2.example.com/livesync-dev/uploads/a.png?X-Amz-Signature=abc',
  method: 'PUT',
  key: 'uploads/2026/10/22/abc-foto.png',
  content_type: 'image/png',
  expires_in: 900,
  expires_at: '2026-10-22T10:11:29Z',
}

function mockPost(payload: unknown) {
  vi.mocked(api.post).mockResolvedValue({
    data: payload,
  } as unknown as Awaited<ReturnType<typeof api.post>>)
}

describe('requestPresignedUpload', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
    vi.mocked(axios.put).mockReset()
  })

  it('mengirim filename dan content_type lalu mengembalikan data presign', async () => {
    mockPost({ success: true, data: presign, error: null })

    const file = new File(['x'], 'Foto Pantai.png', { type: 'image/png' })
    const result = await requestPresignedUpload(file)

    expect(result).toEqual(presign)
    expect(api.post).toHaveBeenCalledWith('/api/media/presign-upload', {
      filename: 'Foto Pantai.png',
      content_type: 'image/png',
    })
  })

  it('menolak tipe file yang tidak didukung tanpa memanggil API', async () => {
    const file = new File(['x'], 'dokumen.pdf', { type: 'application/pdf' })

    await expect(requestPresignedUpload(file)).rejects.toBeInstanceOf(UploadError)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('menebak content_type dari ekstensi saat file.type kosong', async () => {
    mockPost({ success: true, data: presign, error: null })

    const file = new File(['x'], 'IMG_0042.HEIC', { type: '' })
    await requestPresignedUpload(file)

    expect(api.post).toHaveBeenCalledWith('/api/media/presign-upload', {
      filename: 'IMG_0042.HEIC',
      content_type: 'image/heic',
    })
  })

  it('melempar pesan dari backend saat presign gagal', async () => {
    mockPost({
      success: false,
      data: null,
      error: { message: 'Tipe file tidak didukung' },
    })

    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    await expect(requestPresignedUpload(file)).rejects.toThrow(
      'Tipe file tidak didukung',
    )
  })
})

describe('uploadToR2', () => {
  beforeEach(() => {
    vi.mocked(axios.put).mockReset()
    vi.mocked(api.post).mockReset()
  })

  it('memakai content_type hasil presign dan mengirim progress', async () => {
    const progress: number[] = []
    vi.mocked(axios.put).mockImplementation(async (_url, _data, config) => {
      config?.onUploadProgress?.({
        loaded: 50,
        total: 100,
        bytes: 50,
        lengthComputable: true,
      })
      return { status: 200 }
    })

    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    await uploadToR2(file, presign, (value) => progress.push(value))

    const [url, body, config] = vi.mocked(axios.put).mock.calls[0]
    expect(url).toBe(presign.upload_url)
    expect(body).toBe(file)
    expect(config?.headers).toEqual({ 'Content-Type': 'image/png' })
    expect(progress).toEqual([0.5])
  })

  it('mengubah penolakan signature R2 menjadi pesan yang bisa dibaca', async () => {
    vi.mocked(axios.put).mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
    })

    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    await expect(uploadToR2(file, presign)).rejects.toThrow(
      'R2 menolak upload (403). Content-Type harus sama persis dengan yang di-presign.',
    )
  })
})
