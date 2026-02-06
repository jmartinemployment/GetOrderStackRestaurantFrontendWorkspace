import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth';
import { Order } from '../models';
import { environment } from '../environments/environment';

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'polling';

export interface OrderEvent {
  type: 'new' | 'updated' | 'cancelled';
  order: Order;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly socketUrl = environment.socketUrl;

  private socket: Socket | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  // Private writable signals
  private readonly _connectionStatus = signal<SocketConnectionStatus>('disconnected');
  private readonly _deviceId = signal<string>(this.getOrCreateDeviceId());
  private readonly _lastOrderEvent = signal<OrderEvent | null>(null);

  // Public readonly signals
  readonly connectionStatus = this._connectionStatus.asReadonly();
  readonly deviceId = this._deviceId.asReadonly();
  readonly lastOrderEvent = this._lastOrderEvent.asReadonly();

  // Computed signals
  readonly isConnected = computed(() => this._connectionStatus() === 'connected');
  readonly isPolling = computed(() => this._connectionStatus() === 'polling');

  // Event callbacks
  private orderCallbacks: Array<(event: OrderEvent) => void> = [];

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  connect(restaurantId: string): void {
    if (this.socket?.connected) {
      this.joinRestaurant(restaurantId);
      return;
    }

    this._connectionStatus.set('connecting');

    this.socket = io(this.socketUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: this.authService.token(),
        deviceId: this._deviceId(),
      },
    });

    this.socket.on('connect', () => {
      this._connectionStatus.set('connected');
      this.reconnectAttempts = 0;
      this.joinRestaurant(restaurantId);
      this.startHeartbeat();
    });

    this.socket.on('disconnect', () => {
      this._connectionStatus.set('disconnected');
      this.stopHeartbeat();
      this.handleReconnect(restaurantId);
    });

    this.socket.on('connect_error', () => {
      this._connectionStatus.set('disconnected');
      this.handleReconnect(restaurantId);
    });

    this.socket.on('order:new', (order: Order) => {
      const event: OrderEvent = { type: 'new', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('order:updated', (order: Order) => {
      const event: OrderEvent = { type: 'updated', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });

    this.socket.on('order:cancelled', (order: Order) => {
      const event: OrderEvent = { type: 'cancelled', order };
      this._lastOrderEvent.set(event);
      this.notifyOrderCallbacks(event);
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopPolling();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this._connectionStatus.set('disconnected');
  }

  private joinRestaurant(restaurantId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-restaurant', { restaurantId });
    }
  }

  private handleReconnect(restaurantId: string): void {
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.startPolling();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      if (this._connectionStatus() === 'disconnected') {
        this.connect(restaurantId);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startPolling(): void {
    this.stopPolling();
    this._connectionStatus.set('polling');

    this.pollingInterval = setInterval(() => {
      // Polling is handled by OrderService
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  onOrderEvent(callback: (event: OrderEvent) => void): () => void {
    this.orderCallbacks.push(callback);
    return () => {
      this.orderCallbacks = this.orderCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyOrderCallbacks(event: OrderEvent): void {
    this.orderCallbacks.forEach(cb => cb(event));
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
