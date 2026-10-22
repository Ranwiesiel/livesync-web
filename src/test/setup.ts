import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest tidak menjalankan cleanup otomatis seperti Jest, jadi daftarkan manual.
afterEach(() => cleanup())

// jsdom tidak menyediakan object URL; preview gambar butuh ini.
if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: () => 'blob:preview',
  })
}

if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: () => {},
  })
}
