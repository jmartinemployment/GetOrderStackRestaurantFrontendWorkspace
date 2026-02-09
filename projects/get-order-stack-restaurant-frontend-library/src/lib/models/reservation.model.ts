export type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no-show';

export interface Reservation {
  id: string;
  restaurantId: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  partySize: number;
  reservationTime: string;
  tableNumber: string | null;
  status: ReservationStatus;
  specialRequests: string | null;
  confirmationSent: boolean;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationFormData {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  tableNumber?: string;
  specialRequests?: string;
}

export type ReservationTab = 'upcoming' | 'today' | 'past';
export type ReservationViewMode = 'list' | 'timeline';
