import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from '../models';
import { AuthService } from './auth';
import { SocketService } from './socket';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _orders = signal<Order[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly orders = this._orders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals - KDS columns
  readonly pendingOrders = computed(() =>
    this._orders().filter(o => o.status === 'pending' || o.status === 'confirmed')
  );

  readonly preparingOrders = computed(() =>
    this._orders().filter(o => o.status === 'preparing')
  );

  readonly readyOrders = computed(() =>
    this._orders().filter(o => o.status === 'ready')
  );

  readonly completedOrders = computed(() =>
    this._orders().filter(o => o.status === 'completed')
  );

  readonly activeOrderCount = computed(() =>
    this._orders().filter(o =>
      o.status !== 'completed' && o.status !== 'cancelled'
    ).length
  );

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  constructor() {
    this.socketService.onOrderEvent((event) => {
      this.handleOrderEvent(event.type, event.order);
    });
  }

  private handleOrderEvent(type: 'new' | 'updated' | 'cancelled', order: Order): void {
    this._orders.update(orders => {
      const index = orders.findIndex(o => o.id === order.id);

      if (type === 'new' && index === -1) {
        return [order, ...orders];
      }

      if (type === 'cancelled' && index !== -1) {
        return orders.filter(o => o.id !== order.id);
      }

      if (type === 'updated' && index !== -1) {
        const updated = [...orders];
        updated[index] = order;
        return updated;
      }

      return orders;
    });
  }

  async loadOrders(limit = 50): Promise<void> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const orders = await firstValueFrom(
        this.http.get<Order[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders?limit=${limit}`
        )
      );
      this._orders.set(orders || []);
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to load orders';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createOrder(orderData: Partial<Order>): Promise<Order | null> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const order = await firstValueFrom(
        this.http.post<Order>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders`,
          orderData
        )
      );

      this._orders.update(orders => [order, ...orders]);

      return order;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to create order';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updatedOrder = await firstValueFrom(
        this.http.patch<Order>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/status`,
          { status }
        )
      );

      this._orders.update(orders =>
        orders.map(o => o.id === orderId ? updatedOrder : o)
      );

      return true;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to update order status';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async confirmOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'confirmed');
  }

  async startPreparing(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'preparing');
  }

  async markReady(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'ready');
  }

  async completeOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'completed');
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  async getProfitInsight(orderId: string): Promise<any> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/profit-insight`
        )
      );
    } catch {
      return null;
    }
  }

  getOrderById(orderId: string): Order | undefined {
    return this._orders().find(o => o.id === orderId);
  }

  clearError(): void {
    this._error.set(null);
  }
}
