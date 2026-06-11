import { apiClient } from '../client';
import type { Sport } from '../../types/sport';

export const sportsApi = {
  getSports: async (): Promise<Sport[]> => {
    const response = await apiClient.get('/sports');
    return response.data;
  }
};
