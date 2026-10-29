import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/use-event-photos', () => ({
  useEventPhotos: vi.fn(),
}))

vi.mock('react-blurhash', () => ({
  Blurhash: ({ hash }: { hash: string }) => <div data-testid="blurhash">{hash}</div>,
}))

import PhotoGallery from './PhotoGallery'
import { useEventPhotos } from '@/hooks/use-event-photos'
import type { Photo } from '@/types/photo'

const photo: Photo = {
  id: '66f1c0ffee00000000000001',
  event_id: '66f1c0ffee00000000000002',
  storage_key: 'uploads/2026/10/29/a.png',
  url: 'https://cdn.example.com/a.png',
  thumbnail_url: 'https://cdn.example.com/thumb-a.jpg',
  blur_hash: 'LKO2xyz',
  uploader: 'Peserta',
  created_at: '2026-10-29T01:00:00Z',
}

function mockPhotos(items: Photo[]) {
  vi.mocked(useEventPhotos).mockReturnValue({
    data: { pages: [{ items, next_cursor: '', has_more: false }] },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    isFetching: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  } as unknown as ReturnType<typeof useEventPhotos>)
}

describe('PhotoGallery', () => {
  it('merender thumbnail lewat OptimizedImage dengan blurhash-nya', () => {
    mockPhotos([photo])

    render(<PhotoGallery eventId={photo.event_id} />)

    const image = screen.getByAltText('Foto event Foto Event')
    expect(image).toHaveAttribute('src', photo.thumbnail_url)
    expect(screen.getByTestId('blurhash')).toHaveTextContent('LKO2xyz')
  })

  it('memakai url asli saat thumbnail belum tersedia', () => {
    mockPhotos([{ ...photo, thumbnail_url: undefined }])

    render(<PhotoGallery eventId={photo.event_id} />)

    expect(screen.getByAltText('Foto event Foto Event')).toHaveAttribute(
      'src',
      photo.url,
    )
  })
})
