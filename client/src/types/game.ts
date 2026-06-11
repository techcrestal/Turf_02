export interface Game {
  id: string;
  title: string;
  description: string | null;
  type: 'public' | 'private';
  creator_id: string;
  turf_id: string;
  sport_id: string;
  entry_fee: number;
  max_players: number;
  status: string;
  start_time: string;
  end_time: string | null;
}

export interface GameCreatePayload {
  turf_id: string;
  sport_id: string;
  title: string;
  description?: string;
  type: 'public' | 'private';
  entry_fee?: number;
  max_players?: number;
  start_time: string;
  end_time?: string;
}
