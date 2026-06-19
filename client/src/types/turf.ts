export interface Turf {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  sport_id: string;
  starting_from_price: number | null;
  capacity: number;
  is_public: boolean;
  status: string;
  opening_time: string | null;
  closing_time: string | null;
  contact_number: string | null;
  turf_email: string | null;
  latitude: number | null;
  longitude: number | null;
}
