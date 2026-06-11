import { apiClient } from '../client';

export interface PaymentPayload {
  booking_id?: string;
  game_id?: string;
  amount: number;
  currency: string;
  provider: string;
  provider_transaction_id?: string;
}

export const paymentsApi = {
  createPayment: async (payload: PaymentPayload) => {
    const response = await apiClient.post('/payments', payload);
    return response.data;
  }
};
