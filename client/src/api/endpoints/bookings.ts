import { apiClient } from '../client';
import { Booking, BookingCreatePayload } from '../../types/booking';

export interface BookedSlot {
  start_time: string;
  end_time: string;
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
  getAvailability: async (turfId: string, startISO: string, endISO: string): Promise<BookedSlot[]> => {
    const response = await apiClient.get(
      `/bookings/availability?turf_id=${turfId}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
    );
    return response.data.booked_slots ?? [];
  },
};
