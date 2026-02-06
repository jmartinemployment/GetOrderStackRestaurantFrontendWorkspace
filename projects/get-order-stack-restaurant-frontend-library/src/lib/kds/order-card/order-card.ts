import { Component, input, output, computed, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Order, OrderStatus } from '../../models';
import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'get-order-stack-order-card',
  imports: [StatusBadge],
  templateUrl: './order-card.html',
  styleUrl: './order-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCard implements OnInit, OnDestroy {
  order = input.required<Order>();

  statusChange = output<{ orderId: string; status: OrderStatus }>();

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly _elapsedMinutes = signal(0);
  readonly elapsedMinutes = this._elapsedMinutes.asReadonly();

  readonly isUrgent = computed(() => this._elapsedMinutes() > 10);

  readonly orderTypeClass = computed(() => {
    switch (this.order().orderType) {
      case 'pickup': return 'order-type-pickup';
      case 'delivery': return 'order-type-delivery';
      case 'dine-in': return 'order-type-dinein';
      default: return '';
    }
  });

  readonly orderTypeLabel = computed(() => {
    switch (this.order().orderType) {
      case 'pickup': return 'Pickup';
      case 'delivery': return 'Delivery';
      case 'dine-in': return 'Dine-in';
      default: return '';
    }
  });

  readonly nextAction = computed<{ label: string; status: OrderStatus } | null>(() => {
    switch (this.order().status) {
      case 'pending': return { label: 'CONFIRM', status: 'confirmed' };
      case 'confirmed': return { label: 'START', status: 'preparing' };
      case 'preparing': return { label: 'READY', status: 'ready' };
      case 'ready': return { label: 'COMPLETE', status: 'completed' };
      default: return null;
    }
  });

  ngOnInit(): void {
    this.updateElapsedTime();
    this.timerInterval = setInterval(() => this.updateElapsedTime(), 60000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private updateElapsedTime(): void {
    const created = new Date(this.order().createdAt).getTime();
    const now = Date.now();
    const minutes = Math.floor((now - created) / 60000);
    this._elapsedMinutes.set(minutes);
  }

  onBump(): void {
    const action = this.nextAction();
    if (action) {
      this.statusChange.emit({ orderId: this.order().id, status: action.status });
    }
  }
}
