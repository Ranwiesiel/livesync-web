
import { useQuery } from "@tanstack/react-query";
import { photoService } from "@/services/photo.service";

export function useEventPhotos(eventId: string) {
  return useQuery({
    queryKey: ["event-photos", eventId],
    queryFn: () => photoService.getEventPhotos(eventId),
    enabled: Boolean(eventId),
  });
}
