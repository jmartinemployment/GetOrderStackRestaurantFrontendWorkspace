import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { OrderService } from '../../services/order';
import { SocketService } from '../../services/socket';
import { AuthService } from '../../services/auth';
import { OrderCard } from '../order-card/order-card';
import { ConnectionStatus } from '../../shared/connection-status/connection-status';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { OrderStatus } from '../../models';

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

  readonly pendingOrders = this.orderService.pendingOrders;
  readonly preparingOrders = this.orderService.preparingOrders;
  readonly readyOrders = this.orderService.readyOrders;
  readonly isLoading = this.orderService.isLoading;
  readonly error = this.orderService.error;
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly restaurantName = this.authService.selectedRestaurantName;

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadOrders();
      this.connectSocket();
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

  onStatusChange(event: { orderId: string; status: OrderStatus }): void {
    this.orderService.updateOrderStatus(event.orderId, event.status);
  }

  refresh(): void {
    this.loadOrders();
  }

  clearError(): void {
    this.orderService.clearError();
  }
}
