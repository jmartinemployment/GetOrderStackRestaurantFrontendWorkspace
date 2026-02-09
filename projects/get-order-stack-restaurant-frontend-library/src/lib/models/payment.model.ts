export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface PaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  stripe: {
    status: string;
    amount: number;
    currency: string;
  } | null;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number | null;
  status: string;
}

export type PaymentStep = 'cart' | 'paying' | 'success' | 'failed';
