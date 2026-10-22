import FileUploadButton from '@/components/FileUploadButton'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            LiveSync Gallery
          </p>
          <CardTitle className="text-2xl">Upload foto ke galeri</CardTitle>
          <CardDescription>
            File dikirim langsung ke Cloudflare R2 lewat presigned URL. Server
            hanya menandatangani URL, isi file tidak melewati API.
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

export default App
