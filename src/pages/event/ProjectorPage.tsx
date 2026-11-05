import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Maximize, Minimize } from "lucide-react";
import axios from "axios";

import { api } from "@/services/api";
import { buildJoinUrl } from "@/lib/join-url";
import { releaseImage, TRANSPARENT_PIXEL } from "@/lib/image-memory";
import { cn } from "@/lib/utils";
import { useEventPhotos } from "@/hooks/use-event-photos";
import { usePresentationQueue } from "@/hooks/use-presentation-queue";
import type { WebSocketStatus } from "@/hooks/useEventWebsocket";
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

const CONNECTION_INDICATOR: Record<
  WebSocketStatus,
  { label: string; dotClassName: string; textClassName: string }
> = {
  connected: {
    label: "Connected",
    dotClassName: "bg-emerald-400",
    textClassName: "text-emerald-200",
  },
  connecting: {
    label: "Menghubungkan…",
    dotClassName: "bg-amber-400 animate-pulse",
    textClassName: "text-amber-200",
  },
  reconnecting: {
    label: "Reconnecting…",
    dotClassName: "bg-red-500 animate-pulse",
    textClassName: "text-red-200",
  },
  disconnected: {
    label: "Terputus",
    dotClassName: "bg-red-500",
    textClassName: "text-red-200",
  },
};

/** Indikator kecil agar operator tahu koneksi realtime masih hidup. */
export function ProjectorConnectionStatus({
  status,
  detail,
}: {
  status: WebSocketStatus;
  detail?: string | null;
}) {
  const indicator =
    CONNECTION_INDICATOR[status] ?? CONNECTION_INDICATOR.disconnected;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Status koneksi: ${indicator.label}`}
      title={detail ?? undefined}
      className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px]"
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full", indicator.dotClassName)}
      />
      <span className={cn("font-medium", indicator.textClassName)}>
        {indicator.label}
      </span>
    </div>
  );
}

interface CrossfadeState {
  sources: [string, string];
  active: 0 | 1;
  pending: { index: 0 | 1; src: string } | null;
}

function beginTransition(state: CrossfadeState, src: string): CrossfadeState {
  if (state.sources[state.active] === src) {
    return state.pending ? { ...state, pending: null } : state;
  }

  const index = state.active === 0 ? 1 : 0;
  const sources: [string, string] = [...state.sources];
  sources[index] = src;

  return { sources, active: state.active, pending: { index, src } };
}

function CrossfadePhoto({ photo }: { photo: Photo }) {
  // Thumbnail tampil lebih dulu supaya layar tidak kosong; foto asli
  // di-upgrade setelah selesai di-decode.
  const initialSrc = photo.thumbnail_url || photo.url;
  const [state, setState] = useState<CrossfadeState>({
    sources: [initialSrc, initialSrc],
    active: 0,
    pending: null,
  });
  const [renderedPhotoId, setRenderedPhotoId] = useState(photo.id);
  const layerRefs = useRef<[HTMLImageElement | null, HTMLImageElement | null]>([
    null,
    null,
  ]);

  if (renderedPhotoId !== photo.id) {
    setRenderedPhotoId(photo.id);
    setState((current) => beginTransition(current, initialSrc));
  }

  const attachLayer = useCallback(
    (index: 0 | 1) => (node: HTMLImageElement | null) => {
      if (node) {
        if (node.getAttribute("src") === TRANSPARENT_PIXEL) {
          node.src = node.dataset.src ?? "";
        }
        layerRefs.current[index] = node;
        return;
      }

      releaseImage(layerRefs.current[index]);
      layerRefs.current[index] = null;
    },
    [],
  );

  const attachLayer0 = useMemo(() => attachLayer(0), [attachLayer]);
  const attachLayer1 = useMemo(() => attachLayer(1), [attachLayer]);

  const activate = useCallback((index: 0 | 1, src: string) => {
    const image = layerRefs.current[index];

    if (!image || image.getAttribute("src") !== src) return;
    if (!image.complete || image.naturalWidth === 0) return;

    const decoded =
      typeof image.decode === "function" ? image.decode() : Promise.resolve();

    void decoded
      .catch(() => {})
      .then(() => {
        setState((current) =>
          current.pending?.index === index && current.pending.src === src
            ? { ...current, active: index, pending: null }
            : current,
        );
      });
  }, []);

  const handleLayerLoad = useCallback(
    (index: 0 | 1) => (event: React.SyntheticEvent<HTMLImageElement>) => {
      const src = event.currentTarget.getAttribute("src");
      if (src) activate(index, src);
    },
    [activate],
  );

  const handleLayerError = useCallback(
    (index: 0 | 1) => () => {
      setState((current) =>
        current.pending?.index === index
          ? { ...current, pending: null }
          : current,
      );
    },
    [],
  );

  useEffect(() => {
    const thumbnail = photo.thumbnail_url || photo.url;

    if (!photo.thumbnail_url || photo.url === thumbnail) return;

    const startedAt = performance.now();
    let cancelled = false;
    let upgradeTimer: number | undefined;

    const preload = new Image();
    preload.decoding = "async";
    preload.onload = () => {
      if (cancelled) return;

      // Tunggu crossfade thumbnail selesai dulu, supaya foto asli tidak
      // memotong animasi di tengah jalan (terlihat seperti kedipan).
      const delay = Math.max(0, 800 - (performance.now() - startedAt));

      upgradeTimer = window.setTimeout(() => {
        if (cancelled) return;

        setState((current) => beginTransition(current, photo.url));
      }, delay);
    };
    preload.src = photo.url;

    return () => {
      cancelled = true;
      preload.onload = null;
      if (upgradeTimer !== undefined) window.clearTimeout(upgradeTimer);
    };
  }, [photo.id, photo.url, photo.thumbnail_url]);

  // Target yang sudah ter-cache saat src dipasang bisa tidak memicu onLoad.
  useEffect(() => {
    if (!state.pending) return;
    activate(state.pending.index, state.pending.src);
  }, [state.pending, state.sources, activate]);

  return (
    <div className="absolute inset-0 bg-black">
      {state.sources.map((src, index) => {
        const layer = index as 0 | 1;
        const isActive = state.active === layer;

        return (
          <img
            key={layer}
            ref={layer === 0 ? attachLayer0 : attachLayer1}
            data-src={src}
            data-layer={layer}
            src={src}
            alt={isActive ? `Foto oleh ${photo.uploader || "Peserta"}` : ""}
            aria-hidden={!isActive}
            decoding="async"
            onLoad={layer === 0 ? handleLayerLoad(0) : handleLayerLoad(1)}
            onError={layer === 0 ? handleLayerError(0) : handleLayerError(1)}
            style={{
              opacity: isActive ? 1 : 0,
              transition: "opacity 800ms ease-out",
            }}
            className="absolute inset-0 h-full w-full object-contain"
          />
        );
      })}
    </div>
  );
}

/**
 * Mulai mengunduh foto asli berikutnya satu slide lebih awal. Foto proyektor
 * bisa berukuran beberapa megabyte; tanpa head start, slide sering berganti
 * sebelum foto asli selesai diunduh sehingga yang tampil hanya thumbnail.
 */
function usePrefetchNextPhoto(photos: Photo[], currentPhoto: Photo | null) {
  const prefetchedRef = useRef(new Map<string, HTMLImageElement>());
  const failedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!currentPhoto) return;

    const index = photos.findIndex((photo) => photo.id === currentPhoto.id);

    if (index === -1) return;

    const nextPhoto = photos[(index + 1) % photos.length];

    if (!nextPhoto || nextPhoto.id === currentPhoto.id) return;
    if (!nextPhoto.thumbnail_url || nextPhoto.url === nextPhoto.thumbnail_url) {
      return;
    }
    if (
      prefetchedRef.current.has(nextPhoto.url) ||
      failedRef.current.has(nextPhoto.url)
    ) {
      return;
    }

    const preload = new Image();
    preload.decoding = "async";
    preload.onload = () => prefetchedRef.current.delete(nextPhoto.url);
    preload.onerror = () => {
      failedRef.current.add(nextPhoto.url);
      prefetchedRef.current.delete(nextPhoto.url);
    };
    preload.src = nextPhoto.url;

    // Simpan referensi sampai selesai supaya unduhan tidak dibatalkan GC.
    prefetchedRef.current.set(nextPhoto.url, preload);
  }, [currentPhoto, photos]);

  useEffect(
    () => () => {
      prefetchedRef.current.clear();
    },
    [],
  );
}

function ProjectorContent({ code }: { code: string }) {
  const { recentPhotoIds, status, lastError } = useEventWebSocketContext();

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

  usePrefetchNextPhoto(photos, currentPhoto);

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
          <ProjectorConnectionStatus status={status} detail={lastError} />

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
