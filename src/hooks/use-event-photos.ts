import { useInfiniteQuery } from "@tanstack/react-query";
import { photoService } from "@/services/photo.service";

interface UseEventPhotosOptions {
  eventId: string;
  limit?: number;
}

export function useEventPhotos({
  eventId,
  limit = 20,
}: UseEventPhotosOptions) {
  return useInfiniteQuery({
    queryKey: ["event-photos", eventId, limit],

    initialPageParam: undefined as string | undefined,

    queryFn: ({ pageParam }) =>
      photoService.getEventPhotos({
        eventId,
        cursor: pageParam,
        limit,
      }),

    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,

    enabled: Boolean(eventId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}