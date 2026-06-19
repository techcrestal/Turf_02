import { apiClient } from '../client';
import { Booking, BookingCreatePayload, GameType } from '../../types/booking';

export interface BookedSlot {
  start_time: string;
  end_time: string;
  game_type: GameType;
  booking_id?: string; // present only for public slots
}

export interface DayAvailability {
  date: string;
  status: 'available' | 'limited' | 'full';
}

export interface AvailabilityResponse {
  booked_slots: BookedSlot[];
  day_statuses: DayAvailability[];
}

export const bookingsApi = {
  getBookings: async (): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings');
    return response.data;
  },
  createBooking: async (payload: BookingCreatePayload): Promise<Booking> => {
    const response = await apiClient.post('/bookings', payload);
    return response.data;
  },
  cancelBooking: async (bookingId: string): Promise<void> => {
    await apiClient.put(`/bookings/${bookingId}/cancel`);
  },
  updateGameType: async (bookingId: string, gameType: GameType): Promise<Booking> => {
    const response = await apiClient.put(`/bookings/${bookingId}/game-type`, { game_type: gameType });
    return response.data;
  },
  joinBooking: async (bookingId: string): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/join`);
  },
  getAvailability: async (
    turfId: string,
    startISO: string,
    endISO: string,
    courtId?: string
  ): Promise<AvailabilityResponse> => {
    const params = new URLSearchParams({ start: startISO, end: endISO });
    if (courtId) {
      params.set('court_id', courtId);
    } else {
      params.set('turf_id', turfId);
    }
    const response = await apiClient.get(`/bookings/availability?${params.toString()}`);
    return {
      booked_slots: response.data.booked_slots ?? [],
      day_statuses: response.data.day_statuses ?? [],
    };
  },
};
