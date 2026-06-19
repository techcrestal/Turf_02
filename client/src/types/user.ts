export interface UserProfile {
  id: string;
  phone_number: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  email: string | null;
  username: string | null;
  age: number | null;
  gender: string | null;
  dob: string | null;
  is_phone_verified: boolean;
  profile_completed: boolean;
  promotions_opt_in: boolean;
  favorite_sports: string[];
  skill_ids: string[];
  role: 'customer' | 'owner' | 'admin';
}
