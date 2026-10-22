import FileUploadButton from './components/FileUploadButton'
import './App.css'

function App() {
  return (
    <main id="upload-page">
      <section className="upload-panel">
        <p className="eyebrow">LiveSync Gallery</p>
        <h1>Upload foto ke galeri</h1>
        <p className="lede">
          File dikirim langsung ke Cloudflare R2 lewat presigned URL. Server
          hanya menandatangani URL, isi file tidak melewati API.
        </p>

        <FileUploadButton />

        <p className="hint">
          Maksimal 6 format: JPG, PNG, WEBP, GIF, HEIC, HEIF. URL upload berlaku
          15 menit.
        </p>
      </section>
    </main>
  )
}

export default App
