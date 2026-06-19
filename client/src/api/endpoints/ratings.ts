import { apiClient } from '../client';
import {
  SportSkill,
  TurfRatingSummary,
  PlayerRatingSummary,
  GameParticipant,
} from '../../types/rating';

export const ratingsApi = {
  getAllSkills: async (): Promise<SportSkill[]> => {
    const res = await apiClient.get('/ratings/skills');
    return res.data;
  },

  // Turf
  getTurfRatings: async (turfId: string): Promise<TurfRatingSummary> => {
    const res = await apiClient.get(`/ratings/turf/${turfId}`);
    return res.data;
  },
  getMyTurfRating: async (turfId: string) => {
    const res = await apiClient.get(`/ratings/my-turf/${turfId}`);
    return res.data as { parameters: Record<string, number>; review?: string } | null;
  },
  submitTurfRating: async (
    turfId: string,
    parameters: Record<string, number>,
    review?: string,
  ): Promise<void> => {
    await apiClient.post(`/ratings/turf/${turfId}`, { parameters, review });
  },

  // Player
  getPlayerRatings: async (playerId: string): Promise<PlayerRatingSummary> => {
    const res = await apiClient.get(`/ratings/player/${playerId}`);
    return res.data;
  },
  getMyPlayerRatings: async (playerId: string): Promise<Record<string, number>> => {
    const res = await apiClient.get(`/ratings/my-player/${playerId}`);
    return res.data;
  },
  submitPlayerRatings: async (
    playerId: string,
    ratings: Record<string, number>,
  ): Promise<void> => {
    await apiClient.post(`/ratings/player/${playerId}`, { ratings });
  },

  // Game participants
  getBookingParticipants: async (bookingId: string): Promise<GameParticipant[]> => {
    const res = await apiClient.get(`/bookings/${bookingId}/participants`);
    return res.data;
  },
};
