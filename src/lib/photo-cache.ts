import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { PaginatedPhotos, Photo } from "@/types/photo";

export const EVENT_PHOTOS_QUERY_KEY = "event-photos";

/** Bentuk data infinite query untuk daftar foto event. */
export type EventPhotosData = InfiniteData<PaginatedPhotos>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Mengambil foto dari pesan WebSocket `NEW_PHOTO`.
 * Mengembalikan null untuk pesan tipe lain atau payload yang tidak lengkap.
 */
export function extractNewPhoto(message: unknown): Photo | null {
  if (!isRecord(message) || message.type !== "NEW_PHOTO") return null;

  const payload = message.payload;

  if (!isRecord(payload) || !isRecord(payload.photo)) return null;

  const photo = payload.photo;

  if (typeof photo.id !== "string" || photo.id === "") return null;

  return {
    ...(photo as unknown as Photo),
    event_id:
      typeof photo.event_id === "string" && photo.event_id !== ""
        ? photo.event_id
        : typeof message.event_id === "string"
          ? message.event_id
          : "",
  };
}

/**
 * Menyisipkan foto baru di awal halaman pertama.
 * Foto yang sudah ada tidak diduplikasi — WebSocket bisa mengirim ulang
 * pesan yang sama setelah reconnect.
 */
export function prependPhoto(
  data: EventPhotosData | undefined,
  photo: Photo,
): EventPhotosData | undefined {
  if (!data || data.pages.length === 0) return data;

  const alreadyExists = data.pages.some((page) =>
    page.items.some((item) => item.id === photo.id),
  );

  if (alreadyExists) return data;

  const [firstPage, ...rest] = data.pages;

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        items: [photo, ...firstPage.items],
      },
      ...rest,
    ],
  };
}

/**
 * Menyinkronkan foto baru ke semua cache daftar foto milik event tersebut
 * (setiap limit punya query key sendiri).
 */
export function addPhotoToCache(
  queryClient: QueryClient,
  photo: Photo,
): void {
  if (!photo.event_id) return;

  queryClient.setQueriesData<EventPhotosData>(
    { queryKey: [EVENT_PHOTOS_QUERY_KEY, photo.event_id] },
    (data) => prependPhoto(data, photo),
  );
}
