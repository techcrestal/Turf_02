export interface Booking {
  id: string;
  turf_id: string;
  court_id?: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price: number;
}

export interface BookingCreatePayload {
  turf_id: string;
  court_id?: string;
  start_time: string;
  end_time: string;
  price: number;
}
