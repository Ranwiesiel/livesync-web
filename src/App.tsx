
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
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
import EventDetailPage from '@/pages/event/EventDetailPage'

function HomePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            LiveSync Gallery
          </p>
          <CardTitle className="text-2xl">
            Bagikan foto ke event
          </CardTitle>
          <CardDescription>
            Buat event baru atau gabung dengan PIN enam digit, lalu unggah
            foto langsung ke Cloudflare R2. Foto yang tersimpan akan muncul
            di galeri event.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link to="/events/create">Buat event</Link>
          </Button>

          <Button asChild variant="outline" className="flex-1">
            <Link to="/events/join">Gabung event</Link>
          </Button>
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
        <Route path="/events/detail/:code" element={<EventDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
