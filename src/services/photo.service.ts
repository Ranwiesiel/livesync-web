
import { api } from "@/services/api";
import type { ApiResponse, PaginatedPhotos } from "@/types/photo";

interface GetEventPhotosParams {
  eventId: string;
  cursor?: string;
  limit?: number;
}

export const photoService = {
  async getEventPhotos({
    eventId,
    cursor,
    limit = 20,
  }: GetEventPhotosParams): Promise<PaginatedPhotos> {
    const response = await api.get<ApiResponse<PaginatedPhotos>>(
      `/api/media/events/${encodeURIComponent(eventId)}/photos`,
      {
        params: {
          limit,
          ...(cursor ? { cursor } : {}),
        },
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.error?.message ?? "Gagal mengambil foto event."
      );
    }

    return response.data.data;
  },
};
