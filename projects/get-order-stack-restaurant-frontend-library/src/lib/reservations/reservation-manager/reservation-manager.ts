import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ReservationService } from '../../services/reservation';
import { TableService } from '../../services/table';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { Reservation, ReservationTab, ReservationStatus } from '../../models';

@Component({
  selector: 'get-order-stack-reservations',
  imports: [ReactiveFormsModule, DatePipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './reservation-manager.html',
  styleUrl: './reservation-manager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationManager {
  private readonly fb = inject(FormBuilder);
  private readonly reservationService = inject(ReservationService);
  private readonly tableService = inject(TableService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<ReservationTab>('today');
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _selectedReservation = signal<Reservation | null>(null);
  private readonly _localError = signal<string | null>(null);

  readonly activeTab = this._activeTab.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly selectedReservation = this._selectedReservation.asReadonly();
  readonly localError = this._localError.asReadonly();

  readonly isLoading = this.reservationService.isLoading;
  readonly todayReservations = this.reservationService.todayReservations;
  readonly upcomingReservations = this.reservationService.upcomingReservations;
  readonly pastReservations = this.reservationService.pastReservations;
  readonly tables = this.tableService.tables;

  readonly availableTables = computed(() =>
    this.tableService.tables().filter(t => t.status === 'available' && t.active)
  );

  readonly todayCount = computed(() => this.todayReservations().length);
  readonly upcomingCount = computed(() => this.upcomingReservations().length);
  readonly totalSeats = computed(() =>
    this.todayReservations()
      .filter(r => r.status !== 'cancelled' && r.status !== 'no-show')
      .reduce((sum, r) => sum + r.partySize, 0)
  );

  readonly reservationForm = this.fb.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required]],
    customerEmail: [''],
    partySize: [2, [Validators.required, Validators.min(1), Validators.max(20)]],
    reservationDate: ['', Validators.required],
    reservationTime: ['', Validators.required],
    tableNumber: [''],
    specialRequests: [''],
  });

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedRestaurantId()) {
        this.reservationService.loadReservations();
        this.tableService.loadTables();
      }
    });
  }

  setTab(tab: ReservationTab): void {
    this._activeTab.set(tab);
  }

  openForm(): void {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours() + 1).padStart(2, '0')}:00`;

    this.reservationForm.reset({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      partySize: 2,
      reservationDate: dateStr,
      reservationTime: timeStr,
      tableNumber: '',
      specialRequests: '',
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this.reservationForm.reset();
  }

  async saveReservation(): Promise<void> {
    if (this.reservationForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);
    this._localError.set(null);

    try {
      const form = this.reservationForm.value;
      const reservationTime = `${form.reservationDate}T${form.reservationTime}:00`;

      const result = await this.reservationService.createReservation({
        customerName: form.customerName!,
        customerPhone: form.customerPhone!,
        customerEmail: form.customerEmail || undefined,
        partySize: form.partySize!,
        reservationTime,
        tableNumber: form.tableNumber || undefined,
        specialRequests: form.specialRequests || undefined,
      });

      if (result) {
        this.closeForm();
      } else {
        this._localError.set(this.reservationService.error() ?? 'Failed to create reservation');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSaving.set(false);
    }
  }

  async updateStatus(reservation: Reservation, status: ReservationStatus): Promise<void> {
    this._localError.set(null);
    const success = await this.reservationService.updateStatus(reservation.id, status);
    if (!success) {
      this._localError.set(this.reservationService.error() ?? 'Failed to update status');
    }
  }

  selectReservation(reservation: Reservation): void {
    this._selectedReservation.set(reservation);
  }

  closeDetail(): void {
    this._selectedReservation.set(null);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'seated': return 'status-seated';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      case 'no-show': return 'status-noshow';
      default: return 'status-pending';
    }
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.reservationService.loadReservations();
  }
}
