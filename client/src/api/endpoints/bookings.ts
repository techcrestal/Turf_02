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

export type JoinStatus = 'host' | 'none' | 'pending' | 'approved' | 'rejected';

export interface JoinedBooking extends Booking {
  joined_at: string;
}

export interface PendingJoinBooking extends Booking {
  join_status: 'pending';
  joined_at: string;
}

export interface PublicBooking extends Booking {
  is_mine: boolean;
  join_status: JoinStatus;
}

export interface JoinRequest {
  booking_id: string;
  user_id: string;
  requested_at: string;
  requester: { id: string; name: string; phone_number: string };
  booking: { id: string; start_time: string; end_time: string; turf_id: string };
}

export const bookingsApi = {
  getBookings: async (): Promise<Booking[]> => {
    const response = await apiClient.get('/bookings');
    return response.data;
  },
  getJoinedGames: async (): Promise<JoinedBooking[]> => {
    const response = await apiClient.get('/bookings/joined');
    return response.data;
  },
  getPendingJoins: async (): Promise<PendingJoinBooking[]> => {
    const response = await apiClient.get('/bookings/pending-joins');
    return response.data;
  },
  getPublicGames: async (): Promise<PublicBooking[]> => {
    const response = await apiClient.get('/bookings/public');
    return response.data;
  },
  getJoinRequests: async (): Promise<JoinRequest[]> => {
    const response = await apiClient.get('/bookings/join-requests');
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
  leaveBooking: async (bookingId: string): Promise<void> => {
    await apiClient.delete(`/bookings/${bookingId}/join`);
  },
  approveJoinRequest: async (bookingId: string, userId: string): Promise<void> => {
    await apiClient.put(`/bookings/${bookingId}/join-requests/approve`, { user_id: userId });
  },
  rejectJoinRequest: async (bookingId: string, userId: string): Promise<void> => {
    await apiClient.put(`/bookings/${bookingId}/join-requests/reject`, { user_id: userId });
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
