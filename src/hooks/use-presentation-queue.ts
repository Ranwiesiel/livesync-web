import { useEffect, useRef, useState } from "react";

import type { Photo } from "@/types/photo";

export const MIN_SLIDE_MS = 5000;
export const MAX_SLIDE_MS = 7000;

interface PresentationQueueOptions {
  /** Durasi minimum satu foto tampil. */
  minDelayMs?: number;
  /** Durasi maksimum satu foto tampil. */
  maxDelayMs?: number;
  /** Sumber angka acak, bisa diganti saat test. */
  random?: () => number;
}

function findIndexById(photos: Photo[], id: string | null): number {
  if (!id) return -1;

  return photos.findIndex((photo) => photo.id === id);
}

/**
 * Antrean tampilan proyektor:
 * - berganti otomatis tiap 5–7 detik secara melingkar,
 * - langsung melompat ke foto terbaru yang masuk lewat WebSocket.
 */
export function usePresentationQueue(
  photos: Photo[],
  newPhotoIds: string[] = [],
  {
    minDelayMs = MIN_SLIDE_MS,
    maxDelayMs = MAX_SLIDE_MS,
    random = Math.random,
  }: PresentationQueueOptions = {},
): Photo | null {
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Foto yang sudah pernah dijadikan target lompatan.
  const handledNewPhotoIdsRef = useRef<Set<string>>(new Set());

  // Fallback ke foto pertama bila foto aktif hilang (mis. setelah refetch).
  const activePhoto =
    photos.find((photo) => photo.id === currentId) ?? photos[0] ?? null;
  const activeId = activePhoto?.id ?? null;

  // Prioritaskan foto terbaru dari WebSocket.
  useEffect(() => {
    const handled = handledNewPhotoIdsRef.current;

    // Cache galeri diperbarui oleh hook WebSocket; tunggu sampai fotonya ada
    // agar pesan yang datang lebih dulu tidak terbuang.
    const unhandled = newPhotoIds.filter(
      (id) => !handled.has(id) && findIndexById(photos, id) !== -1,
    );

    if (unhandled.length === 0) return;

    for (const id of unhandled) handled.add(id);

    setCurrentId(unhandled[unhandled.length - 1]);
  }, [newPhotoIds, photos]);

  // Geser otomatis dengan durasi acak 5–7 detik.
  useEffect(() => {
    if (!activeId || photos.length < 2) return;

    const delay = Math.min(
      Math.max(
        minDelayMs + random() * (maxDelayMs - minDelayMs),
        minDelayMs,
      ),
      maxDelayMs,
    );

    const timer = setTimeout(() => {
      const index = findIndexById(photos, activeId);
      const nextIndex = index === -1 ? 0 : (index + 1) % photos.length;
      const nextPhoto = photos[nextIndex];

      if (nextPhoto) setCurrentId(nextPhoto.id);
    }, delay);

    return () => clearTimeout(timer);
  }, [activeId, photos, minDelayMs, maxDelayMs, random]);

  return activePhoto;
}
