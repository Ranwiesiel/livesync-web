import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  requestPresignedUpload,
  uploadToR2,
  type PresignedUpload,
} from '@/services/upload'

type Status = 'idle' | 'uploading' | 'success' | 'error'

const ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
].join(',')

function FileUploadButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef(0)
  const previewRef = useRef<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadedKey, setUploadedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  function gantiPreview(url: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = url
    setPreview(url)
  }

  async function mulaiUpload(target: File) {
    const id = ++uploadRef.current

    setStatus('uploading')
    setProgress(0)
    setUploadedKey(null)
    setError(null)

    try {
      const presign: PresignedUpload = await requestPresignedUpload(target)

      await uploadToR2(target, presign, (fraction) => {
        if (uploadRef.current === id) setProgress(fraction)
      })

      if (uploadRef.current !== id) return

      setProgress(1)
      setUploadedKey(presign.key)
      setStatus('success')
    } catch (cause) {
      if (uploadRef.current !== id) return

      setStatus('error')
      setError(
        cause instanceof Error ? cause.message : 'Upload gagal. Coba lagi.',
      )
    }
  }

  function pilihFile(event: ChangeEvent<HTMLInputElement>) {
    const target = event.target.files?.[0]
    // Reset supaya file yang sama bisa dipilih ulang.
    event.target.value = ''

    if (!target) return

    setFile(target)
    gantiPreview(URL.createObjectURL(target))
    void mulaiUpload(target)
  }

  const persen = Math.round(progress * 100)
  const sedangUpload = status === 'uploading'

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/30 p-6">
      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={pilihFile}
      />

      {preview && (
        <img
          className="max-h-56 w-full max-w-sm rounded-md border bg-background object-contain"
          src={preview}
          alt="Pratinjau file"
        />
      )}

      {file && (
        <p
          className="max-w-full truncate text-sm text-muted-foreground"
          title={file.name}
        >
          {file.name}
        </p>
      )}

      <Button
        type="button"
        disabled={sedangUpload}
        onClick={() => inputRef.current?.click()}
      >
        {sedangUpload ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Upload />
        )}
        {sedangUpload
          ? 'Mengunggah…'
          : status === 'idle'
            ? 'Pilih foto'
            : 'Pilih foto lain'}
      </Button>

      {sedangUpload && (
        <div className="w-full max-w-sm space-y-1.5">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={persen}
            aria-label="Progress upload"
          >
            <div
              className="h-full bg-primary transition-[width] duration-150"
              style={{ width: `${persen}%` }}
            />
          </div>
          <span className="block text-center text-xs text-muted-foreground">
            {persen}%
          </span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-1 text-sm text-emerald-600">
          <strong>Upload berhasil.</strong>
          <code className="max-w-full break-all rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
            {uploadedKey}
          </code>
        </div>
      )}

      {status === 'error' && error && (
        <div role="alert" className="text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}

export default FileUploadButton
