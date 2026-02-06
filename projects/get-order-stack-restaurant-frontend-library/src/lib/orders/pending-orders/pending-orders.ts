import { Component, inject, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { OrderService } from '../../services/order';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { StatusBadge } from '../../kds/status-badge/status-badge';
import { Order } from '../../models';

@Component({
  selector: 'get-order-stack-pending-orders',
  imports: [CurrencyPipe, LoadingSpinner, ErrorDisplay, StatusBadge],
  templateUrl: './pending-orders.html',
  styleUrl: './pending-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingOrders implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly orders = this.orderService.orders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;

  readonly pendingOrders = computed(() =>
    this.orders().filter(order =>
      ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  );

  readonly orderCounts = computed(() => {
    const orders = this.orders();
    return {
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
    };
  });

  ngOnInit(): void {
    this.orderService.loadOrders();
  }

  getOrderNumber(order: Order): string {
    return order.orderNumber || order.id.slice(-4).toUpperCase();
  }

  getTimeSinceOrder(order: Order): string {
    const minutes = Math.floor(
      (Date.now() - new Date(order.createdAt).getTime()) / 60000
    );
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  }

  async confirmOrder(order: Order): Promise<void> {
    await this.orderService.confirmOrder(order.id);
  }

  async startPreparing(order: Order): Promise<void> {
    await this.orderService.startPreparing(order.id);
  }

  async markReady(order: Order): Promise<void> {
    await this.orderService.markReady(order.id);
  }

  async completeOrder(order: Order): Promise<void> {
    await this.orderService.completeOrder(order.id);
  }

  async cancelOrder(order: Order): Promise<void> {
    if (!confirm(`Cancel order #${this.getOrderNumber(order)}?`)) return;

    await this.orderService.cancelOrder(order.id);
  }

  retry(): void {
    this.orderService.loadOrders();
  }
}
