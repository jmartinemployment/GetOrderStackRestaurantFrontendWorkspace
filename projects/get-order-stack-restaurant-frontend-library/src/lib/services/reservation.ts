import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Reservation, ReservationFormData, ReservationStatus } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _reservations = signal<Reservation[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly reservations = this._reservations.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly todayReservations = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this._reservations().filter(r => r.reservationTime.startsWith(today));
  });

  readonly upcomingReservations = computed(() => {
    const now = new Date().toISOString();
    return this._reservations()
      .filter(r => r.reservationTime > now && r.status !== 'cancelled' && r.status !== 'no-show')
      .sort((a, b) => a.reservationTime.localeCompare(b.reservationTime));
  });

  readonly pastReservations = computed(() => {
    const now = new Date().toISOString();
    return this._reservations()
      .filter(r => r.reservationTime < now || r.status === 'completed' || r.status === 'cancelled' || r.status === 'no-show')
      .sort((a, b) => b.reservationTime.localeCompare(a.reservationTime));
  });

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadReservations(): Promise<void> {
    if (!this.restaurantId) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<Reservation[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations`
        )
      );
      this._reservations.set(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load reservations';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createReservation(data: ReservationFormData): Promise<Reservation | null> {
    if (!this.restaurantId) return null;

    try {
      const reservation = await firstValueFrom(
        this.http.post<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations`,
          data
        )
      );
      this._reservations.update(list => [reservation, ...list]);
      return reservation;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create reservation';
      this._error.set(message);
      return null;
    }
  }

  async updateStatus(reservationId: string, status: ReservationStatus): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/${reservationId}`,
          { status }
        )
      );
      this._reservations.update(list =>
        list.map(r => r.id === reservationId ? updated : r)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update reservation';
      this._error.set(message);
      return false;
    }
  }

  async assignTable(reservationId: string, tableNumber: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    try {
      const updated = await firstValueFrom(
        this.http.patch<Reservation>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/reservations/${reservationId}`,
          { tableNumber }
        )
      );
      this._reservations.update(list =>
        list.map(r => r.id === reservationId ? updated : r)
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign table';
      this._error.set(message);
      return false;
    }
  }

  async cancelReservation(reservationId: string): Promise<boolean> {
    return this.updateStatus(reservationId, 'cancelled');
  }

  clearError(): void {
    this._error.set(null);
  }
}
