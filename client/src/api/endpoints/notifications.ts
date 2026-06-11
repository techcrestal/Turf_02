import { apiClient } from '../client';
import { Notification } from '../../types/notification';

export const notificationsApi = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications');
    return response.data;
  },
  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
  }
};
