import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-blurhash', () => ({
  Blurhash: ({ hash }: { hash: string }) => (
    <div data-testid="blurhash">{hash}</div>
  ),
}))

import OptimizedImage from './OptimizedImage'

const src = 'https://cdn.example.com/thumb.jpg'

describe('OptimizedImage', () => {
  it('menampilkan blurhash dan menyembunyikan gambar sampai selesai dimuat', () => {
    render(<OptimizedImage src={src} blurHash="LKO2xyz" alt="Foto event" />)

    expect(screen.getByTestId('blurhash')).toHaveTextContent('LKO2xyz')

    const image = screen.getByAltText('Foto event')
    expect(image.className).toContain('opacity-0')

    fireEvent.load(image)

    expect(image.className).toContain('opacity-100')
  })

  it('tetap menyembunyikan gambar dan mempertahankan blurhash saat gagal', () => {
    render(<OptimizedImage src={src} blurHash="LKO2xyz" alt="Foto event" />)

    fireEvent.error(screen.getByAltText('Foto event'))

    expect(screen.getByTestId('blurhash')).toBeInTheDocument()
    expect(screen.getByAltText('Foto event').className).toContain('opacity-0')
  })

  it('tidak merender blurhash saat hash kosong', () => {
    render(<OptimizedImage src={src} alt="Foto event" blurHash="" />)

    expect(screen.queryByTestId('blurhash')).not.toBeInTheDocument()
    expect(screen.getByAltText('Foto event')).toBeInTheDocument()
  })

  it('kembali ke kondisi blurhash saat src berganti', () => {
    const { rerender } = render(
      <OptimizedImage src={src} blurHash="LKO2xyz" alt="Foto event" />,
    )

    fireEvent.load(screen.getByAltText('Foto event'))
    expect(screen.getByAltText('Foto event').className).toContain('opacity-100')

    rerender(
      <OptimizedImage
        src="https://cdn.example.com/lain.jpg"
        blurHash="LKO2xyz"
        alt="Foto event"
      />,
    )

    expect(screen.getByAltText('Foto event').className).toContain('opacity-0')
  })
})
