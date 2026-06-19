import type { UserProfile } from './user';

// Kept for ProfileCreationPage / usersApi.updateProfile backward compat
export interface ProfilePayload {
  name?: string;
  email?: string;
  username?: string;
  age?: number;
  favorite_sports?: string[];
  skill_ids?: string[];
}

export interface CheckUserResponse {
  exists: boolean;
  phone_number: string | null;
}

export interface OtpVerificationPayload {
  phone_number: string;
  otp: string;
}

export interface RegisterPayload {
  phone_number?: string;
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dob?: string;
  location_lat?: number;
  location_lng?: number;
  favorite_sports?: string[];
  promotions_opt_in?: boolean;
}

export interface LoginPasswordPayload {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: UserProfile;
}

export interface OwnerRegistrationPayload {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  turf_data: {
    name: string;
    sport_id: string;
    description?: string;
    address: string;
    city: string;
    state?: string;
    country: string;
    contact_number: string;
    turf_email: string;
    opening_time: string;
    closing_time: string;
    capacity: number;
    courts: unknown[];
    photos: string[];
  };
}

export interface OwnerRegistration {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  turf_data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
}

export interface ApproveOwnerPayload {
  username: string;
  password: string;
}

export interface ApproveOwnerResponse {
  credentials: {
    username: string;
    password: string;
    phone_number: string;
    email: string;
    name: string;
    turf_name: string;
  };
}
