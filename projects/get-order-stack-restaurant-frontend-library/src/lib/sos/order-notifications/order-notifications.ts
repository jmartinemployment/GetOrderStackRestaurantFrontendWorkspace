import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Order, OrderStatus } from '../../models';
import { SocketService, OrderEvent } from '../../services/socket';

type NotificationType = 'success' | 'info' | 'warning' | 'urgent';

interface Notification {
  id: string;
  order: Order;
  message: string;
  type: NotificationType;
  timestamp: Date;
  eventType: OrderEvent['type'];
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
  private readonly _soundEnabled = signal(true);
  private readonly _desktopEnabled = signal(false);

  readonly notifications = this._notifications.asReadonly();
  readonly soundEnabled = this._soundEnabled.asReadonly();
  readonly desktopEnabled = this._desktopEnabled.asReadonly();

  readonly notificationCount = computed(() => this._notifications().length);

  private readonly autoDismissMs = 15000;
  private unsubscribe: (() => void) | null = null;
  private audioContext: AudioContext | null = null;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;

  // Force re-render for elapsed time display
  private readonly _tick = signal(0);
  readonly tick = this._tick.asReadonly();

  ngOnInit(): void {
    this.unsubscribe = this.socketService.onOrderEvent((event) => {
      this.handleOrderEvent(event);
    });

    // Tick every 30s to update elapsed times
    this.elapsedInterval = setInterval(() => {
      this._tick.update(t => t + 1);
    }, 30000);

    // Check desktop notification permission
    if ('Notification' in globalThis && Notification.permission === 'granted') {
      this._desktopEnabled.set(true);
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  private handleOrderEvent(event: OrderEvent): void {
    const order = event.order;
    const deviceId = this.socketService.deviceId();

    // For 'new' events, only show if it's NOT from this device (staff sees incoming orders)
    // For 'updated'/'cancelled', show if it IS from this device (customer sees their updates)
    if (event.type === 'new') {
      if (order.sourceDeviceId === deviceId) return;
    } else {
      if (order.sourceDeviceId && order.sourceDeviceId !== deviceId) return;
    }

    this.addNotification(order, order.status, event.type);
  }

  addNotification(order: Order, status: OrderStatus, eventType: OrderEvent['type']): void {
    const message = this.getStatusMessage(order, status, eventType);
    const type = this.getNotificationType(status, eventType, order);

    const notification: Notification = {
      id: crypto.randomUUID(),
      order,
      message,
      type,
      timestamp: new Date(),
      eventType,
    };

    this._notifications.update(notifications => [notification, ...notifications]);

    // Play sound
    if (this._soundEnabled()) {
      this.playSound(type);
    }

    // Desktop notification
    if (this._desktopEnabled()) {
      this.showDesktopNotification(notification);
    }

    // Auto-dismiss — urgent notifications stay longer
    const dismissMs = type === 'urgent' ? this.autoDismissMs * 2 : this.autoDismissMs;
    setTimeout(() => {
      this.dismissNotification(notification.id);
    }, dismissMs);
  }

  dismissNotification(id: string): void {
    this._notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  clearAll(): void {
    this._notifications.set([]);
  }

  toggleSound(): void {
    this._soundEnabled.update(v => !v);
  }

  async requestDesktopPermission(): Promise<void> {
    if (!('Notification' in globalThis)) return;

    if (Notification.permission === 'granted') {
      this._desktopEnabled.set(true);
      return;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this._desktopEnabled.set(permission === 'granted');
    }
  }

  getElapsedText(timestamp: Date): string {
    // Reference tick to trigger reactivity
    this._tick();
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  }

  private getStatusMessage(order: Order, status: OrderStatus, eventType: OrderEvent['type']): string {
    const orderNumber = order.orderNumber || order.id.slice(-4).toUpperCase();

    if (eventType === 'new') {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      return `New order #${orderNumber} — ${itemCount} item${itemCount !== 1 ? 's' : ''} ($${order.total.toFixed(2)})`;
    }

    switch (status) {
      case 'confirmed':
        return `Order #${orderNumber} confirmed`;
      case 'preparing':
        return `Order #${orderNumber} is being prepared`;
      case 'ready':
        return `Order #${orderNumber} is READY for pickup!`;
      case 'completed':
        return `Order #${orderNumber} completed`;
      case 'cancelled':
        return `Order #${orderNumber} cancelled`;
      default:
        return `Order #${orderNumber} status updated`;
    }
  }

  private getNotificationType(
    status: OrderStatus,
    eventType: OrderEvent['type'],
    order: Order
  ): NotificationType {
    // New incoming orders are urgent for staff
    if (eventType === 'new') return 'urgent';

    // Cancelled orders are warnings
    if (eventType === 'cancelled' || status === 'cancelled') return 'warning';

    // Ready orders are success + high priority
    if (status === 'ready') return 'success';

    // Orders waiting a long time to be confirmed get urgency
    if (status === 'confirmed') {
      const waitMs = Date.now() - new Date(order.createdAt).getTime();
      if (waitMs > 5 * 60 * 1000) return 'urgent'; // >5 min wait
    }

    if (status === 'completed') return 'success';

    return 'info';
  }

  private playSound(type: NotificationType): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.value = 0.15;

      switch (type) {
        case 'urgent': {
          // Double beep — high pitch
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        }
        case 'success': {
          // Rising chime
          oscillator.frequency.value = 523;
          oscillator.frequency.setValueAtTime(523, ctx.currentTime);
          oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.45);
          break;
        }
        case 'warning': {
          // Low tone
          oscillator.frequency.value = 330;
          oscillator.type = 'triangle';
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.35);
          break;
        }
        default: {
          // Simple blip
          oscillator.frequency.value = 660;
          oscillator.type = 'sine';
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        }
      }
    } catch {
      // AudioContext may not be available
    }
  }

  private showDesktopNotification(notification: Notification): void {
    try {
      const title = notification.type === 'urgent'
        ? 'New Order!'
        : 'Order Update';

      new Notification(title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.order.id,
        requireInteraction: notification.type === 'urgent',
      });
    } catch {
      // Desktop notifications may not be available
    }
  }
}
