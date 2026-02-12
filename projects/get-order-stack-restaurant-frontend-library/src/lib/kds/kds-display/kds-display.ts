import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { OrderService } from '../../services/order';
import { SocketService } from '../../services/socket';
import { AuthService } from '../../services/auth';
import { MenuService } from '../../services/menu';
import { RestaurantSettingsService } from '../../services/restaurant-settings';
import { OrderCard } from '../order-card/order-card';
import { ConnectionStatus } from '../../shared/connection-status/connection-status';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { Order, GuestOrderStatus, CoursePacingMode, PrintStatus } from '../../models';

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
  private readonly settingsService = inject(RestaurantSettingsService);

  private readonly _rushedOrders = signal(new Set<string>());
  private readonly _operatorOverride = signal(false);
  private readonly _coursePacingMode = signal<CoursePacingMode>('disabled');
  private readonly _expoStationEnabled = signal(false);
  private readonly _expoOverride = signal(false);
  private readonly _expoCheckedOrders = signal(new Set<string>());
  private readonly _autoFireDelay = signal(300);
  private readonly _prepTimeFiringEnabled = signal(false);
  private readonly _defaultPrepMinutes = signal(10);
  readonly coursePacingMode = this._coursePacingMode.asReadonly();
  readonly expoStationEnabled = this._expoStationEnabled.asReadonly();
  readonly autoFireDelay = this._autoFireDelay.asReadonly();
  readonly prepTimeFiringEnabled = this._prepTimeFiringEnabled.asReadonly();
  readonly defaultPrepMinutes = this._defaultPrepMinutes.asReadonly();

  constructor() {
    effect(() => {
      const mode = this.settingsService.aiSettings().coursePacingMode;
      if (!this._operatorOverride()) {
        this._coursePacingMode.set(mode);
      }
    });
    effect(() => {
      const enabled = this.settingsService.aiSettings().expoStationEnabled;
      if (!this._expoOverride()) {
        this._expoStationEnabled.set(enabled);
      }
    });
  }

  readonly pacingModeOptions: { value: CoursePacingMode; label: string }[] = [
    { value: 'disabled', label: 'Disabled' },
    { value: 'server_fires', label: 'Server Fires' },
    { value: 'auto_fire_timed', label: 'Auto-Fire Timed' },
  ];

  readonly pendingOrders = this.orderService.pendingOrders;
  readonly preparingOrders = this.orderService.preparingOrders;
  readonly readyOrders = this.orderService.readyOrders;

  readonly expoQueueOrders = computed(() => {
    if (!this._expoStationEnabled()) return [];
    const checked = this._expoCheckedOrders();
    return this.readyOrders().filter(o => !checked.has(o.guid));
  });

  readonly expoCheckedOrders = computed(() => {
    if (!this._expoStationEnabled()) return this.readyOrders();
    const checked = this._expoCheckedOrders();
    return this.readyOrders().filter(o => checked.has(o.guid));
  });
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
        const elapsed = Math.floor((Date.now() - order.timestamps.createdDate.getTime()) / 60000);
        if (elapsed > est) count++;
      }
    }
    return count;
  });

  readonly avgWaitMinutes = computed(() => {
    const activeOrders = [...this.pendingOrders(), ...this.preparingOrders()];
    if (activeOrders.length === 0) return 0;
    const totalMinutes = activeOrders.reduce((sum, order) => {
      return sum + Math.floor((Date.now() - order.timestamps.createdDate.getTime()) / 60000);
    }, 0);
    return Math.round(totalMinutes / activeOrders.length);
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.loadOrders();
      this.connectSocket();
      this.menuService.loadMenu();
      this.settingsService.loadSettings();
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
      this.socketService.connect(restaurantId, 'kds');
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

  onStatusChange(event: { orderId: string; status: GuestOrderStatus }): void {
    const skipPrint = this._expoStationEnabled() && event.status === 'READY_FOR_PICKUP';
    this.orderService.updateOrderStatus(event.orderId, event.status, skipPrint ? { skipPrint: true } : undefined);
  }

  onExpoCheck(orderId: string): void {
    this._expoCheckedOrders.update(set => {
      const updated = new Set(set);
      updated.add(orderId);
      return updated;
    });
    this.orderService.triggerPrint(orderId);
  }

  toggleExpoStation(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!checked) {
      const checkedSet = this._expoCheckedOrders();
      for (const order of this.readyOrders()) {
        if (!checkedSet.has(order.guid)) {
          this.orderService.triggerPrint(order.guid);
        }
      }
    }
    this._expoStationEnabled.set(checked);
    this._expoOverride.set(true);
    if (!checked) {
      this._expoCheckedOrders.set(new Set());
    }
  }

  setCoursePacingMode(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as CoursePacingMode;
    this._coursePacingMode.set(value);
    this._operatorOverride.set(true);
  }

  setAutoFireDelay(event: Event): void {
    const value = Number.parseInt((event.target as HTMLInputElement).value, 10) || 300;
    this._autoFireDelay.set(value);
  }

  onFireCourse(event: { orderId: string; courseGuid: string }): void {
    this.orderService.fireCourse(event.orderId, event.courseGuid);
  }

  togglePrepTimeFiring(event: Event): void {
    this._prepTimeFiringEnabled.set((event.target as HTMLInputElement).checked);
  }

  setDefaultPrepMinutes(event: Event): void {
    const val = Number.parseInt((event.target as HTMLInputElement).value, 10);
    if (val > 0) this._defaultPrepMinutes.set(val);
  }

  onFireItemNow(event: { orderId: string; selectionGuid: string }): void {
    console.log('Fire item now:', event);
    // TODO: Call backend to transition item HOLD → SENT
  }

  getPrintStatus(orderId: string): PrintStatus {
    return this.orderService.getPrintStatus(orderId);
  }

  onRetryPrint(orderId: string): void {
    this.orderService.retryPrint(orderId);
  }

  onRecall(orderId: string): void {
    this.orderService.recallOrder(orderId);
  }

  refresh(): void {
    this.loadOrders();
  }

  clearError(): void {
    this.orderService.clearError();
  }

  private getOrderPrepTime(order: Order, map: Map<string, number>): number {
    const allSelections = order.checks.flatMap(c => c.selections);
    if (allSelections.length === 0) return 0;
    let maxPrep = 0;
    for (const sel of allSelections) {
      const prep = map.get(sel.menuItemGuid) ?? 0;
      if (prep > maxPrep) maxPrep = prep;
    }
    return maxPrep;
  }
}
