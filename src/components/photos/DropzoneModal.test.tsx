import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/use-photo-upload-queue', () => ({
  usePhotoUploadQueue: vi.fn(),
}))

const dropzone = vi.hoisted(() => ({ options: null as unknown }))

vi.mock('react-dropzone', () => ({
  useDropzone: (options: unknown) => {
    dropzone.options = options
    return {
      getRootProps: () => ({ 'data-testid': 'dropzone' }),
      getInputProps: () => ({ type: 'file' }),
      isDragActive: false,
      open: vi.fn(),
    }
  },
}))

import DropzoneModal from './DropzoneModal'
import { usePhotoUploadQueue } from '@/hooks/use-photo-upload-queue'
import type { UploadItem } from '@/hooks/use-photo-upload-queue'

function item(overrides: Partial<UploadItem>): UploadItem {
  return {
    id: overrides.id ?? 'upload-1',
    file: new File(['x'], 'foto.png', { type: 'image/png' }),
    previewUrl: 'blob:preview',
    status: 'pending',
    progress: 0,
    ...overrides,
  }
}

function mockQueue(items: UploadItem[], retry = vi.fn()) {
  const addFiles = vi.fn()

  vi.mocked(usePhotoUploadQueue).mockReturnValue({ items, addFiles, retry })

  return { addFiles, retry }
}

describe('DropzoneModal', () => {
  beforeEach(() => {
    vi.mocked(usePhotoUploadQueue).mockReset()
  })

  it('menampilkan status tiap file dan persentase upload', () => {
    mockQueue([
      item({ id: 'a', file: new File(['x'], 'a.png', { type: 'image/png' }) }),
      item({
        id: 'b',
        file: new File(['x'], 'b.png', { type: 'image/png' }),
        status: 'requesting_url',
      }),
      item({
        id: 'c',
        file: new File(['x'], 'c.png', { type: 'image/png' }),
        status: 'uploading',
        progress: 0.42,
      }),
      item({
        id: 'd',
        file: new File(['x'], 'd.png', { type: 'image/png' }),
        status: 'processing',
      }),
      item({
        id: 'e',
        file: new File(['x'], 'e.png', { type: 'image/png' }),
        status: 'done',
        progress: 1,
      }),
    ])

    render(
      <DropzoneModal
        open
        onOpenChange={vi.fn()}
        eventId="66f1c0ffee00000000000002"
      />,
    )

    expect(screen.getByText('Menunggu')).toBeInTheDocument()
    expect(screen.getByText('Menyiapkan URL')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByText('Memproses thumbnail')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: /progress c\.png/i }),
    ).toHaveAttribute('aria-valuenow', '42')
  })

  it('meneruskan file yang dijatuhkan ke antrean', () => {
    const { addFiles } = mockQueue([])

    render(
      <DropzoneModal
        open
        onOpenChange={vi.fn()}
        eventId="66f1c0ffee00000000000002"
      />,
    )

    const options = dropzone.options as {
      onDrop: (files: File[]) => void
    }
    const files = [new File(['x'], 'a.png', { type: 'image/png' })]

    act(() => {
      options.onDrop(files)
    })

    expect(addFiles).toHaveBeenCalledWith(files)
  })

  it('menampilkan error dan tombol coba lagi per file', async () => {
    const { retry } = mockQueue([
      item({
        id: 'gagal',
        status: 'error',
        error: 'R2 menolak upload (403).',
      }),
    ])

    render(
      <DropzoneModal
        open
        onOpenChange={vi.fn()}
        eventId="66f1c0ffee00000000000002"
      />,
    )

    expect(screen.getByText('R2 menolak upload (403).')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /coba lagi/i }))

    expect(retry).toHaveBeenCalledWith('gagal')
  })

  it('menonaktifkan tombol tutup selama masih ada upload berjalan', () => {
    mockQueue([
      item({ id: 'jalan', status: 'uploading', progress: 0.2 }),
    ])

    render(
      <DropzoneModal
        open
        onOpenChange={vi.fn()}
        eventId="66f1c0ffee00000000000002"
      />,
    )

    expect(screen.getByRole('button', { name: /^tutup$/i })).toBeDisabled()
  })

  it('menutup modal lewat tombol tutup saat semua file selesai', async () => {
    const onOpenChange = vi.fn()
    mockQueue([item({ id: 'selesai', status: 'done', progress: 1 })])

    render(
      <DropzoneModal
        open
        onOpenChange={onOpenChange}
        eventId="66f1c0ffee00000000000002"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /^tutup$/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('meneruskan onCompleted ke hook antrean', () => {
    const onCompleted = vi.fn()
    mockQueue([])

    render(
      <DropzoneModal
        open
        onOpenChange={vi.fn()}
        eventId="66f1c0ffee00000000000002"
        onCompleted={onCompleted}
      />,
    )

    expect(usePhotoUploadQueue).toHaveBeenCalledWith(
      expect.objectContaining({ onCompleted }),
    )
  })
})
