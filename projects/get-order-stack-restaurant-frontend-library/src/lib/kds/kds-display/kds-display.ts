import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { OrderService } from '../../services/order';
import { SocketService } from '../../services/socket';
import { AuthService } from '../../services/auth';
import { MenuService } from '../../services/menu';
import { OrderCard } from '../order-card/order-card';
import { ConnectionStatus } from '../../shared/connection-status/connection-status';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { Order, OrderStatus } from '../../models';

@Component({
  selector: 'get-order-stack-kds-display',
  imports: [OrderCard, ConnectionStatus, LoadingSpinner, ErrorDisplay],
  templateUrl: './kds-display.html',
  styleUrl: './kds-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KdsDisplay implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly socketService = inject(SocketService);
  private readonly authService = inject(AuthService);
  private readonly menuService = inject(MenuService);

  private readonly _rushedOrders = signal(new Set<string>());

  readonly pendingOrders = this.orderService.pendingOrders;
  readonly preparingOrders = this.orderService.preparingOrders;
  readonly readyOrders = this.orderService.readyOrders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly restaurantName = this.authService.selectedRestaurantName;

  // Prep time lookup map: menuItemId → prepTimeMinutes
  readonly prepTimeMap = computed(() => {
    const map = new Map<string, number>();
    for (const item of this.menuService.allItems()) {
      if (item.prepTimeMinutes) {
        map.set(item.id, item.prepTimeMinutes);
      }
    }
    return map;
  });

  // KDS stats
  readonly activeOrderCount = computed(() =>
    this.pendingOrders().length + this.preparingOrders().length
  );

  readonly overdueCount = computed(() => {
    const map = this.prepTimeMap();
    let count = 0;
    const activeOrders = [...this.pendingOrders(), ...this.preparingOrders()];
    for (const order of activeOrders) {
      const est = this.getOrderPrepTime(order, map);
      if (est > 0) {
        const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
        if (elapsed > est) count++;
      }
    }
    return count;
  });

  readonly avgWaitMinutes = computed(() => {
    const activeOrders = [...this.pendingOrders(), ...this.preparingOrders()];
    if (activeOrders.length === 0) return 0;
    const totalMinutes = activeOrders.reduce((sum, order) => {
      return sum + Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    }, 0);
    return Math.round(totalMinutes / activeOrders.length);
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadOrders();
      this.connectSocket();
      this.menuService.loadMenu();
    }
  }

  ngOnDestroy(): void {
    this.socketService.disconnect();
  }

  private loadOrders(): void {
    this.orderService.loadOrders(50);
  }

  private connectSocket(): void {
    const restaurantId = this.authService.selectedRestaurantId();
    if (restaurantId) {
      this.socketService.connect(restaurantId);
    }
  }

  getEstimatedPrep(order: Order): number {
    return this.getOrderPrepTime(order, this.prepTimeMap());
  }

  isRushed(orderId: string): boolean {
    return this._rushedOrders().has(orderId);
  }

  toggleRush(orderId: string): void {
    this._rushedOrders.update(set => {
      const updated = new Set(set);
      if (updated.has(orderId)) {
        updated.delete(orderId);
      } else {
        updated.add(orderId);
      }
      return updated;
    });
  }

  onStatusChange(event: { orderId: string; status: OrderStatus }): void {
    this.orderService.updateOrderStatus(event.orderId, event.status);
  }

  refresh(): void {
    this.loadOrders();
  }

  clearError(): void {
    this.orderService.clearError();
  }

  private getOrderPrepTime(order: Order, map: Map<string, number>): number {
    if (order.items.length === 0) return 0;
    let maxPrep = 0;
    for (const item of order.items) {
      const prep = map.get(item.menuItemId) ?? 0;
      if (prep > maxPrep) maxPrep = prep;
    }
    return maxPrep;
  }
}
