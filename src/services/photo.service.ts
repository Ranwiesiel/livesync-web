
import { api } from "@/services/api";
import type { ApiResponse, Photo } from "@/types/photo";

export const photoService = {
  async getEventPhotos(eventId: string): Promise<Photo[]> {
    const response = await api.get<ApiResponse<Photo[]>>(
      `/api/media/events/${encodeURIComponent(eventId)}/photos`
    );

    return response.data.data;
  },
};
