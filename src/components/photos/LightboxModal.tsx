
import { useCallback, useEffect, useState } from "react";
import type { Photo } from "@/types/photo";

interface LightboxModalProps {
  photos: Photo[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

function getFileExtension(contentType: string, imageUrl: string): string {
  const mime = contentType.split(";")[0].trim().toLowerCase();

  const mimeExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/tiff": "tiff",
  };

  if (mimeExtensions[mime]) {
    return mimeExtensions[mime];
  }

  // Fallback: ambil ekstensi dari path URL, tanpa query string.
  try {
    const pathname = new URL(imageUrl).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);

    if (match) {
      return match[1].toLowerCase();
    }
  } catch {
    // Gunakan ekstensi default jika URL tidak dapat dianalisis.
  }

  return "jpg";
}

export default function LightboxModal({
  photos,
  initialIndex,
  isOpen,
  onClose,
}: LightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const goPrevious = useCallback(() => {
    setCurrentIndex((index) =>
      index > 0 ? index - 1 : photos.length - 1,
    );
    setDownloadError(null);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((index) =>
      index < photos.length - 1 ? index + 1 : 0,
    );
    setDownloadError(null);
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      // Jangan mengganggu shortcut ketika pengguna mengetik di input.
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName))
      ) {
        return;
      }

      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, goPrevious, goNext]);

  const downloadOriginal = useCallback(async () => {
    const photo = photos[currentIndex];

    if (!photo || isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);

    let objectUrl: string | null = null;

    try {
      // Ambil gambar asli dari URL R2 menggunakan CORS.
      // no-store penting: URL yang sama sudah dimuat <img> tanpa crossOrigin,
      // dan entri cache non-CORS itu akan membuat fetch ini gagal.
      const response = await fetch(photo.url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Server mengembalikan HTTP ${response.status}.`,
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Berkas gambar kosong.");
      }

      const contentType =
        response.headers.get("Content-Type") || blob.type || "";

      if (contentType && !contentType.toLowerCase().startsWith("image/")) {
        throw new Error("Respons server bukan berkas gambar.");
      }

      const extension = getFileExtension(contentType, photo.url);
      const fileName = `livesync-${photo.id}.${extension}`;

      // Buat URL lokal agar browser mengunduh Blob, bukan membuka URL R2.
      objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Gagal mengunduh gambar asli:", error);

      setDownloadError(
        error instanceof TypeError
          ? "Gagal mengambil gambar. Periksa koneksi dan konfigurasi CORS R2."
          : error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengunduh gambar.",
      );
    } finally {
      // Beri waktu browser mulai menangani unduhan sebelum melepas URL.
      if (objectUrl) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 60_000);
      }

      setIsDownloading(false);
    }
  }, [photos, currentIndex, isDownloading]);

  if (!isOpen || photos.length === 0) return null;

  const photo = photos[currentIndex];

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm text-white/80">
          Foto {currentIndex + 1} dari {photos.length}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadOriginal()}
            disabled={isDownloading}
            className="rounded-lg border border-white/30 px-3 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? "Mengunduh..." : "Download Original Image"}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup lightbox"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-2xl hover:bg-white/10"
          >
            ×
          </button>
        </div>
      </div>

      {/* Pesan kesalahan unduhan */}
      {downloadError && (
        <div
          role="alert"
          className="mx-4 mb-2 rounded-lg border border-red-400/40 bg-red-950/70 px-4 py-3 text-sm text-red-100 sm:mx-6"
          onClick={(event) => event.stopPropagation()}
        >
          <p>{downloadError}</p>
          <p className="mt-1 text-xs text-red-100/80">
            Jika masalah berlanjut, periksa CORS bucket R2 dan masa berlaku
            URL gambar.
          </p>
        </div>
      )}

      {/* Gambar resolusi penuh */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-14 py-4 sm:px-20"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={goPrevious}
          aria-label="Foto sebelumnya"
          className="absolute left-2 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 sm:left-5 sm:size-12"
        >
          ‹
        </button>

        <img
          key={photo.id}
          src={photo.url}
          alt={`Foto ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain"
          decoding="async"
          fetchPriority="high"
        />

        <button
          type="button"
          onClick={goNext}
          aria-label="Foto berikutnya"
          className="absolute right-2 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20 sm:right-5 sm:size-12"
        >
          ›
        </button>
      </div>
    </div>
  );
}
