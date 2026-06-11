import { apiClient } from '../client';
import { ProfilePayload } from '../../types/auth';
import { UserProfile } from '../../types/user';

export const usersApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/profile');
    return response.data;
  },
  updateProfile: async (payload: ProfilePayload): Promise<UserProfile> => {
    const response = await apiClient.put('/profile', payload);
    return response.data;
  }
};
