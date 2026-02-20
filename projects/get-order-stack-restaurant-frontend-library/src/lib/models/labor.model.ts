export type ShiftPosition = 'server' | 'cook' | 'bartender' | 'host' | 'manager' | 'expo';
export type StaffScheduleTab = 'schedule' | 'time-clock' | 'labor-report' | 'ai-insights';
export type ReportRange = 'week' | 'biweek' | 'month';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface Shift {
  id: string;
  restaurantId: string;
  staffPinId: string;
  staffName: string;
  staffRole: string;
  date: string;
  startTime: string;
  endTime: string;
  position: ShiftPosition;
  breakMinutes: number;
  notes: string | null;
  isPublished: boolean;
}

export interface ShiftFormData {
  staffPinId: string;
  date: string;
  startTime: string;
  endTime: string;
  position: ShiftPosition;
  breakMinutes?: number;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  staffPinId: string;
  staffName: string;
  staffRole: string;
  shiftId: string | null;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  hoursWorked: number;
}

export interface LaborTarget {
  id: string;
  dayOfWeek: number;
  targetPercent: number;
  targetCost: number | null;
}

export interface StaffLaborSummary {
  staffPinId: string;
  staffName: string;
  staffRole: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  laborCost: number;
  shiftsWorked: number;
}

export interface DailyLaborBreakdown {
  date: string;
  hours: number;
  cost: number;
  revenue: number;
  laborPercent: number;
  targetPercent: number | null;
}

export interface OvertimeFlag {
  staffPinId: string;
  staffName: string;
  weeklyHours: number;
  overtimeHours: number;
}

export interface LaborReport {
  startDate: string;
  endDate: string;
  totalHours: number;
  totalLaborCost: number;
  totalRevenue: number;
  laborPercent: number;
  staffSummaries: StaffLaborSummary[];
  dailyBreakdown: DailyLaborBreakdown[];
  overtimeFlags: OvertimeFlag[];
}

// --- Staff Portal types ---

export type StaffPortalTab = 'schedule' | 'availability' | 'swaps';

export type SwapRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SwapRequest {
  id: string;
  shiftId: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftPosition: ShiftPosition;
  requestorPinId: string;
  requestorName: string;
  targetPinId: string | null;
  targetName: string | null;
  reason: string;
  status: SwapRequestStatus;
  createdAt: string;
  respondedAt: string | null;
  respondedBy: string | null;
}

export interface AvailabilityPreference {
  id: string;
  staffPinId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  preferredStart: string | null;
  preferredEnd: string | null;
  notes: string | null;
}

export interface StaffEarnings {
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  basePay: number;
  overtimePay: number;
  tips: number;
  totalEarnings: number;
}

export type LaborRecommendationType = 'overstaffed' | 'understaffed' | 'cost_optimization' | 'scheduling_tip';

export interface LaborRecommendation {
  type: LaborRecommendationType;
  title: string;
  message: string;
  hour?: number;
  dayOfWeek?: number;
  priority: 'high' | 'medium' | 'low';
  potentialSavings?: number;
}
