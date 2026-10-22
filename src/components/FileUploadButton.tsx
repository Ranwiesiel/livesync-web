import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import {
  requestPresignedUpload,
  uploadToR2,
  type PresignedUpload,
} from '../services/upload'
import './FileUploadButton.css'

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
    <div className="upload">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="upload__input"
        onChange={pilihFile}
      />

      {preview && (
        <img className="upload__preview" src={preview} alt="Pratinjau file" />
      )}

      {file && (
        <p className="upload__file" title={file.name}>
          {file.name}
        </p>
      )}

      <button
        type="button"
        className="upload__button"
        disabled={sedangUpload}
        onClick={() => inputRef.current?.click()}
      >
        {sedangUpload
          ? 'Mengunggah…'
          : status === 'idle'
            ? 'Pilih foto'
            : 'Pilih foto lain'}
      </button>

      {sedangUpload && (
        <div className="upload__progress-wrap">
          <div
            className="upload__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={persen}
            aria-label="Progress upload"
          >
            <div className="upload__bar" style={{ width: `${persen}%` }} />
          </div>
          <span className="upload__persen">{persen}%</span>
        </div>
      )}

      {status === 'success' && (
        <div className="upload__status upload__status--ok">
          <strong>Upload berhasil.</strong>
          <code>{uploadedKey}</code>
        </div>
      )}

      {status === 'error' && error && (
        <div className="upload__status upload__status--error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

export default FileUploadButton
