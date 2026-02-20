import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  StaffMember,
  Shift,
  ShiftFormData,
  TimeEntry,
  LaborReport,
  LaborRecommendation,
  LaborTarget,
  SwapRequest,
  AvailabilityPreference,
  StaffEarnings,
} from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LaborService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _staffMembers = signal<StaffMember[]>([]);
  private readonly _shifts = signal<Shift[]>([]);
  private readonly _activeClocks = signal<TimeEntry[]>([]);
  private readonly _laborReport = signal<LaborReport | null>(null);
  private readonly _recommendations = signal<LaborRecommendation[]>([]);
  private readonly _laborTargets = signal<LaborTarget[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly staffMembers = this._staffMembers.asReadonly();
  readonly shifts = this._shifts.asReadonly();
  readonly activeClocks = this._activeClocks.asReadonly();
  readonly laborReport = this._laborReport.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();
  readonly laborTargets = this._laborTargets.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadStaffMembers(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<StaffMember[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/pins`
        )
      );
      this._staffMembers.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load staff members';
      this._error.set(message);
    }
  }

  async loadShifts(startDate: string, endDate: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Shift[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts`,
          { params: { startDate, endDate } }
        )
      );
      this._shifts.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load shifts';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createShift(data: ShiftFormData): Promise<Shift | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<Shift>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts`,
          data
        )
      );
      this._shifts.update(s => [...s, result]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create shift';
      this._error.set(message);
      return null;
    }
  }

  async updateShift(shiftId: string, data: Partial<ShiftFormData>): Promise<Shift | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.patch<Shift>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts/${shiftId}`,
          data
        )
      );
      this._shifts.update(s => s.map(sh => sh.id === shiftId ? result : sh));
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update shift';
      this._error.set(message);
      return null;
    }
  }

  async deleteShift(shiftId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts/${shiftId}`
        )
      );
      this._shifts.update(s => s.filter(sh => sh.id !== shiftId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete shift';
      this._error.set(message);
      return false;
    }
  }

  async publishWeek(weekStartDate: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts/publish`,
          { weekStartDate }
        )
      );
      this._shifts.update(s => s.map(sh => ({ ...sh, isPublished: true })));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish week';
      this._error.set(message);
      return false;
    }
  }

  async clockIn(staffPinId: string, shiftId?: string): Promise<TimeEntry | null> {
    if (!this.restaurantId) return null;

    this._error.set(null);

    try {
      const result = await firstValueFrom(
        this.http.post<TimeEntry>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/clock-in`,
          { staffPinId, shiftId }
        )
      );
      this._activeClocks.update(c => [...c, result]);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock in';
      this._error.set(message);
      return null;
    }
  }

  async clockOut(timeEntryId: string, breakMinutes?: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/clock-out/${timeEntryId}`,
          { breakMinutes }
        )
      );
      this._activeClocks.update(c => c.filter(e => e.id !== timeEntryId));
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clock out';
      this._error.set(message);
      return false;
    }
  }

  async loadActiveClocks(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<TimeEntry[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/active-clocks`
        )
      );
      this._activeClocks.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load active clocks';
      this._error.set(message);
    }
  }

  async loadLaborReport(startDate: string, endDate: string): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<LaborReport>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-report`,
          { params: { startDate, endDate } }
        )
      );
      this._laborReport.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load labor report';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadRecommendations(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<LaborRecommendation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-recommendations`
        )
      );
      this._recommendations.set(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load recommendations';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadTargets(): Promise<void> {
    if (!this.restaurantId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<LaborTarget[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-targets`
        )
      );
      // Cast targetPercent from Prisma Decimal (string) to number
      this._laborTargets.set(data.map(t => ({
        ...t,
        targetPercent: Number(t.targetPercent),
        targetCost: t.targetCost !== null ? Number(t.targetCost) : null,
      })));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load labor targets';
      this._error.set(message);
    }
  }

  // --- Staff Portal methods ---

  async validateStaffPin(pin: string): Promise<StaffMember | null> {
    if (!this.restaurantId) return null;

    try {
      const result = await firstValueFrom(
        this.http.post<{ valid: boolean; staffPinId: string; name: string; role: string }>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/auth/validate-pin`,
          { pin }
        )
      );
      if (result.valid) {
        return { id: result.staffPinId, name: result.name, role: result.role };
      }
      return null;
    } catch {
      return null;
    }
  }

  async loadStaffShifts(staffPinId: string, startDate: string, endDate: string): Promise<Shift[]> {
    if (!this.restaurantId) return [];

    try {
      const data = await firstValueFrom(
        this.http.get<Shift[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/shifts`,
          { params: { startDate, endDate, staffPinId } }
        )
      );
      return data;
    } catch {
      return [];
    }
  }

  async loadStaffEarnings(staffPinId: string, startDate: string, endDate: string): Promise<StaffEarnings | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<StaffEarnings>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/earnings`,
          { params: { startDate, endDate } }
        )
      );
    } catch {
      return null;
    }
  }

  async loadAvailability(staffPinId: string): Promise<AvailabilityPreference[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<AvailabilityPreference[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/availability`
        )
      );
    } catch {
      return [];
    }
  }

  async saveAvailability(staffPinId: string, prefs: Partial<AvailabilityPreference>[]): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/availability`,
          { preferences: prefs }
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async loadSwapRequests(staffPinId: string): Promise<SwapRequest[]> {
    if (!this.restaurantId) return [];

    try {
      return await firstValueFrom(
        this.http.get<SwapRequest[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/${staffPinId}/swap-requests`
        )
      );
    } catch {
      return [];
    }
  }

  async createSwapRequest(shiftId: string, requestorPinId: string, reason: string): Promise<SwapRequest | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.post<SwapRequest>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/swap-requests`,
          { shiftId, requestorPinId, reason }
        )
      );
    } catch {
      return null;
    }
  }

  async respondToSwapRequest(requestId: string, action: 'approved' | 'rejected', respondedBy: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/swap-requests/${requestId}`,
          { status: action, respondedBy }
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  async setTarget(dayOfWeek: number, targetPercent: number, targetCost?: number): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.put(
          `${this.apiUrl}/restaurant/${this.restaurantId}/staff/labor-targets`,
          { dayOfWeek, targetPercent, targetCost }
        )
      );
      await this.loadTargets();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set labor target';
      this._error.set(message);
      return false;
    }
  }
}
