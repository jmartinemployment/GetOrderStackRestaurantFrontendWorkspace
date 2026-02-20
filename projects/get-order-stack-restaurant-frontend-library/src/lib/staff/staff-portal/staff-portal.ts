import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { LaborService } from '../../services/labor';
import {
  StaffMember,
  Shift,
  StaffPortalTab,
  AvailabilityPreference,
  SwapRequest,
  StaffEarnings,
  ShiftPosition,
} from '../../models';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'get-order-stack-staff-portal',
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './staff-portal.html',
  styleUrl: './staff-portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPortal {
  private readonly laborService = inject(LaborService);

  // --- PIN login state ---
  private readonly _pinDigits = signal('');
  private readonly _pinError = signal<string | null>(null);
  private readonly _isValidating = signal(false);
  private readonly _loggedInStaff = signal<StaffMember | null>(null);

  readonly pinDigits = this._pinDigits.asReadonly();
  readonly pinError = this._pinError.asReadonly();
  readonly isValidating = this._isValidating.asReadonly();
  readonly loggedInStaff = this._loggedInStaff.asReadonly();
  readonly isLoggedIn = computed(() => !!this._loggedInStaff());

  readonly pinDots = computed(() => {
    const len = this._pinDigits().length;
    return Array.from({ length: 6 }, (_, i) => i < len);
  });

  // --- Tab state ---
  private readonly _activeTab = signal<StaffPortalTab>('schedule');
  readonly activeTab = this._activeTab.asReadonly();

  // --- Schedule state ---
  private readonly _weekOffset = signal(0);
  private readonly _myShifts = signal<Shift[]>([]);
  private readonly _earnings = signal<StaffEarnings | null>(null);
  private readonly _isLoadingShifts = signal(false);

  readonly myShifts = this._myShifts.asReadonly();
  readonly earnings = this._earnings.asReadonly();
  readonly isLoadingShifts = this._isLoadingShifts.asReadonly();

  readonly weekStart = computed(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + this._weekOffset() * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly weekEnd = computed(() => {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 6);
    return d;
  });

  readonly weekLabel = computed(() => {
    const s = this.weekStart();
    const e = this.weekEnd();
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
  });

  readonly shiftsByDay = computed(() => {
    const map = new Map<string, Shift[]>();
    const start = new Date(this.weekStart());

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = this.formatDate(d);
      map.set(key, []);
    }

    for (const shift of this._myShifts()) {
      const existing = map.get(shift.date);
      if (existing) {
        existing.push(shift);
      }
    }

    return map;
  });

  readonly weekDays = computed(() => {
    return [...this.shiftsByDay().keys()];
  });

  readonly totalWeekHours = computed(() => {
    return this._myShifts().reduce((sum, s) => sum + this.getShiftDuration(s), 0);
  });

  // --- Availability state ---
  private readonly _availability = signal<AvailabilityPreference[]>([]);
  private readonly _editingAvailability = signal<Map<number, { available: boolean; start: string; end: string; notes: string }>>(new Map());
  private readonly _isEditingAvailability = signal(false);
  private readonly _isSavingAvailability = signal(false);

  readonly availability = this._availability.asReadonly();
  readonly isEditingAvailability = this._isEditingAvailability.asReadonly();
  readonly isSavingAvailability = this._isSavingAvailability.asReadonly();
  readonly editingAvailability = this._editingAvailability.asReadonly();
  readonly dayNames = DAY_NAMES;

  // --- Swap state ---
  private readonly _swapRequests = signal<SwapRequest[]>([]);
  private readonly _showSwapForm = signal(false);
  private readonly _swapShiftId = signal('');
  private readonly _swapReason = signal('');
  private readonly _isSubmittingSwap = signal(false);

  readonly swapRequests = this._swapRequests.asReadonly();
  readonly showSwapForm = this._showSwapForm.asReadonly();
  readonly swapShiftId = this._swapShiftId.asReadonly();
  readonly swapReason = this._swapReason.asReadonly();
  readonly isSubmittingSwap = this._isSubmittingSwap.asReadonly();

  readonly pendingIncoming = computed(() =>
    this._swapRequests().filter(r => r.status === 'pending' && r.targetPinId === this._loggedInStaff()?.id)
  );

  readonly myOutgoing = computed(() =>
    this._swapRequests().filter(r => r.requestorPinId === this._loggedInStaff()?.id)
  );

  readonly swappableShifts = computed(() => {
    const now = new Date();
    return this._myShifts().filter(s => new Date(s.date + 'T' + s.endTime) > now);
  });

  // --- Error ---
  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  // === PIN Login ===

  onDigit(digit: string): void {
    const current = this._pinDigits();
    if (current.length >= 6) return;

    const updated = current + digit;
    this._pinDigits.set(updated);
    this._pinError.set(null);

    if (updated.length >= 4) {
      this.attemptLogin(updated);
    }
  }

  onBackspace(): void {
    this._pinDigits.update(d => d.slice(0, -1));
    this._pinError.set(null);
  }

  onClearPin(): void {
    this._pinDigits.set('');
    this._pinError.set(null);
  }

  private async attemptLogin(pin: string): Promise<void> {
    this._isValidating.set(true);
    this._pinError.set(null);

    const staff = await this.laborService.validateStaffPin(pin);

    if (staff) {
      this._loggedInStaff.set(staff);
      this._pinDigits.set('');
      await this.loadScheduleData();
    } else {
      this._pinError.set('Invalid PIN');
      this._pinDigits.set('');
    }

    this._isValidating.set(false);
  }

  logout(): void {
    this._loggedInStaff.set(null);
    this._pinDigits.set('');
    this._activeTab.set('schedule');
    this._myShifts.set([]);
    this._earnings.set(null);
    this._availability.set([]);
    this._swapRequests.set([]);
  }

  // === Tab Navigation ===

  setTab(tab: StaffPortalTab): void {
    this._activeTab.set(tab);

    if (tab === 'availability') {
      this.loadAvailability();
    } else if (tab === 'swaps') {
      this.loadSwapRequests();
    }
  }

  // === Schedule ===

  prevWeek(): void {
    this._weekOffset.update(o => o - 1);
    this.loadScheduleData();
  }

  nextWeek(): void {
    this._weekOffset.update(o => o + 1);
    this.loadScheduleData();
  }

  thisWeek(): void {
    this._weekOffset.set(0);
    this.loadScheduleData();
  }

  private async loadScheduleData(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    this._isLoadingShifts.set(true);

    const startStr = this.formatDate(this.weekStart());
    const endStr = this.formatDate(this.weekEnd());

    const [shifts, earnings] = await Promise.all([
      this.laborService.loadStaffShifts(staff.id, startStr, endStr),
      this.laborService.loadStaffEarnings(staff.id, startStr, endStr),
    ]);

    this._myShifts.set(shifts);
    this._earnings.set(earnings);
    this._isLoadingShifts.set(false);
  }

  // === Availability ===

  private async loadAvailability(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const prefs = await this.laborService.loadAvailability(staff.id);
    this._availability.set(prefs);
  }

  startEditAvailability(): void {
    const map = new Map<number, { available: boolean; start: string; end: string; notes: string }>();

    for (let day = 0; day < 7; day++) {
      const existing = this._availability().find(a => a.dayOfWeek === day);
      map.set(day, {
        available: existing?.isAvailable ?? true,
        start: existing?.preferredStart ?? '09:00',
        end: existing?.preferredEnd ?? '22:00',
        notes: existing?.notes ?? '',
      });
    }

    this._editingAvailability.set(map);
    this._isEditingAvailability.set(true);
  }

  cancelEditAvailability(): void {
    this._isEditingAvailability.set(false);
  }

  toggleDayAvailability(day: number): void {
    this._editingAvailability.update(map => {
      const updated = new Map(map);
      const current = updated.get(day);
      if (current) {
        updated.set(day, { ...current, available: !current.available });
      }
      return updated;
    });
  }

  updateAvailabilityTime(day: number, field: 'start' | 'end', value: string): void {
    this._editingAvailability.update(map => {
      const updated = new Map(map);
      const current = updated.get(day);
      if (current) {
        updated.set(day, { ...current, [field]: value });
      }
      return updated;
    });
  }

  updateAvailabilityNotes(day: number, value: string): void {
    this._editingAvailability.update(map => {
      const updated = new Map(map);
      const current = updated.get(day);
      if (current) {
        updated.set(day, { ...current, notes: value });
      }
      return updated;
    });
  }

  getEditDay(day: number): { available: boolean; start: string; end: string; notes: string } {
    return this._editingAvailability().get(day) ?? { available: true, start: '09:00', end: '22:00', notes: '' };
  }

  async saveAvailability(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    this._isSavingAvailability.set(true);

    const prefs: Partial<AvailabilityPreference>[] = [];
    for (const [day, data] of this._editingAvailability()) {
      prefs.push({
        dayOfWeek: day,
        isAvailable: data.available,
        preferredStart: data.available ? data.start : null,
        preferredEnd: data.available ? data.end : null,
        notes: data.notes || null,
      });
    }

    const success = await this.laborService.saveAvailability(staff.id, prefs);
    if (success) {
      this._isEditingAvailability.set(false);
      await this.loadAvailability();
    } else {
      this._error.set('Failed to save availability');
    }

    this._isSavingAvailability.set(false);
  }

  // === Swap Requests ===

  private async loadSwapRequests(): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const requests = await this.laborService.loadSwapRequests(staff.id);
    this._swapRequests.set(requests);
  }

  openSwapForm(): void {
    this._swapShiftId.set('');
    this._swapReason.set('');
    this._showSwapForm.set(true);
  }

  closeSwapForm(): void {
    this._showSwapForm.set(false);
  }

  setSwapShiftId(id: string): void {
    this._swapShiftId.set(id);
  }

  setSwapReason(reason: string): void {
    this._swapReason.set(reason);
  }

  async submitSwapRequest(): Promise<void> {
    const staff = this._loggedInStaff();
    const shiftId = this._swapShiftId();
    const reason = this._swapReason().trim();
    if (!staff || !shiftId || !reason) return;

    this._isSubmittingSwap.set(true);

    const result = await this.laborService.createSwapRequest(shiftId, staff.id, reason);
    if (result) {
      this._showSwapForm.set(false);
      await this.loadSwapRequests();
    } else {
      this._error.set('Failed to submit swap request');
    }

    this._isSubmittingSwap.set(false);
  }

  async respondToSwap(requestId: string, action: 'approved' | 'rejected'): Promise<void> {
    const staff = this._loggedInStaff();
    if (!staff) return;

    const success = await this.laborService.respondToSwapRequest(requestId, action, staff.id);
    if (success) {
      await this.loadSwapRequests();
    }
  }

  // === Helpers ===

  getShiftDuration(shift: Shift): number {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    const [endH, endM] = shift.endTime.split(':').map(Number);
    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) {
      endMinutes += 1440;
    }
    return (endMinutes - startMinutes) / 60 - (shift.breakMinutes / 60);
  }

  formatTime(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return `${DAY_ABBR[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  }

  getPositionColor(position: ShiftPosition): string {
    const colors: Record<ShiftPosition, string> = {
      server: '#4a90d9',
      cook: '#d94a4a',
      bartender: '#9b59b6',
      host: '#27ae60',
      manager: '#f39c12',
      expo: '#e67e22',
    };
    return colors[position] ?? '#6c757d';
  }

  getStatusClass(status: string): string {
    if (status === 'approved') return 'status-approved';
    if (status === 'rejected') return 'status-rejected';
    return 'status-pending';
  }

  dismissError(): void {
    this._error.set(null);
  }
}
