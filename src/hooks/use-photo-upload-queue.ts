
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { photoService } from '@/services/photo.service'
import {
  confirmPhotosBatch,
  requestPresignedUpload,
  uploadToR2,
  validateUploadFile,
  normalizeUploadError,
} from '@/services/upload'

export type UploadItemStatus =
  | 'pending'
  | 'requesting_url'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'error'

export interface UploadItem {
  id: string
  file: File
  previewUrl: string
  status: UploadItemStatus
  progress: number
  storageKey?: string
  error?: string
  thumbnailPending?: boolean
}

export interface UsePhotoUploadQueueOptions {
  eventId: string
  uploader?: string
  onCompleted?: () => void
  pollIntervalMs?: number
  pollTimeoutMs?: number
  concurrency?: number
}

export interface PhotoUploadQueue {
  items: UploadItem[]
  addFiles: (files: File[]) => void
  retry: (id: string) => void
}

const DEFAULT_POLL_INTERVAL_MS = 2_000
const DEFAULT_POLL_TIMEOUT_MS = 60_000
const DEFAULT_CONCURRENCY = 3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown): string {
  return normalizeUploadError(error).message
}

export function usePhotoUploadQueue({
  eventId,
  uploader,
  onCompleted,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  pollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  concurrency = DEFAULT_CONCURRENCY,
}: UsePhotoUploadQueueOptions): PhotoUploadQueue {
  const [items, setItems] = useState<UploadItem[]>([])

  const itemsRef = useRef<UploadItem[]>([])
  const queueRef = useRef<string[]>([])
  const runningRef = useRef(0)
  const confirmInFlightRef = useRef(false)
  const confirmedKeysRef = useRef(new Set<string>())
  const itemCounterRef = useRef(0)
  const activeRef = useRef(true)
  const onCompletedRef = useRef(onCompleted)

  useEffect(() => {
    onCompletedRef.current = onCompleted
  }, [onCompleted])

  const patchItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      if (!activeRef.current) return

      itemsRef.current = itemsRef.current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      )

      setItems(itemsRef.current)
    },
    [],
  )

  const finishItem = useCallback(
    (storageKey: string, thumbnailPending: boolean) => {
      const item = itemsRef.current.find(
        (candidate) => candidate.storageKey === storageKey,
      )

      if (!item) return

      patchItem(item.id, {
        status: 'done',
        progress: 1,
        thumbnailPending,
        error: undefined,
      })
    },
    [patchItem],
  )

  const pollProcessing = useCallback(
    async (storageKeys: string[]) => {
      const pending = new Set(storageKeys.filter(Boolean))

      if (pending.size === 0) return

      const deadline = Date.now() + pollTimeoutMs

      while (pending.size > 0 && activeRef.current) {
        try {
          const page = await photoService.getEventPhotos({
            eventId,
            limit: 100,
          })

          for (const photo of page.items) {
            if (pending.has(photo.storage_key) && photo.thumbnail_url) {
              pending.delete(photo.storage_key)
              finishItem(photo.storage_key, false)
            }
          }
        } catch {
          // Gangguan polling tidak membatalkan upload yang sudah tersimpan.
        }

        if (pending.size === 0 || Date.now() >= deadline) break

        await sleep(pollIntervalMs)
      }

      for (const storageKey of pending) {
        finishItem(storageKey, true)
      }

      onCompletedRef.current?.()
    },
    [eventId, finishItem, pollIntervalMs, pollTimeoutMs],
  )

  const runBatchConfirm = useCallback(async () => {
    if (confirmInFlightRef.current || !activeRef.current) return

    const current = itemsRef.current

    const stillWorking = current.some(
      (item) =>
        item.status === 'pending' ||
        item.status === 'requesting_url' ||
        (item.status === 'uploading' && item.progress < 1),
    )

    if (stillWorking) return

    const ready = current.filter(
      (item) =>
        item.status === 'uploading' &&
        item.progress === 1 &&
        item.storageKey &&
        !confirmedKeysRef.current.has(item.storageKey),
    )

    if (ready.length === 0) return

    confirmInFlightRef.current = true

    for (const item of ready) {
      confirmedKeysRef.current.add(item.storageKey as string)
      patchItem(item.id, { status: 'processing' })
    }

    try {
      const result = await confirmPhotosBatch({
        eventId,
        ...(uploader ? { uploader } : {}),
        photos: ready.map((item) => ({
          storage_key: item.storageKey as string,
        })),
      })

      if (!activeRef.current) return

      for (const failure of result.failed) {
        confirmedKeysRef.current.delete(failure.storage_key)

        const target = itemsRef.current.find(
          (item) => item.storageKey === failure.storage_key,
        )

        if (target) {
          patchItem(target.id, {
            status: 'error',
            error: failure.message,
          })

          toast.error(`Gagal menyimpan ${target.file.name}`, {
            description: failure.message,
          })
        }
      }

      const completedKeys = result.items
        .filter((photo) => Boolean(photo.thumbnail_url))
        .map((photo) => photo.storage_key)

      for (const storageKey of completedKeys) {
        finishItem(storageKey, false)
      }

      const waitingKeys = result.items
        .filter((photo) => !photo.thumbnail_url)
        .map((photo) => photo.storage_key)

      if (waitingKeys.length > 0) {
        await pollProcessing(waitingKeys)
      } else {
        onCompletedRef.current?.()
      }
    } catch (error) {
      if (!activeRef.current) return

      const message = getErrorMessage(error)

      for (const item of ready) {
        confirmedKeysRef.current.delete(item.storageKey as string)

        patchItem(item.id, {
          status: 'error',
          error: message,
        })
      }

      toast.error('Gagal menyimpan foto ke server', {
        description: message,
      })
    } finally {
      confirmInFlightRef.current = false
    }
  }, [eventId, finishItem, patchItem, pollProcessing, uploader])

  const processItem = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((candidate) => candidate.id === id)

      if (!item) return

      try {
        patchItem(id, {
          status: 'requesting_url',
          progress: 0,
          error: undefined,
          thumbnailPending: false,
        })

        const presign = await requestPresignedUpload(item.file)

        if (!activeRef.current) return

        patchItem(id, {
          status: 'uploading',
          storageKey: presign.key,
          progress: 0,
        })

        await uploadToR2(item.file, presign, (fraction) => {
          patchItem(id, { progress: fraction })
        })

        if (!activeRef.current) return

        patchItem(id, { progress: 1 })
      } catch (error) {
        if (!activeRef.current) return

        const message = getErrorMessage(error)

        patchItem(id, {
          status: 'error',
          error: message,
        })

        toast.error(`Gagal mengunggah ${item.file.name}`, {
          description: message,
        })
      }
    },
    [patchItem],
  )

  const pump = useCallback(
    function pumpQueue() {
      while (
        runningRef.current < concurrency &&
        queueRef.current.length > 0
      ) {
        const id = queueRef.current.shift()

        if (!id) return

        runningRef.current += 1

        void processItem(id).finally(() => {
          runningRef.current -= 1
          pumpQueue()
          void runBatchConfirm()
        })
      }
    },
    [concurrency, processItem, runBatchConfirm],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return

      const validFiles: File[] = []

      for (const file of files) {
        try {
          validateUploadFile(file)
          validFiles.push(file)
        } catch (error) {
          toast.error('File tidak dapat ditambahkan', {
            description: getErrorMessage(error),
          })
        }
      }

      if (validFiles.length === 0) return

      const created: UploadItem[] = validFiles.map((file) => {
        itemCounterRef.current += 1

        return {
          id: `upload-${itemCounterRef.current}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          progress: 0,
        }
      })

      itemsRef.current = [...itemsRef.current, ...created]
      setItems(itemsRef.current)

      queueRef.current.push(...created.map((item) => item.id))
      pump()
    },
    [pump],
  )

  const retry = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((candidate) => candidate.id === id)

      if (!item || item.status !== 'error') return

      try {
        validateUploadFile(item.file)
      } catch (error) {
        toast.error('File tidak dapat diunggah', {
          description: getErrorMessage(error),
        })
        return
      }

      if (item.storageKey) {
        confirmedKeysRef.current.delete(item.storageKey)
      }

      patchItem(id, {
        status: 'pending',
        progress: 0,
        error: undefined,
        storageKey: undefined,
        thumbnailPending: false,
      })

      queueRef.current.push(id)
      pump()
    },
    [patchItem, pump],
  )

  useEffect(() => {
    activeRef.current = true

    return () => {
      activeRef.current = false

      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [])

  return {
    items,
    addFiles,
    retry,
  }
}
