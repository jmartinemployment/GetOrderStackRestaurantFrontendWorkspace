import { CoursePacingMode } from './order.model';
import { PaymentProcessorType } from './payment.model';
import { TipPoolRule, TipOutRule } from './tip.model';

/**
 * AI Settings — Control Panel > AI Settings tab
 * Source: Get-Order-Stack-Workflow.md lines 583-593
 */
export interface AISettings {
  aiOrderApprovalEnabled: boolean;
  timeThresholdHours: number;
  valueThresholdDollars: number;
  quantityThreshold: number;
  coursePacingMode: CoursePacingMode;
  expoStationEnabled: boolean;
  approvalTimeoutHours: number;
}

/**
 * Online Pricing Settings — Control Panel > Online Pricing tab
 * Source: Get-Order-Stack-Workflow.md lines 596-608
 */
export type PriceAdjustmentType = 'percentage' | 'flat';

export interface OnlinePricingSettings {
  enabled: boolean;
  adjustmentType: PriceAdjustmentType;
  adjustmentAmount: number;
  deliveryFee: number;
  showAdjustmentToCustomer: boolean;
}

/**
 * Catering Capacity Settings — Control Panel > Catering Calendar tab
 * Source: Get-Order-Stack-Workflow.md lines 610-617
 */
export interface CateringCapacitySettings {
  maxEventsPerDay: number;
  maxHeadcountPerDay: number;
  conflictAlertsEnabled: boolean;
}

/**
 * Catering Event — flattened from Order with catering fields for calendar display.
 */
export interface CateringEvent {
  orderId: string;
  orderNumber: string;
  customerName: string;
  eventDate: string;
  eventTime: string;
  headcount: number;
  eventType: string;
  setupRequired: boolean;
  depositAmount: number;
  depositPaid: boolean;
  approvalStatus: 'NEEDS_APPROVAL' | 'APPROVED' | 'NOT_APPROVED';
  totalAmount: number;
  specialInstructions: string;
}

/**
 * Calendar Day — for building the month grid.
 */
export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  events: CateringEvent[];
  totalHeadcount: number;
  isOverCapacityEvents: boolean;
  isOverCapacityHeadcount: boolean;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
}

/**
 * Capacity Block — blocked dates/times for private events.
 */
export interface CapacityBlock {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason: string;
}

// --- Factory defaults ---

export function defaultAISettings(): AISettings {
  return {
    aiOrderApprovalEnabled: true,
    timeThresholdHours: 12,
    valueThresholdDollars: 200,
    quantityThreshold: 20,
    coursePacingMode: 'disabled',
    expoStationEnabled: false,
    approvalTimeoutHours: 24,
  };
}

export function defaultOnlinePricingSettings(): OnlinePricingSettings {
  return {
    enabled: false,
    adjustmentType: 'percentage',
    adjustmentAmount: 0,
    deliveryFee: 0,
    showAdjustmentToCustomer: true,
  };
}

export function defaultCateringCapacitySettings(): CateringCapacitySettings {
  return {
    maxEventsPerDay: 3,
    maxHeadcountPerDay: 200,
    conflictAlertsEnabled: true,
  };
}

/**
 * Payment Settings — Control Panel > Payments tab
 */
export interface PaymentSettings {
  processor: PaymentProcessorType;
  requirePaymentBeforeKitchen: boolean;
}

export function defaultPaymentSettings(): PaymentSettings {
  return { processor: 'none', requirePaymentBeforeKitchen: false };
}

export interface TipManagementSettings {
  enabled: boolean;
  minimumWage: number;
  defaultHourlyRate: number;
  poolRules: TipPoolRule[];
  tipOutRules: TipOutRule[];
}

export function defaultTipManagementSettings(): TipManagementSettings {
  return {
    enabled: false,
    minimumWage: 12,
    defaultHourlyRate: 5.63,
    poolRules: [],
    tipOutRules: [],
  };
}
