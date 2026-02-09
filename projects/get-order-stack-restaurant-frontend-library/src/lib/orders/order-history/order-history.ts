import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderService } from '../../services/order';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { StatusBadge } from '../../kds/status-badge/status-badge';
import { Order, OrderStatus, ProfitInsight } from '../../models';

@Component({
  selector: 'get-order-stack-order-history',
  imports: [CurrencyPipe, DatePipe, LoadingSpinner, ErrorDisplay, StatusBadge],
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistory implements OnInit {
  private readonly orderService = inject(OrderService);

  private readonly _statusFilter = signal<OrderStatus | 'all'>('all');
  private readonly _selectedOrder = signal<Order | null>(null);

  private readonly _profitInsights = signal<Map<string, ProfitInsight>>(new Map());
  readonly profitInsights = this._profitInsights.asReadonly();

  readonly statusFilter = this._statusFilter.asReadonly();
  readonly selectedOrder = this._selectedOrder.asReadonly();

  readonly orders = this.orderService.orders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;

  readonly filteredOrders = computed(() => {
    const filter = this._statusFilter();
    if (filter === 'all') return this.orders();
    return this.orders().filter(order => order.status === filter);
  });

  readonly statusOptions: { value: OrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  ngOnInit(): void {
    this.orderService.loadOrders();
  }

  setStatusFilter(status: OrderStatus | 'all'): void {
    this._statusFilter.set(status);
  }

  selectOrder(order: Order): void {
    this._selectedOrder.set(order);
  }

  closeOrderDetail(): void {
    this._selectedOrder.set(null);
  }

  getOrderNumber(order: Order): string {
    return order.orderNumber || order.id.slice(-4).toUpperCase();
  }

  async fetchProfitInsight(order: Order): Promise<void> {
    if (this._profitInsights().has(order.id)) return;
    const insight = await this.orderService.getProfitInsight(order.id);
    if (insight) {
      this._profitInsights.update(map => {
        const updated = new Map(map);
        updated.set(order.id, insight);
        return updated;
      });
    }
  }

  getInsight(orderId: string): ProfitInsight | undefined {
    return this._profitInsights().get(orderId);
  }

  retry(): void {
    this.orderService.loadOrders();
  }
}
