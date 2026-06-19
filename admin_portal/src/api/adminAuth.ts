import { api } from './client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'administrator' | 'turf_owner';
  turf_id: string | null;
  is_active: boolean;
}

export const adminAuth = {
  login: async (email: string, password: string): Promise<{ token: string; user: AdminUser }> => {
    const { data } = await api.post('/admin-auth/login', { email, password });
    return data;
  },
  me: async (): Promise<AdminUser> => {
    const { data } = await api.get('/admin-auth/me');
    return data.user;
  },
  logout: async (): Promise<void> => {
    await api.post('/admin-auth/logout');
  },
  listUsers: async (): Promise<AdminUser[]> => {
    const { data } = await api.get('/admin-auth/users');
    return data.users;
  },
  createUser: async (payload: { email: string; name: string; role: string; turf_id?: string | null; password: string }): Promise<{ id: string }> => {
    const { data } = await api.post('/admin-auth/users', payload);
    return data;
  },
  updateUser: async (id: string, payload: Partial<{ name: string; role: string; turf_id: string | null; is_active: boolean }>): Promise<void> => {
    await api.put(`/admin-auth/users/${id}`, payload);
  },
  changePassword: async (id: string, password: string): Promise<void> => {
    await api.put(`/admin-auth/users/${id}/password`, { password });
  },
};
