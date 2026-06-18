import { apiClient } from '../client';

export interface TurfPayload {
  name: string;
  sport_id: string;
  description?: string;
  address?: string;
  city: string;
  state?: string;
  country?: string;
  contact_number?: string;
  turf_email?: string;
  opening_time?: string;
  closing_time?: string;
  capacity: number;
  is_public?: boolean;
}

export interface OwnerTurf {
  id: string;
  name: string;
  sport_id: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  contact_number?: string;
  turf_email?: string;
  opening_time?: string;
  closing_time?: string;
  starting_from_price: number | null;
  capacity: number;
  is_public: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: string;
  turf_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export const ownerTurfsApi = {
  getMyTurfs: async (): Promise<OwnerTurf[]> => {
    const res = await apiClient.get('/turfs/my');
    return res.data;
  },

  createTurf: async (payload: TurfPayload): Promise<OwnerTurf> => {
    const res = await apiClient.post('/turfs', payload);
    return res.data;
  },

  updateTurf: async (id: string, payload: Partial<TurfPayload>): Promise<OwnerTurf> => {
    const res = await apiClient.put(`/turfs/${id}`, payload);
    return res.data;
  },

  deleteTurf: async (id: string): Promise<void> => {
    await apiClient.delete(`/turfs/${id}`);
  },

  getBookingRecords: async (turfId: string): Promise<BookingRecord[]> => {
    const res = await apiClient.get(`/bookings/turf/${turfId}`);
    return res.data;
  },

  savePhotos: async (
    turfId: string,
    photos: Array<{ url: string; is_primary: boolean; sort_order: number }>
  ): Promise<void> => {
    await apiClient.post(`/turfs/${turfId}/photos`, { photos });
  },
};
