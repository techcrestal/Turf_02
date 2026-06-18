import { apiClient } from '../client';

export interface PaymentPayload {
  booking_id?: string;
  game_id?: string;
  amount: number;
  currency: string;
  provider: string;
  provider_transaction_id?: string;
}

export interface RazorpayOrder {
  order_id: string;
  amount: number;   // paise
  currency: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  booking_id: string;
  amount: number;   // rupees
}

export const paymentsApi = {
  createPayment: async (payload: PaymentPayload) => {
    const response = await apiClient.post('/payments', payload);
    return response.data;
  },

  createRazorpayOrder: async (amount: number, bookingId: string): Promise<RazorpayOrder> => {
    const response = await apiClient.post('/razorpay/create-order', {
      amount,
      currency: 'INR',
      booking_id: bookingId,
    });
    return response.data;
  },

  verifyRazorpayPayment: async (
    payload: RazorpayVerifyPayload,
  ): Promise<{ success: boolean; payment_id: string }> => {
    const response = await apiClient.post('/razorpay/verify', payload);
    return response.data;
  },
};
