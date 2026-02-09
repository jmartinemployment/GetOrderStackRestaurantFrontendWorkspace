export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderType = 'pickup' | 'delivery' | 'dine-in';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  stripePaymentIntentId?: string;
  items: OrderItem[];
  customer?: CustomerInfo;
  tableId?: string;
  specialInstructions?: string;
  sourceDeviceId?: string; // Device that created the order (SOS terminal)
  createdAt: string;
  confirmedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: OrderItemModifier[];
  specialInstructions?: string;
}

export interface OrderItemModifier {
  id: string;
  name: string;
  priceAdjustment: number;
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ProfitInsight {
  orderId: string;
  totalCost: number;
  totalRevenue: number;
  profitMargin: number;
  starItem?: string;
  insightText: string;
  quickTip: string;
}
