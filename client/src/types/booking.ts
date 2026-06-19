export type GameType = 'private' | 'public';

export interface Booking {
  id: string;
  turf_id: string;
  court_id?: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  price: number;
  game_type: GameType;
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'partial';
  advance_amount?: number | null;
  remaining_balance?: number | null;
}

export interface BookingCreatePayload {
  turf_id: string;
  court_id?: string;
  start_time: string;
  end_time: string;
  price: number;
  game_type?: GameType;
}
