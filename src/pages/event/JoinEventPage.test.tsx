import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('@/services/upload', () => ({
  uploadPhoto: vi.fn(),
  requestPresignedUpload: vi.fn(),
  uploadToR2: vi.fn(),
}))

import { api } from '@/services/api'
import { uploadPhoto } from '@/services/upload'
import type { Event } from '@/types/event'
import type { Photo } from '@/types/photo'
import JoinEventPage from './JoinEventPage'

const event: Event = {
  id: '66f1c0ffee00000000000002',
  title: 'Wedding Reception',
  code: '123456',
  created_at: '2026-10-22T09:00:00Z',
  is_active: true,
}

const photo: Photo = {
  id: '66f1c0ffee00000000000001',
  event_id: event.id,
  storage_key: 'uploads/2026/10/22/abc-foto.png',
  url: 'https://cdn.example.com/uploads/abc-foto.png',
  blur_hash: '',
  uploader: 'Peserta',
  created_at: '2026-10-22T10:00:00Z',
}

function envelope<T>(data: T) {
  return { data: { success: true, data, error: null } }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <JoinEventPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('JoinEventPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(uploadPhoto).mockReset()
  })

  it('menampilkan foto event setelah upload baru disimpan', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(envelope(event))
      .mockResolvedValueOnce(envelope([]))
      .mockResolvedValueOnce(envelope([photo]))
    vi.mocked(uploadPhoto).mockResolvedValue(photo)

    const { container } = renderPage()

    await userEvent.type(screen.getByLabelText('PIN event'), event.code)
    await userEvent.click(screen.getByRole('button', { name: 'Cari event' }))

    expect(await screen.findByText('Event ditemukan')).toBeInTheDocument()
    expect(
      await screen.findByText('Belum ada foto yang diunggah ke event ini.'),
    ).toBeInTheDocument()

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const file = new File(['x'], 'foto.png', { type: 'image/png' })

    await userEvent.upload(input, file)

    expect(await screen.findByText('Upload berhasil.')).toBeInTheDocument()
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        `/api/media/events/${event.id}/photos`,
      ),
    )
    expect(await screen.findByAltText('Foto event Foto Event')).toHaveAttribute(
      'src',
      photo.url,
    )
  })
})
