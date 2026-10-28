
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import { api } from "@/services/api";
import type { ApiResponse, Event } from "@/types/event";

import { Button } from "@/components/ui/button";
import EventFeedback from "@/components/event/EventFeedback";
import EventResultCard from "@/components/event/EventResultCard";
import FileUploadButton from "@/components/FileUploadButton";
import PhotoGallery from "@/components/photos/PhotoGallery";

export default function EventDetailPage() {
  const { code = "" } = useParams<{ code: string }>();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: ["event", code],
    queryFn: async (): Promise<Event> => {
      const response = await api.get<ApiResponse<Event>>(
        `/api/events/${encodeURIComponent(code)}`
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message ?? "Event tidak ditemukan."
        );
      }

      return response.data.data;
    },
    enabled: /^\d{6}$/.test(code),
    retry: false,
  });

  async function handlePhotoUploaded() {
    if (!event) return;

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["photos", event.id],
      }),
      queryClient.invalidateQueries({
        queryKey: ["event-photos", event.id],
      }),
    ]);
  }

  const event = eventQuery.data;

  if (!/^\d{6}$/.test(code)) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p>Kode event tidak valid.</p>
        <Button asChild className="mt-4">
          <Link to="/events/join">Kembali ke halaman join</Link>
        </Button>
      </main>
    );
  }

  if (eventQuery.isPending) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" />
      </main>
    );
  }

  if (eventQuery.isError || !event) {
    const message = axios.isAxiosError<ApiResponse<never>>(
      eventQuery.error
    )
      ? eventQuery.error.response?.data?.error?.message ??
        "Gagal memuat event."
      : eventQuery.error instanceof Error
        ? eventQuery.error.message
        : "Event tidak ditemukan.";

    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <p className="text-sm text-destructive">{message}</p>
        <Button asChild variant="outline">
          <Link to="/events/join">Kembali ke halaman join</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 py-8 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            LIVESYNC · EVENT
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {event.title}
          </h1>
        </div>

        <Button asChild variant="outline">
          <Link to="/events/join">Gabung event lain</Link>
        </Button>
      </header>

      <EventResultCard
        title="Informasi event"
        description="Informasi event berdasarkan PIN yang digunakan."
      >
        <div className="space-y-4">
          <div className="room-code">
            <span className="room-code__label">KODE ROOM</span>
            <strong className="room-code__value">{event.code}</strong>
          </div>

          {event.is_active ? (
            <EventFeedback type="success">
              Event aktif dan tersedia.
            </EventFeedback>
          ) : (
            <EventFeedback type="info">
              Event ini sedang tidak aktif. Foto yang sudah tersedia
              masih dapat dilihat.
            </EventFeedback>
          )}
        </div>
      </EventResultCard>

      {event.is_active && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Unggah foto</h2>
            <p className="text-sm text-muted-foreground">
              Bagikan foto ke galeri event ini.
            </p>
          </div>

          <FileUploadButton
            key={event.id}
            eventId={event.id}
            uploader="Peserta"
            onUploaded={handlePhotoUploaded}
          />
        </section>
      )}

      <PhotoGallery
        eventId={event.id}
        title="Galeri foto"
        emptyMessage="Belum ada foto yang diunggah ke event ini."
        columns={4}
      />
    </main>
  );
}
