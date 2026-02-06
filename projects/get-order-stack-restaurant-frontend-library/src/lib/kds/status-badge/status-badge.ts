import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { OrderStatus } from '../../models';

@Component({
  selector: 'get-order-stack-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  status = input.required<OrderStatus>();

  readonly badgeClass = computed(() => {
    switch (this.status()) {
      case 'pending': return 'bg-secondary';
      case 'confirmed': return 'bg-info';
      case 'preparing': return 'bg-warning text-dark';
      case 'ready': return 'bg-success';
      case 'completed': return 'bg-primary';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  });

  readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return this.status();
    }
  });
}
