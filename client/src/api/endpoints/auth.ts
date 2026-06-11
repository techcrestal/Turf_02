import { apiClient } from '../client';
import type {
  ApproveOwnerPayload,
  ApproveOwnerResponse,
  AuthResponse,
  CheckUserResponse,
  LoginPasswordPayload,
  OwnerRegistration,
  OwnerRegistrationPayload,
  OtpVerificationPayload,
  ProfilePayload,
  RegisterPayload,
} from '../../types/auth';

export const authApi = {
  checkUser: async (identifier: string): Promise<CheckUserResponse> => {
    const response = await apiClient.post('/auth/check-user', { identifier });
    return response.data;
  },
  sendOtp: async (payload: { phone_number: string }) => {
    const response = await apiClient.post('/auth/send-otp', payload);
    return response.data;
  },
  verifyOtp: async (payload: OtpVerificationPayload): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/verify-otp', payload);
    return response.data;
  },
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },
  loginWithPassword: async (payload: LoginPasswordPayload): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login-password', payload);
    return response.data;
  },
  createProfile: async (payload: ProfilePayload) => {
    const response = await apiClient.post('/profile', payload);
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  // Owner registration (no auth required)
  registerOwner: async (payload: OwnerRegistrationPayload): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/register-owner', payload);
    return response.data;
  },

  // Admin-only endpoints
  adminGetRegistrations: async (): Promise<{ registrations: OwnerRegistration[] }> => {
    const response = await apiClient.get('/auth/admin/registrations');
    return response.data;
  },
  adminApproveOwner: async (id: string, payload: ApproveOwnerPayload): Promise<ApproveOwnerResponse> => {
    const response = await apiClient.post(`/auth/admin/approve/${id}`, payload);
    return response.data;
  },
  adminRejectOwner: async (id: string, reason?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/auth/admin/reject/${id}`, { reason });
    return response.data;
  },
};
