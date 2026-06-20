import { api } from './client';

export interface Turf {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  sport_id: string;
  address: string;
  opening_time: string;
  closing_time: string;
  contact_number: string;
  turf_email: string;
  latitude: number | null;
  longitude: number | null;
  description?: string;
  sports?: { name: string };
}

export interface CourtTimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_per_slot: number;
  slot_duration_minutes: number;
}

export interface Court {
  id: string;
  name: string;
  size: string;
  court_type: string;
  description: string | null;
  sort_order: number;
  court_time_slots?: CourtTimeSlot[];
}

export interface BookingAvailabilitySlot {
  start_time: string;
  end_time: string;
  type: 'online' | 'manual';
}

export interface Slot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_per_slot: number;
}

export interface TurfPhoto {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface TurfSettings {
  turf_id: string;
  advance_payment_enabled: boolean;
  advance_payment_type: 'percentage' | 'fixed' | null;
  advance_payment_value: number | null;
  cancellation_enabled: boolean;
  cancellation_window_hours: number;
  cancellation_refund_percentage: number;
  cancellation_notes: string | null;
  commission_percentage: number;
}

export interface ManualBooking {
  id: string;
  turf_id: string;
  court_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  // Combined view extras
  start_time_iso?: string;
  end_time_iso?: string;
  booking_type?: 'manual' | 'online';
  status?: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  court?: { name: string };
  advance_amount?: number | null;
  remaining_balance?: number | null;
}

export interface ReportSummary {
  total_bookings: number;
  confirmed_bookings: number;
  total_revenue: number;
  online_revenue: number;
  cash_revenue: number;
  pending_amount: number;
  commission_amount: number;
}

export interface ReportBooking {
  id: string;
  turf_id: string;
  turf_name: string;
  court_name: string;
  booking_type: 'online' | 'manual';
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_phone: string | null;
  amount: number;
  payment_status: string;
  status: string;
  advance_amount: number | null;
  remaining_balance: number | null;
  commission_amount: number;
  created_at: string;
}

export interface ReportResponse {
  summary: ReportSummary;
  bookings: ReportBooking[];
  turfs: { id: string; name: string }[];
}

export const adminTurfs = {
  list: async (): Promise<Turf[]> => {
    const { data } = await api.get('/admin-turfs');
    return data.turfs;
  },
  get: async (id: string): Promise<Turf> => {
    const { data } = await api.get(`/admin-turfs/${id}`);
    return data.turf;
  },
  update: async (id: string, payload: Partial<Turf>): Promise<void> => {
    await api.put(`/admin-turfs/${id}`, payload);
  },
  // Photos
  listPhotos: async (turfId: string): Promise<TurfPhoto[]> => {
    const { data } = await api.get(`/admin-turfs/${turfId}/photos`);
    return data.photos;
  },
  addPhoto: async (turfId: string, url: string, is_primary = false): Promise<TurfPhoto> => {
    const { data } = await api.post(`/admin-turfs/${turfId}/photos`, { url, is_primary });
    return data.photo;
  },
  deletePhoto: async (turfId: string, photoId: string): Promise<void> => {
    await api.delete(`/admin-turfs/${turfId}/photos/${photoId}`);
  },
  // Courts
  listCourts: async (turfId: string): Promise<Court[]> => {
    const { data } = await api.get(`/admin-turfs/${turfId}/courts`);
    return data.courts;
  },
  addCourt: async (turfId: string, payload: { name: string; size: string; court_type: string; description?: string }): Promise<Court> => {
    const { data } = await api.post(`/admin-turfs/${turfId}/courts`, payload);
    return data.court;
  },
  updateCourt: async (turfId: string, courtId: string, payload: Partial<Court>): Promise<void> => {
    await api.put(`/admin-turfs/${turfId}/courts/${courtId}`, payload);
  },
  deleteCourt: async (turfId: string, courtId: string): Promise<void> => {
    await api.delete(`/admin-turfs/${turfId}/courts/${courtId}`);
  },
  // Slots
  getSlots: async (turfId: string, courtId: string): Promise<Slot[]> => {
    const { data } = await api.get(`/admin-turfs/${turfId}/courts/${courtId}/slots`);
    return data.slots;
  },
  saveSlots: async (turfId: string, courtId: string, slots: Omit<Slot, 'id'>[]): Promise<void> => {
    await api.put(`/admin-turfs/${turfId}/courts/${courtId}/slots`, { slots });
  },
  // Settings
  getSettings: async (turfId: string): Promise<TurfSettings | null> => {
    const { data } = await api.get(`/admin-turfs/${turfId}/settings`);
    return data.settings;
  },
  saveSettings: async (turfId: string, payload: Partial<TurfSettings>): Promise<void> => {
    await api.put(`/admin-turfs/${turfId}/settings`, payload);
  },
  // Manual bookings (pass includeOnline=true to get combined view)
  listBookings: async (turfId: string, includeOnline = false): Promise<ManualBooking[]> => {
    const params = includeOnline ? '?include_online=true' : '';
    const { data } = await api.get(`/admin-turfs/${turfId}/bookings${params}`);
    return data.bookings;
  },
  createBooking: async (turfId: string, payload: Omit<ManualBooking, 'id' | 'turf_id' | 'created_at' | 'court'>): Promise<ManualBooking> => {
    const { data } = await api.post(`/admin-turfs/${turfId}/bookings`, payload);
    return data.booking;
  },
  deleteBooking: async (turfId: string, bookingId: string): Promise<void> => {
    await api.delete(`/admin-turfs/${turfId}/bookings/${bookingId}`);
  },
  getBookingAvailability: async (
    turfId: string,
    courtId: string | null,
    date: string,
  ): Promise<BookingAvailabilitySlot[]> => {
    const params = new URLSearchParams({ date });
    if (courtId) params.set('court_id', courtId);
    const { data } = await api.get(`/admin-turfs/${turfId}/bookings/availability?${params}`);
    return data.booked_slots ?? [];
  },
  // Reports
  getReport: async (params: {
    start: string;
    end: string;
    turf_id?: string;
  }): Promise<ReportResponse> => {
    const qs = new URLSearchParams({ start: params.start, end: params.end });
    if (params.turf_id) qs.set('turf_id', params.turf_id);
    const { data } = await api.get(`/admin-turfs/reports?${qs}`);
    return data;
  },
};
