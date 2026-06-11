import { apiClient } from '../client';
import { Booking } from '../../types/booking';
import { BookingCreatePayload } from '../../types/booking';

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
  }
};
