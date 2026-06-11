import { apiClient } from '../client';

export interface TimeSlot {
  id?: string;
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string; // "09:00"
  end_time: string; // "10:00"
  price_per_slot: number;
  slot_duration_minutes: number;
}

export interface Court {
  id?: string;
  turf_id?: string;
  name: string;
  size: string; // e.g. "5-a-side", "7-a-side", "Full Size"
  court_type: string; // e.g. "Grass", "Turf", "Hard Court", "Indoor"
  description: string;
  sort_order: number;
  court_time_slots?: TimeSlot[];
  slots?: TimeSlot[]; // for creation payload
}

export const courtsApi = {
  getCourts: async (turfId: string): Promise<Court[]> => {
    const res = await apiClient.get(`/courts?turf_id=${turfId}`);
    return res.data;
  },
  createCourt: async (court: Court): Promise<Court> => {
    const res = await apiClient.post('/courts', court);
    return res.data;
  },
  updateCourt: async (id: string, court: Partial<Court>): Promise<Court> => {
    const res = await apiClient.put(`/courts/${id}`, court);
    return res.data;
  },
  deleteCourt: async (id: string): Promise<void> => {
    await apiClient.delete(`/courts/${id}`);
  },
};
