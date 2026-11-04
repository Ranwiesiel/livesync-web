import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Maximize, Minimize } from "lucide-react";
import axios from "axios";

import { api } from "@/services/api";
import { buildJoinUrl } from "@/lib/join-url";
import { useEventPhotos } from "@/hooks/use-event-photos";
import { usePresentationQueue } from "@/hooks/use-presentation-queue";
import type { ApiResponse, Event } from "@/types/event";
import type { Photo } from "@/types/photo";

import { EventWebSocketProvider, useEventWebSocketContext } from "@/contexts/EventWebsocketContext";
import RoomQRCode from "@/components/event/RoomQRCode";
import FloatingReactions from "@/components/projector/FloatingReactions";

function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement),
  );

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));

    document.addEventListener("fullscreenchange", handleChange);

    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();
    } catch {
      // Browser bisa menolak (mis. iframe tanpa izin); biarkan tampilan apa adanya.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggleFullscreen()}
      aria-label={isFullscreen ? "Keluar dari layar penuh" : "Masuk layar penuh"}
      className="flex size-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {isFullscreen ? (
        <Minimize aria-hidden="true" className="size-4" />
      ) : (
        <Maximize aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}

function CrossfadePhoto({ photo }: { photo: Photo }) {
  const [previousSrc, setPreviousSrc] = useState<string | null>(null);
  const currentSrcRef = useRef(photo.url);

  useEffect(() => {
    if (photo.url === currentSrcRef.current) return;

    const previous = currentSrcRef.current;

    currentSrcRef.current = photo.url;
    setPreviousSrc(previous);

    // Lepas lapisan lama setelah animasi crossfade selesai.
    const timer = setTimeout(() => setPreviousSrc(null), 800);

    return () => clearTimeout(timer);
  }, [photo.url]);

  return (
    <div className="absolute inset-0">
      {previousSrc && (
        <img
          src={previousSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}

      <img
        key={photo.url}
        src={photo.url}
        alt={`Foto oleh ${photo.uploader || "Peserta"}`}
        className="absolute inset-0 h-full w-full object-contain animate-[projector-fade_800ms_ease-out]"
      />
    </div>
  );
}

function ProjectorContent({ code }: { code: string }) {
  const { recentPhotoIds } = useEventWebSocketContext();

  const eventQuery = useQuery({
    queryKey: ["event", code],
    queryFn: async (): Promise<Event> => {
      const response = await api.get<ApiResponse<Event>>(
        `/api/events/${encodeURIComponent(code)}`,
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message ?? "Event tidak ditemukan.",
        );
      }

      return response.data.data;
    },
    retry: false,
  });

  const event = eventQuery.data;

  const photosQuery = useEventPhotos({
    eventId: event?.id ?? "",
    limit: 50,
  });

  const photos = useMemo(
    () => photosQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [photosQuery.data],
  );

  const currentPhoto = usePresentationQueue(photos, recentPhotoIds);

  if (eventQuery.isPending) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-neutral-950">
        <div className="size-10 animate-pulse rounded-full bg-white/10" />
      </main>
    );
  }

  if (eventQuery.isError || !event) {
    const message = axios.isAxiosError<ApiResponse<never>>(eventQuery.error)
      ? eventQuery.error.response?.data?.error?.message ?? "Gagal memuat event."
      : eventQuery.error instanceof Error
        ? eventQuery.error.message
        : "Event tidak ditemukan.";

    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-neutral-200">
        <p className="text-sm text-neutral-400">{message}</p>

        <Link
          to="/events/join"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          Kembali ke halaman join
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <header className="z-10 flex shrink-0 items-start justify-between gap-4 px-6 py-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/40">
            Livesync · Mode Proyektor
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">
            {event.title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
            {photos.length} foto
          </span>

          <FullscreenButton />
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {currentPhoto ? (
          <>
            <CrossfadePhoto photo={currentPhoto} />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 bg-gradient-to-t from-black/70 to-transparent px-6 pb-6 pt-16">
              <div className="min-w-0">
                <p className="truncate text-sm text-white/80">
                  {currentPhoto.uploader || "Peserta"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-white/50">
              Menunggu foto pertama masuk ke galeri…
            </p>
            <p className="text-xs text-white/30">
              Pindai QR di pojok kanan bawah untuk mengunggah.
            </p>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-6 right-6 z-20">
        <div className="pointer-events-auto">
          <RoomQRCode
            url={buildJoinUrl(event.code)}
            code={event.code}
            caption="Scan untuk Unggah Foto Anda!"
            size={112}
            className="shadow-2xl"
          />
        </div>
      </div>
      {/* Floating emoji dan confetti dari WebSocket */}
      <FloatingReactions eventId={event.id} />
    </main>
  );
}

export default function ProjectorPage() {
  const { code = "" } = useParams<{ code: string }>();

  if (!/^\d{6}$/.test(code)) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-neutral-200">
        <p className="text-sm text-neutral-400">Kode event tidak valid.</p>

        <Link
          to="/events/join"
          className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          Kembali ke halaman join
        </Link>
      </main>
    );
  }

  return (
    <EventWebSocketProvider eventCode={code}>
      <ProjectorContent code={code} />
    </EventWebSocketProvider>
  );
}
