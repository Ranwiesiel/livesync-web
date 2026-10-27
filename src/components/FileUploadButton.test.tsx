import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/upload', () => ({
  uploadPhoto: vi.fn(),
  requestPresignedUpload: vi.fn(),
  uploadToR2: vi.fn(),
}))

import FileUploadButton from './FileUploadButton'
import { uploadPhoto } from '@/services/upload'
import type { Photo } from '@/types/photo'

const photo: Photo = {
  id: '66f1c0ffee00000000000001',
  event_id: '66f1c0ffee00000000000002',
  storage_key: 'uploads/2026/10/22/abc-foto.png',
  url: 'https://cdn.example.com/uploads/a.png',
  blur_hash: '',
  uploader: 'Peserta',
  created_at: '2026-10-22T10:00:00Z',
}

function renderButton(overrides: Partial<Parameters<typeof FileUploadButton>[0]> = {}) {
  const onUploaded = vi.fn()

  const view = render(
    <FileUploadButton
      eventId="66f1c0ffee00000000000002"
      uploader="Peserta"
      onUploaded={onUploaded}
      {...overrides}
    />,
  )

  const input = view.container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement

  return { ...view, input, onUploaded }
}

describe('FileUploadButton', () => {
  beforeEach(() => {
    vi.mocked(uploadPhoto).mockReset()
  })

  it('mengunggah ke event terpilih lalu memanggil onUploaded', async () => {
    vi.mocked(uploadPhoto).mockResolvedValue(photo)

    const { input, onUploaded } = renderButton()
    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    await userEvent.upload(input, file)

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(photo))
    expect(uploadPhoto).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        eventId: photo.event_id,
        uploader: 'Peserta',
      }),
    )
    expect(await screen.findByText('Upload berhasil.')).toBeInTheDocument()
  })

  it('menampilkan pesan gagal dan tidak memanggil onUploaded', async () => {
    vi.mocked(uploadPhoto).mockRejectedValue(
      new Error('Gagal menyimpan foto ke event.'),
    )

    const { input, onUploaded } = renderButton()
    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    await userEvent.upload(input, file)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Gagal menyimpan foto ke event.',
    )
    expect(onUploaded).not.toHaveBeenCalled()
  })
})
