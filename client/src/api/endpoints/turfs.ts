import { apiClient } from '../client';
import { Turf } from '../../types/turf';

export interface TurfPhoto {
  id: string;
  turf_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export const turfsApi = {
  getTurfs: async (): Promise<Turf[]> => {
    const response = await apiClient.get('/turfs');
    return response.data;
  },
  getTurfById: async (turfId: string): Promise<Turf> => {
    const response = await apiClient.get(`/turfs/${turfId}`);
    return response.data;
  },
  getTurfPhotos: async (turfId: string): Promise<TurfPhoto[]> => {
    const response = await apiClient.get(`/turfs/${turfId}/photos`);
    return response.data;
  },
};
