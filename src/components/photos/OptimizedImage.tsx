import { useState } from 'react'
import { Blurhash } from 'react-blurhash'

import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  blurHash?: string
  alt: string
  className?: string
  imgClassName?: string
}

/**
 * Gambar dengan placeholder BlurHash.
 *
 * BlurHash dirender lebih dulu (canvas kecil, tanpa request jaringan), lalu
 * gambar asli dimuat di belakangnya dan memudar masuk setelah onLoad.
 */
export default function OptimizedImage({
  src,
  blurHash,
  alt,
  className,
  imgClassName,
}: OptimizedImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  const loaded = loadedSrc === src
  const failed = failedSrc === src
  const visible = loaded && !failed

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {blurHash ? (
        <div className="absolute inset-0" aria-hidden="true">
          <Blurhash hash={blurHash} width="100%" height="100%" />
        </div>
      ) : null}

      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
          visible ? 'opacity-100' : 'opacity-0',
          imgClassName,
        )}
      />
    </div>
  )
}
