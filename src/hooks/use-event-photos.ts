
import { useQuery } from "@tanstack/react-query";
import { photoService } from "@/services/photo.service";

export function useEventPhotos(eventId: string) {
  return useQuery({
    queryKey: ["event-photos", eventId],
    queryFn: () => photoService.getEventPhotos(eventId),
    enabled: Boolean(eventId),
    // URL foto ditandatangani dan berlaku 24 jam. Menandatangani ulang saat
    // jendela kembali fokus hanya memecah cache gambar di browser.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
