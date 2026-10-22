import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/upload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/upload')>()
  return {
    ...actual,
    requestPresignedUpload: vi.fn(),
    uploadToR2: vi.fn(),
  }
})

import FileUploadButton from './FileUploadButton'
import {
  requestPresignedUpload,
  uploadToR2,
  UploadError,
  type PresignedUpload,
} from '../services/upload'

const presign: PresignedUpload = {
  upload_url: 'https://r2.example.com/livesync-dev/uploads/a.png?sig=abc',
  method: 'PUT',
  key: 'uploads/2026/10/22/abc-foto.png',
  content_type: 'image/png',
  expires_in: 900,
  expires_at: '2026-10-22T10:11:29Z',
}

function foto() {
  return new File(['x'], 'foto.png', { type: 'image/png' })
}

async function pilihFile(file: File, applyAccept = true) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await userEvent.upload(input, file, { applyAccept })
}

describe('FileUploadButton', () => {
  beforeEach(() => {
    vi.mocked(requestPresignedUpload).mockReset()
    vi.mocked(uploadToR2).mockReset()
  })

  it('langsung meminta presign dan mengunggah file yang dipilih', async () => {
    vi.mocked(requestPresignedUpload).mockResolvedValue(presign)
    vi.mocked(uploadToR2).mockResolvedValue(undefined)

    render(<FileUploadButton />)
    await pilihFile(foto())

    await screen.findByText(presign.key)

    expect(requestPresignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'foto.png' }),
    )
    expect(uploadToR2).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'foto.png' }),
      presign,
      expect.any(Function),
    )
    expect(screen.getByText(/berhasil/i)).toBeInTheDocument()
  })

  it('menampilkan persentase selama upload berjalan', async () => {
    let selesai: () => void = () => {}
    vi.mocked(requestPresignedUpload).mockResolvedValue(presign)
    vi.mocked(uploadToR2).mockImplementation(
      (_file, _presign, onProgress) =>
        new Promise<void>((resolve) => {
          onProgress?.(0.42)
          selesai = resolve
        }),
    )

    render(<FileUploadButton />)
    await pilihFile(foto())

    await screen.findByText('42%')
    selesai()
    await waitFor(() =>
      expect(screen.getByText(/berhasil/i)).toBeInTheDocument(),
    )
  })

  it('menampilkan pesan error dan tidak mengunggah saat presign ditolak', async () => {
    vi.mocked(requestPresignedUpload).mockRejectedValue(
      new UploadError('Format file tidak didukung.'),
    )

    render(<FileUploadButton />)
    await pilihFile(
      new File(['x'], 'dokumen.pdf', { type: 'application/pdf' }),
      false,
    )

    await screen.findByText('Format file tidak didukung.')
    expect(uploadToR2).not.toHaveBeenCalled()
  })

  it('bisa memilih file lagi setelah error', async () => {
    vi.mocked(requestPresignedUpload)
      .mockRejectedValueOnce(new UploadError('Gagal membuat URL upload.'))
      .mockResolvedValueOnce(presign)
    vi.mocked(uploadToR2).mockResolvedValue(undefined)

    render(<FileUploadButton />)
    await pilihFile(foto())
    await screen.findByText('Gagal membuat URL upload.')

    await pilihFile(foto())
    await screen.findByText(presign.key)

    expect(requestPresignedUpload).toHaveBeenCalledTimes(2)
  })
})
