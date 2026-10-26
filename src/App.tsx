
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

import FileUploadButton from '@/components/FileUploadButton'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import CreateEventPage from '@/pages/event/CreateEventPage'
import JoinEventPage from '@/pages/event/JoinEventPage'

function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            LiveSync Gallery
          </p>
          <CardTitle className="text-2xl">
            Upload foto ke galeri
          </CardTitle>
          <CardDescription>
            File dikirim langsung ke Cloudflare R2 lewat presigned URL.
            Server hanya menandatangani URL, isi file tidak melewati API.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FileUploadButton />
        </CardContent>

        <CardFooter className="justify-center border-t pt-6 text-xs text-muted-foreground">
          JPG, PNG, WEBP, GIF, HEIC, HEIF · URL upload berlaku 15 menit
        </CardFooter>
      </Card>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <nav className="flex flex-wrap justify-center gap-4 border-b p-4">
        <Link to="/">Gallery</Link>
        <Link to="/events/create">Buat Event</Link>
        <Link to="/events/join">Gabung Event</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/create" element={<CreateEventPage />} />
        <Route path="/events/join" element={<JoinEventPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
