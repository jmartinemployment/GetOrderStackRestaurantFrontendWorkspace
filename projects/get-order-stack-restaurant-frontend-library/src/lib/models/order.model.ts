import {
  DiningOption,
  DiningOptionType,
  ApprovalStatus,
  DeliveryInfo,
  CurbsideInfo,
  CateringInfo
} from './dining-option.model';

// --- Status enums (string unions) ---

export type GuestOrderStatus =
  | 'RECEIVED'
  | 'IN_PREPARATION'
  | 'READY_FOR_PICKUP'
  | 'CLOSED'
  | 'VOIDED';

export type PaymentStatus = 'OPEN' | 'PAID' | 'CLOSED';

export type FulfillmentStatus = 'NEW' | 'HOLD' | 'SENT' | 'ON_THE_FLY';

export type CourseFireStatus = 'PENDING' | 'FIRED' | 'READY';

export type CoursePacingMode = 'disabled' | 'server_fires' | 'auto_fire_timed';

export type PrintStatus = 'none' | 'printing' | 'printed' | 'failed';

export interface Course {
  guid: string;
  name: string;
  sortOrder: number;
  fireStatus: CourseFireStatus;
  firedDate?: Date;
}

// Pre-submission order type (used by CartService / OnlineOrderPortal)
export type OrderType = 'pickup' | 'delivery' | 'dine-in' | 'curbside' | 'catering';

// --- Sub-objects ---

export interface OrderServer {
  guid: string;
  name: string;
  entityType: 'RestaurantUser';
}

export interface OrderDevice {
  guid: string;
  name: string;
}

export interface OrderTable {
  guid: string;
  name: string;
  entityType: 'Table';
}

export interface SelectionModifier {
  guid: string;
  name: string;
  priceAdjustment: number;
}

export interface Selection {
  guid: string;
  menuItemGuid: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  fulfillmentStatus: FulfillmentStatus;
  modifiers: SelectionModifier[];
  specialInstructions?: string;
  course?: Course;
  fireDelaySeconds?: number;      // Computed delay before this item should fire
  scheduledFireTime?: Date;       // Absolute time when this item should fire
}

export interface Payment {
  guid: string;
  paymentMethod: string;
  amount: number;
  tipAmount: number;
  status: PaymentStatus;
  stripePaymentIntentId?: string;
  paidDate?: Date;
}

export interface Check {
  guid: string;
  displayNumber: string;
  selections: Selection[];
  payments: Payment[];
  paymentStatus: PaymentStatus;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
}

export interface OrderTimestamps {
  createdDate: Date;
  confirmedDate?: Date;
  sentDate?: Date;
  prepStartDate?: Date;
  preparingDate?: Date;
  readyDate?: Date;
  closedDate?: Date;
  voidedDate?: Date;
  lastModifiedDate: Date;
}

export interface OrderMetrics {
  totalPrepTimeMinutes: number;
  avgItemPrepMinutes: number;
  timeToConfirmMinutes: number;
  timeToPrepareMinutes: number;
  timeToReadyMinutes: number;
  totalTimeMinutes: number;
}

// --- Offline queue ---

export interface QueuedOrder {
  localId: string;
  orderData: Record<string, unknown>;
  queuedAt: number;
  restaurantId: string;
  retryCount: number;
}

// --- Main Order interface ---

export interface Order {
  guid: string;
  restaurantId: string;
  orderNumber: string;
  guestOrderStatus: GuestOrderStatus;
  businessDate?: string;

  // Server / Device / Table
  server: OrderServer;
  device: OrderDevice;
  table?: OrderTable;

  // Dining option
  diningOption: DiningOption;
  diningOptionType?: DiningOptionType;
  approvalStatus?: ApprovalStatus;
  promisedDate?: string;

  // Checks (contains selections + payments)
  checks: Check[];

  // Course system
  courses?: Course[];

  // Order-level totals (sum of all checks)
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;

  // Customer
  customer?: CustomerInfo;
  specialInstructions?: string;

  // Timestamps
  timestamps: OrderTimestamps;

  // Type-specific info
  deliveryInfo?: DeliveryInfo;
  curbsideInfo?: CurbsideInfo;
  cateringInfo?: CateringInfo;

  // Client-only: true for offline-queued orders not yet synced
  _queued?: boolean;
}

// --- Kept from original ---

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
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

export interface RecentProfitSummary {
  orders: ProfitInsight[];
  averageMargin: number;
  totalRevenue: number;
  totalCost: number;
}

// --- Helper functions ---

export function getCustomerDisplayName(order: Order): string {
  const parts = [order.customer?.firstName, order.customer?.lastName].filter(Boolean);
  return parts.join(' ');
}

export function getOrderIdentifier(order: Order): string {
  return order.orderNumber || order.guid.slice(-4).toUpperCase();
}

export function calculateOrderTotals(checks: Check[]): {
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
} {
  return checks.reduce(
    (acc, check) => ({
      subtotal: acc.subtotal + check.subtotal,
      taxAmount: acc.taxAmount + check.taxAmount,
      tipAmount: acc.tipAmount + check.tipAmount,
      totalAmount: acc.totalAmount + check.totalAmount,
    }),
    { subtotal: 0, taxAmount: 0, tipAmount: 0, totalAmount: 0 }
  );
}

export function canSendToKitchen(order: Order): boolean {
  return order.guestOrderStatus === 'RECEIVED' || order.guestOrderStatus === 'IN_PREPARATION';
}

export function calculateOrderMetrics(order: Order): OrderMetrics | null {
  const created = order.timestamps.createdDate.getTime();
  const now = Date.now();

  const totalTimeMinutes = Math.floor((now - created) / 60000);

  const timeToConfirmMinutes = order.timestamps.confirmedDate
    ? Math.floor((order.timestamps.confirmedDate.getTime() - created) / 60000)
    : 0;

  const timeToPrepareMinutes = order.timestamps.preparingDate
    ? Math.floor((order.timestamps.preparingDate.getTime() - created) / 60000)
    : 0;

  const timeToReadyMinutes = order.timestamps.readyDate
    ? Math.floor((order.timestamps.readyDate.getTime() - created) / 60000)
    : 0;

  const allSelections = order.checks.flatMap(c => c.selections);
  const totalPrepTimeMinutes = timeToReadyMinutes || totalTimeMinutes;
  const avgItemPrepMinutes = allSelections.length > 0
    ? Math.round(totalPrepTimeMinutes / allSelections.length)
    : 0;

  return {
    totalPrepTimeMinutes,
    avgItemPrepMinutes,
    timeToConfirmMinutes,
    timeToPrepareMinutes,
    timeToReadyMinutes,
    totalTimeMinutes,
  };
}
