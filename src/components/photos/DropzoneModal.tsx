
import { useCallback, useEffect, useRef } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { toast } from 'sonner'
import { Check, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  usePhotoUploadQueue,
  type UploadItem,
} from '@/hooks/use-photo-upload-queue'
import { cn } from '@/lib/utils'

interface DropzoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  uploader?: string
  onCompleted?: () => void
}

const ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

const MAX_FILES = 50

const ACTIVE_STATUSES = new Set<UploadItem['status']>([
  'pending',
  'requesting_url',
  'uploading',
  'processing',
])

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(item: UploadItem): string {
  switch (item.status) {
    case 'pending':
      return 'Menunggu'
    case 'requesting_url':
      return 'Menyiapkan URL'
    case 'uploading':
      return `${Math.round(item.progress * 100)}%`
    case 'processing':
      return 'Memproses thumbnail'
    case 'done':
      return item.thumbnailPending
        ? 'Selesai (thumbnail menyusul)'
        : 'Selesai'
    case 'error':
      return 'Gagal'
  }
}

function rejectionMessage(rejection: FileRejection): string {
  const errorCode = rejection.errors[0]?.code

  switch (errorCode) {
    case 'file-too-large':
      return `File "${rejection.file.name}" melebihi batas maksimal 20 MB.`
    case 'file-invalid-type':
      return `Format file "${rejection.file.name}" tidak didukung. Gunakan JPG, PNG, atau WEBP.`
    case 'too-many-files':
      return `Maksimal ${MAX_FILES} file dalam satu batch.`
    default:
      return `File "${rejection.file.name}" tidak dapat ditambahkan.`
  }
}

export default function DropzoneModal({
  open,
  onOpenChange,
  eventId,
  uploader,
  onCompleted,
}: DropzoneModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  const { items, addFiles, retry } = usePhotoUploadQueue({
    eventId,
    uploader,
    onCompleted,
  })

  const busy = items.some((item) => ACTIVE_STATUSES.has(item.status))
  const finished = items.filter((item) => item.status === 'done').length

  const requestClose = useCallback(() => {
    if (busy) return
    onOpenChange(false)
  }, [busy, onOpenChange])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose()
    }

    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    dialogRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, requestClose])

  const handleDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const messages = rejected.map(rejectionMessage)

        toast.error(`${rejected.length} file ditolak`, {
          description: messages.join('\n'),
          duration: 5000,
        })
      }

      if (accepted.length > 0) {
        addFiles(accepted)
      }
    },
    [addFiles],
  )

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPT,
    maxSize: 20 * 1024 * 1024,
    maxFiles: MAX_FILES,
    multiple: true,
    disabled: busy,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={requestClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dropzone-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[90svh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-xl outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 id="dropzone-title" className="text-lg font-semibold">
              Unggah banyak foto
            </h2>

            <p className="text-sm text-muted-foreground">
              Tarik file ke area di bawah atau klik untuk memilih.
              Maksimal 50 file per batch, 20 MB per file.
            </p>
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Tutup modal"
            disabled={busy}
            onClick={requestClose}
          >
            <X />
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div
            {...getRootProps()}
            data-testid="dropzone"
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors',
              busy && 'cursor-not-allowed opacity-50',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'bg-muted/30 hover:bg-muted/50',
            )}
          >
            <input {...getInputProps()} />

            <ImagePlus className="size-8 text-muted-foreground" />

            <p className="text-sm font-medium">
              {isDragActive ? 'Lepaskan file di sini' : 'Tarik & lepas foto'}
            </p>

            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP · Maksimal 20 MB per file
            </p>
          </div>

          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-md border object-cover"
                  />

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {item.file.name}
                      </p>

                      <span
                        className={cn(
                          'shrink-0 text-xs',
                          item.status === 'error'
                            ? 'text-destructive'
                            : 'text-muted-foreground',
                        )}
                      >
                        {statusLabel(item)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatSize(item.file.size)}
                      {item.status === 'done' ? ' · tersimpan' : ''}
                    </p>

                    {item.status === 'uploading' && (
                      <div
                        role="progressbar"
                        aria-label={`Progress ${item.file.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                      >
                        <div
                          className="h-full bg-primary transition-[width] duration-150"
                          style={{
                            width: `${Math.round(item.progress * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {item.status === 'done' && (
                    <Check
                      className="size-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                  )}

                  {item.status === 'error' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => retry(item.id)}
                    >
                      <RotateCcw />
                      Coba lagi
                    </Button>
                  )}

                  {ACTIVE_STATUSES.has(item.status) && (
                    <Loader2
                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-5">
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? 'Belum ada file dipilih.'
              : `${finished} dari ${items.length} selesai`}
            {busy ? ' · jangan tutup halaman ini' : ''}
          </p>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={requestClose}
          >
            Tutup
          </Button>
        </footer>
      </div>
    </div>
  )
}
