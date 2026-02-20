import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrderService } from '../../services/order';
import { PaymentService } from '../../services/payment';
import { DeliveryService } from '../../services/delivery';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { StatusBadge } from '../../kds/status-badge/status-badge';
import {
  Order,
  GuestOrderStatus,
  ProfitInsight,
  getOrderIdentifier,
  isMarketplaceOrder,
  getMarketplaceProviderLabel,
  getMarketplaceSyncState,
  getMarketplaceSyncStateLabel,
  getMarketplaceSyncClass,
  MarketplaceSyncState,
} from '../../models';

@Component({
  selector: 'get-order-stack-order-history',
  imports: [CurrencyPipe, DatePipe, LoadingSpinner, ErrorDisplay, StatusBadge],
  templateUrl: './order-history.html',
  styleUrl: './order-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistory implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly paymentService = inject(PaymentService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly authService = inject(AuthService);

  private readonly _statusFilter = signal<GuestOrderStatus | 'all'>('all');
  private readonly _marketplaceFilter = signal<'all' | 'marketplace' | 'native'>('all');
  private readonly _selectedOrder = signal<Order | null>(null);
  private readonly _isRetryingMarketplaceSync = signal(false);
  private readonly _marketplaceSyncNotice = signal<string | null>(null);

  private readonly _profitInsights = signal<Map<string, ProfitInsight>>(new Map());
  readonly profitInsights = this._profitInsights.asReadonly();

  readonly statusFilter = this._statusFilter.asReadonly();
  readonly marketplaceFilter = this._marketplaceFilter.asReadonly();
  readonly selectedOrder = this._selectedOrder.asReadonly();
  readonly isRetryingMarketplaceSync = this._isRetryingMarketplaceSync.asReadonly();
  readonly marketplaceSyncNotice = this._marketplaceSyncNotice.asReadonly();
  readonly canManageMarketplaceSync = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly orders = this.orderService.orders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;

  readonly filteredOrders = computed(() => {
    const statusFilter = this._statusFilter();
    const sourceFilter = this._marketplaceFilter();
    return this.orders().filter(order => {
      const matchesStatus = statusFilter === 'all' || order.guestOrderStatus === statusFilter;
      if (!matchesStatus) return false;
      if (sourceFilter === 'all') return true;
      const marketplace = isMarketplaceOrder(order);
      return sourceFilter === 'marketplace' ? marketplace : !marketplace;
    });
  });

  readonly statusOptions: { value: GuestOrderStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Orders' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'IN_PREPARATION', label: 'Preparing' },
    { value: 'READY_FOR_PICKUP', label: 'Ready' },
    { value: 'CLOSED', label: 'Completed' },
    { value: 'VOIDED', label: 'Cancelled' },
  ];
  readonly marketplaceFilterOptions: Array<{ value: 'all' | 'marketplace' | 'native'; label: string }> = [
    { value: 'all', label: 'All Sources' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'native', label: 'Direct' },
  ];

  ngOnInit(): void {
    this.orderService.loadOrders();
  }

  setStatusFilter(status: GuestOrderStatus | 'all'): void {
    this._statusFilter.set(status);
  }

  setMarketplaceFilter(filter: 'all' | 'marketplace' | 'native'): void {
    this._marketplaceFilter.set(filter);
  }

  selectOrder(order: Order): void {
    this._selectedOrder.set(order);
    this._marketplaceSyncNotice.set(null);
  }

  closeOrderDetail(): void {
    this._selectedOrder.set(null);
    this._marketplaceSyncNotice.set(null);
  }

  getOrderNumber(order: Order): string {
    return getOrderIdentifier(order);
  }

  async fetchProfitInsight(order: Order): Promise<void> {
    if (this._profitInsights().has(order.guid)) return;
    const insight = await this.orderService.getProfitInsight(order.guid);
    if (insight) {
      this._profitInsights.update(map => {
        const updated = new Map(map);
        updated.set(order.guid, insight);
        return updated;
      });
    }
  }

  getInsight(orderId: string): ProfitInsight | undefined {
    return this._profitInsights().get(orderId);
  }

  isMarketplace(order: Order): boolean {
    return isMarketplaceOrder(order);
  }

  marketplaceProviderLabel(order: Order): string {
    return getMarketplaceProviderLabel(order) ?? 'Marketplace';
  }

  marketplaceSyncState(order: Order): MarketplaceSyncState | null {
    return getMarketplaceSyncState(order);
  }

  marketplaceSyncLabel(order: Order): string {
    return getMarketplaceSyncStateLabel(this.marketplaceSyncState(order));
  }

  marketplaceSyncClass(order: Order): string {
    return getMarketplaceSyncClass(order);
  }

  async retryMarketplaceSync(order: Order): Promise<void> {
    if (!this.canManageMarketplaceSync()) return;
    if (!isMarketplaceOrder(order)) return;
    if (this._isRetryingMarketplaceSync()) return;

    this._isRetryingMarketplaceSync.set(true);
    this._marketplaceSyncNotice.set(null);
    try {
      const ok = await this.deliveryService.retryMarketplaceSyncForOrder(order);
      if (!ok) {
        this._marketplaceSyncNotice.set(this.deliveryService.error() ?? 'Marketplace sync retry failed');
        return;
      }
      this._marketplaceSyncNotice.set('Marketplace sync retry queued.');
      this.orderService.loadOrders();
    } finally {
      this._isRetryingMarketplaceSync.set(false);
    }
  }

  private readonly _isRefunding = signal(false);
  private readonly _refundError = signal<string | null>(null);
  private readonly _refundSuccess = signal(false);

  readonly isRefunding = this._isRefunding.asReadonly();
  readonly refundError = this._refundError.asReadonly();
  readonly refundSuccess = this._refundSuccess.asReadonly();

  getPaymentBadgeClass(status: string): string {
    switch (status) {
      case 'PAID': return 'payment-paid';
      case 'OPEN': return 'payment-pending';
      case 'CLOSED': return 'payment-refunded';
      default: return 'payment-pending';
    }
  }

  getPaymentLabel(status: string): string {
    switch (status) {
      case 'PAID': return 'Paid';
      case 'OPEN': return 'Unpaid';
      case 'CLOSED': return 'Closed';
      default: return status;
    }
  }

  async refundOrder(order: Order): Promise<void> {
    this._isRefunding.set(true);
    this._refundError.set(null);
    this._refundSuccess.set(false);

    const result = await this.paymentService.requestRefund(order.guid);

    this._isRefunding.set(false);

    if (result?.success) {
      this._refundSuccess.set(true);
    } else {
      this._refundError.set(this.paymentService.error() ?? 'Refund failed');
    }
  }

  dismissRefundStatus(): void {
    this._refundError.set(null);
    this._refundSuccess.set(false);
  }

  retry(): void {
    this.orderService.loadOrders();
  }

  getDeliveryStateLabel(state: string): string {
    switch (state) {
      case 'PREPARING': return 'Preparing';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      default: return state;
    }
  }
}
