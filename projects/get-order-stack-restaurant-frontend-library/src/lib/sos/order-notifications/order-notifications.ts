import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Order, OrderStatus } from '../../models';
import { SocketService, OrderEvent } from '../../services/socket';

interface Notification {
  id: string;
  order: Order;
  message: string;
  type: 'success' | 'info' | 'warning';
  timestamp: Date;
}

@Component({
  selector: 'get-order-stack-order-notifications',
  imports: [],
  templateUrl: './order-notifications.html',
  styleUrl: './order-notifications.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderNotifications implements OnInit, OnDestroy {
  private readonly socketService = inject(SocketService);

  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private readonly autoDismissMs = 10000; // 10 seconds
  private unsubscribe: (() => void) | null = null;

  ngOnInit(): void {
    // Subscribe to order events from socket
    this.unsubscribe = this.socketService.onOrderEvent((event) => {
      this.handleOrderEvent(event);
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  private handleOrderEvent(event: OrderEvent): void {
    const order = event.order;
    const deviceId = this.socketService.deviceId();

    // Only show notifications for orders from this device
    if (order.sourceDeviceId && order.sourceDeviceId !== deviceId) {
      return;
    }

    // Only show notifications for status updates (not new orders from this device)
    if (event.type === 'updated') {
      this.addNotification(order, order.status);
    }
  }

  addNotification(order: Order, status: OrderStatus): void {
    const message = this.getStatusMessage(order, status);
    const type = this.getNotificationType(status);

    const notification: Notification = {
      id: crypto.randomUUID(),
      order,
      message,
      type,
      timestamp: new Date(),
    };

    this._notifications.update(notifications => [notification, ...notifications]);

    // Auto-dismiss after timeout
    setTimeout(() => {
      this.dismissNotification(notification.id);
    }, this.autoDismissMs);
  }

  dismissNotification(id: string): void {
    this._notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  clearAll(): void {
    this._notifications.set([]);
  }

  private getStatusMessage(order: Order, status: OrderStatus): string {
    const orderNumber = order.orderNumber || order.id.slice(-4).toUpperCase();

    switch (status) {
      case 'confirmed':
        return `Order #${orderNumber} has been confirmed`;
      case 'preparing':
        return `Order #${orderNumber} is being prepared`;
      case 'ready':
        return `Order #${orderNumber} is ready for pickup!`;
      case 'completed':
        return `Order #${orderNumber} has been completed`;
      case 'cancelled':
        return `Order #${orderNumber} has been cancelled`;
      default:
        return `Order #${orderNumber} status updated`;
    }
  }

  private getNotificationType(status: OrderStatus): 'success' | 'info' | 'warning' {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'warning';
      default:
        return 'info';
    }
  }
}
