import { apiClient } from '../client';
import type { Game, GameCreatePayload } from '../../types/game';

export const gamesApi = {
  getPublicGames: async (): Promise<Game[]> => {
    const response = await apiClient.get('/games/public');
    return response.data;
  },
  getMyGames: async (): Promise<Game[]> => {
    const response = await apiClient.get('/games/my');
    return response.data;
  },
  getGameById: async (gameId: string): Promise<Game> => {
    const response = await apiClient.get(`/games/${gameId}`);
    return response.data;
  },
  createGame: async (payload: GameCreatePayload): Promise<Game> => {
    const response = await apiClient.post('/games', payload);
    return response.data;
  },
  joinGame: async (gameId: string): Promise<void> => {
    await apiClient.post(`/games/${gameId}/join`, {});
  },
  cancelGame: async (gameId: string): Promise<void> => {
    await apiClient.put(`/games/${gameId}/cancel`);
  }
};
