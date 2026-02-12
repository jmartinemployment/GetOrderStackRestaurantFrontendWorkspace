import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  Order,
  GuestOrderStatus,
  FulfillmentStatus,
  Selection,
  SelectionModifier,
  Check,
  Payment,
  OrderTimestamps,
  ProfitInsight,
  RecentProfitSummary,
  Course,
  CourseFireStatus,
  getOrderIdentifier,
  PrintStatus,
  QueuedOrder,
} from '../models';
import { getDiningOption, DiningOptionType } from '../models/dining-option.model';
import { AuthService } from './auth';
import { SocketService } from './socket';
import { environment } from '../environments/environment';

// --- Backend ↔ Frontend status mapping ---

type BackendStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
type BackendPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

function mapBackendToGuestStatus(status: string): GuestOrderStatus {
  switch (status) {
    case 'pending':
    case 'confirmed':
      return 'RECEIVED';
    case 'preparing':
      return 'IN_PREPARATION';
    case 'ready':
      return 'READY_FOR_PICKUP';
    case 'completed':
      return 'CLOSED';
    case 'cancelled':
      return 'VOIDED';
    default:
      return 'RECEIVED';
  }
}

function mapGuestToBackendStatus(status: GuestOrderStatus): BackendStatus {
  switch (status) {
    case 'RECEIVED':
      return 'confirmed';
    case 'IN_PREPARATION':
      return 'preparing';
    case 'READY_FOR_PICKUP':
      return 'ready';
    case 'CLOSED':
      return 'completed';
    case 'VOIDED':
      return 'cancelled';
  }
}

function mapBackendPaymentStatus(status: string): 'OPEN' | 'PAID' | 'CLOSED' {
  switch (status) {
    case 'paid':
      return 'PAID';
    case 'refunded':
      return 'CLOSED';
    case 'failed':
    case 'pending':
    default:
      return 'OPEN';
  }
}

function deriveFulfillmentStatus(backendOrderStatus: string): FulfillmentStatus {
  switch (backendOrderStatus) {
    case 'preparing':
    case 'ready':
    case 'completed':
      return 'SENT';
    default:
      return 'NEW';
  }
}

function mapOrderType(orderType: string): DiningOptionType {
  switch (orderType) {
    case 'pickup':
      return 'takeout';
    case 'delivery':
      return 'delivery';
    case 'dine-in':
      return 'dine-in';
    case 'curbside':
      return 'curbside';
    case 'catering':
      return 'catering';
    default:
      return 'dine-in';
  }
}

// --- Mapped order event callbacks ---

export interface MappedOrderEvent {
  type: 'new' | 'updated' | 'cancelled' | 'printed' | 'print_failed';
  order: Order;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _orders = signal<Order[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _printStatuses = signal<Map<string, PrintStatus>>(new Map());
  private readonly _printTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private static readonly PRINT_TIMEOUT_MS = 30_000;

  // Offline queue
  private readonly _queuedOrders = signal<QueuedOrder[]>([]);
  readonly queuedOrders = this._queuedOrders.asReadonly();
  readonly queuedCount = computed(() => this._queuedOrders().length);
  private readonly _isSyncing = signal(false);
  readonly isSyncing = this._isSyncing.asReadonly();

  // Public readonly signals
  readonly orders = this._orders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Mapped order event callbacks
  private mappedOrderCallbacks: Array<(event: MappedOrderEvent) => void> = [];

  // Computed signals - KDS columns
  readonly pendingOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'RECEIVED')
  );

  readonly preparingOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'IN_PREPARATION')
  );

  readonly readyOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'READY_FOR_PICKUP')
  );

  readonly completedOrders = computed(() =>
    this._orders().filter(o => o.guestOrderStatus === 'CLOSED')
  );

  readonly activeOrderCount = computed(() =>
    this._orders().filter(o =>
      o.guestOrderStatus !== 'CLOSED' && o.guestOrderStatus !== 'VOIDED'
    ).length
  );

  readonly printStatuses = this._printStatuses.asReadonly();

  getPrintStatus(orderId: string): PrintStatus {
    return this._printStatuses().get(orderId) ?? 'none';
  }

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  constructor() {
    this.socketService.onOrderEvent((event) => {
      this.handleOrderEvent(event.type, event.order);
    });

    // Load persisted queue when restaurant changes
    effect(() => {
      if (this.authService.selectedRestaurantId()) {
        this.loadQueue();
      }
    });

    // Sync when back online
    effect(() => {
      if (this.socketService.isOnline() && this._queuedOrders().length > 0) {
        this.syncQueue();
      }
    });
  }

  ngOnDestroy(): void {
    for (const timer of this._printTimeouts.values()) {
      clearTimeout(timer);
    }
    this._printTimeouts.clear();
  }

  private handleOrderEvent(type: 'new' | 'updated' | 'cancelled' | 'printed' | 'print_failed', rawOrder: any): void {
    if (type === 'printed') {
      const orderId = rawOrder?.orderId ?? rawOrder?.id ?? rawOrder?.guid ?? '';
      this.setPrintStatus(orderId, 'printed');
      const existing = this._orders().find(o => o.guid === orderId);
      if (existing) {
        for (const cb of this.mappedOrderCallbacks) {
          cb({ type: 'printed', order: existing });
        }
      }
      return;
    }

    if (type === 'print_failed') {
      const orderId = rawOrder?.orderId ?? rawOrder?.id ?? rawOrder?.guid ?? '';
      this.setPrintStatus(orderId, 'failed');
      const existing = this._orders().find(o => o.guid === orderId);
      if (existing) {
        for (const cb of this.mappedOrderCallbacks) {
          cb({ type: 'print_failed', order: existing });
        }
      }
      return;
    }

    const mapped = this.mapOrder(rawOrder);

    this._orders.update(orders => {
      const index = orders.findIndex(o => o.guid === mapped.guid);

      if (type === 'new' && index === -1) {
        return [mapped, ...orders];
      }

      if (type === 'cancelled' && index !== -1) {
        const updated = [...orders];
        updated[index] = mapped;
        return updated;
      }

      if (type === 'updated' && index !== -1) {
        const updated = [...orders];
        updated[index] = mapped;
        return updated;
      }

      return orders;
    });

    // Notify mapped order event subscribers
    const event: MappedOrderEvent = { type, order: mapped };
    for (const cb of this.mappedOrderCallbacks) {
      cb(event);
    }
  }

  onMappedOrderEvent(callback: (event: MappedOrderEvent) => void): () => void {
    this.mappedOrderCallbacks.push(callback);
    return () => {
      this.mappedOrderCallbacks = this.mappedOrderCallbacks.filter(cb => cb !== callback);
    };
  }

  async loadOrders(limit = 50): Promise<void> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.get<any[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders?limit=${limit}`
        )
      );
      this._orders.set((raw || []).map(o => this.mapOrder(o)));
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to load orders';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  async createOrder(orderData: Record<string, unknown>): Promise<Order | null> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return null;
    }

    // If offline, queue instead of POST
    if (!this.socketService.isOnline()) {
      return this.queueOrder(orderData);
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders`,
          orderData
        )
      );
      const order = this.mapOrder(raw);

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

  async updateOrderStatus(orderId: string, status: GuestOrderStatus, options?: { skipPrint?: boolean }): Promise<boolean> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    this._isLoading.set(true);
    this._error.set(null);

    const backendStatus = mapGuestToBackendStatus(status);

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/status`,
          { status: backendStatus }
        )
      );
      const updatedOrder = this.mapOrder(raw);

      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );

      if (status === 'READY_FOR_PICKUP' && !options?.skipPrint) {
        this.setPrintStatus(orderId, 'printing');
        this.startPrintTimeout(orderId);
      }

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
    return this.updateOrderStatus(orderId, 'IN_PREPARATION');
  }

  async startPreparing(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'IN_PREPARATION');
  }

  async markReady(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'READY_FOR_PICKUP');
  }

  async completeOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'CLOSED');
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'VOIDED');
  }

  triggerPrint(orderId: string): void {
    this.setPrintStatus(orderId, 'printing');
    this.startPrintTimeout(orderId);
  }

  async recallOrder(orderId: string): Promise<boolean> {
    const order = this._orders().find(o => o.guid === orderId);
    if (!order) return false;

    const previousStatus = this.getPreviousStatus(order.guestOrderStatus);
    if (!previousStatus) return false;

    const success = await this.updateOrderStatus(orderId, previousStatus);
    if (success) {
      this.setPrintStatus(orderId, 'none');
      this.clearPrintTimeout(orderId);
    }
    return success;
  }

  private getPreviousStatus(status: GuestOrderStatus): GuestOrderStatus | null {
    switch (status) {
      case 'READY_FOR_PICKUP': return 'IN_PREPARATION';
      case 'IN_PREPARATION': return 'RECEIVED';
      default: return null;
    }
  }

  async getProfitInsight(orderId: string): Promise<ProfitInsight | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<ProfitInsight>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/profit-insight`
        )
      );
    } catch {
      return null;
    }
  }

  async getRecentProfit(limit = 10): Promise<RecentProfitSummary | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<RecentProfitSummary>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/recent-profit?limit=${limit}`
        )
      );
    } catch {
      return null;
    }
  }

  async fireCourse(orderId: string, courseGuid: string): Promise<boolean> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return false;
    }

    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/fire-course`,
          { courseGuid }
        )
      );
      const updatedOrder = this.mapOrder(raw);
      this._orders.update(orders =>
        orders.map(o => o.guid === orderId ? updatedOrder : o)
      );
      return true;
    } catch {
      // If backend doesn't support fire-course yet, update locally
      this._orders.update(orders =>
        orders.map(o => {
          if (o.guid !== orderId) return o;
          const updatedCourses = o.courses?.map(c =>
            c.guid === courseGuid ? { ...c, fireStatus: 'FIRED' as const, firedDate: new Date() } : c
          );
          const updatedChecks = o.checks.map(check => ({
            ...check,
            selections: check.selections.map(sel =>
              sel.course?.guid === courseGuid
                ? { ...sel, fulfillmentStatus: 'SENT' as const, course: { ...sel.course, fireStatus: 'FIRED' as const, firedDate: new Date() } }
                : sel
            ),
          }));
          return { ...o, courses: updatedCourses, checks: updatedChecks };
        })
      );
      return true;
    }
  }

  // --- Offline queue methods ---

  private queueOrder(orderData: Record<string, unknown>): Order {
    const localId = crypto.randomUUID();
    const queued: QueuedOrder = {
      localId,
      orderData,
      queuedAt: Date.now(),
      restaurantId: this.restaurantId ?? '',
      retryCount: 0,
    };

    this._queuedOrders.update(q => [...q, queued]);
    this.persistQueue();

    const placeholder = this.createPlaceholderOrder(localId, orderData);
    this._orders.update(orders => [placeholder, ...orders]);
    return placeholder;
  }

  private createPlaceholderOrder(localId: string, orderData: Record<string, unknown>): Order {
    const items = (orderData['items'] as any[]) ?? [];
    const diningOption = (orderData['diningOption'] as any) ?? getDiningOption('dine-in');

    const selections: Selection[] = items.map((item: any) => ({
      guid: crypto.randomUUID(),
      menuItemGuid: item.menuItemId ?? '',
      menuItemName: item.name ?? item.menuItemId ?? '',
      quantity: Number(item.quantity) || 1,
      unitPrice: 0,
      totalPrice: 0,
      fulfillmentStatus: 'NEW' as FulfillmentStatus,
      modifiers: [],
    }));

    const check: Check = {
      guid: `check-${localId}`,
      displayNumber: '1',
      selections,
      payments: [],
      paymentStatus: 'OPEN',
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
    };

    const now = new Date();

    return {
      guid: localId,
      restaurantId: this.restaurantId ?? '',
      orderNumber: 'Q-' + localId.slice(0, 4).toUpperCase(),
      guestOrderStatus: 'RECEIVED',
      server: { guid: 'offline', name: 'Offline', entityType: 'RestaurantUser' },
      device: { guid: (orderData['sourceDeviceId'] as string) ?? '', name: 'POS Device' },
      diningOption,
      checks: [check],
      subtotal: 0,
      taxAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
      timestamps: { createdDate: now, lastModifiedDate: now },
      _queued: true,
    };
  }

  private persistQueue(): void {
    if (!this.restaurantId) return;
    const key = `${this.restaurantId}-offline-queue`;
    localStorage.setItem(key, JSON.stringify(this._queuedOrders()));
  }

  private loadQueue(): void {
    if (!this.restaurantId) return;
    const key = `${this.restaurantId}-offline-queue`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        this._queuedOrders.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  private async syncQueue(): Promise<void> {
    if (this._isSyncing()) return;
    this._isSyncing.set(true);

    const queue = [...this._queuedOrders()];

    for (const queued of queue) {
      try {
        const raw = await firstValueFrom(
          this.http.post<any>(
            `${this.apiUrl}/restaurant/${queued.restaurantId}/orders`,
            queued.orderData
          )
        );
        const order = this.mapOrder(raw);

        // Replace placeholder with real order
        this._orders.update(orders =>
          orders.map(o => o.guid === queued.localId ? order : o)
        );

        // Remove from queue
        this._queuedOrders.update(q =>
          q.filter(item => item.localId !== queued.localId)
        );
        this.persistQueue();
      } catch {
        // Increment retry, stop sync — network may be down again
        this._queuedOrders.update(q => q.map(item =>
          item.localId === queued.localId
            ? { ...item, retryCount: item.retryCount + 1 }
            : item
        ));
        this.persistQueue();
        break;
      }
    }

    this._isSyncing.set(false);
  }

  getOrderById(orderId: string): Order | undefined {
    return this._orders().find(o => o.guid === orderId);
  }

  clearError(): void {
    this._error.set(null);
  }

  // --- Backend → Frontend mapping (the bridge) ---

  private mapOrder(raw: any): Order {
    const rawStatus: string = raw.status ?? 'pending';
    const guestOrderStatus = mapBackendToGuestStatus(rawStatus);
    const fulfillmentStatus = deriveFulfillmentStatus(rawStatus);

    // Map items → selections
    const rawItems: any[] = raw.orderItems || raw.items || [];
    const selections: Selection[] = rawItems.map((item: any) => {
      const course: Course | undefined = item.course ? {
        guid: item.course.guid ?? item.course.id ?? crypto.randomUUID(),
        name: item.course.name ?? '',
        sortOrder: Number(item.course.sortOrder) || 0,
        fireStatus: (item.course.fireStatus as CourseFireStatus) ?? 'PENDING',
        firedDate: item.course.firedDate ? new Date(item.course.firedDate) : undefined,
      } : undefined;

      return {
        guid: item.id ?? crypto.randomUUID(),
        menuItemGuid: item.menuItemId ?? '',
        menuItemName: item.menuItemName || item.name || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        fulfillmentStatus: item.fulfillmentStatus ?? fulfillmentStatus,
        modifiers: (item.orderItemModifiers || item.modifiers || []).map((m: any): SelectionModifier => ({
          guid: m.id ?? crypto.randomUUID(),
          name: m.modifierName || m.name || '',
          priceAdjustment: Number(m.priceAdjustment) || 0,
        })),
        specialInstructions: item.specialInstructions,
        course,
      };
    });

    // Map order-level courses
    const rawCourses: any[] = raw.courses || [];
    const courses: Course[] = rawCourses.map((c: any) => ({
      guid: c.guid ?? c.id ?? crypto.randomUUID(),
      name: c.name ?? '',
      sortOrder: Number(c.sortOrder) || 0,
      fireStatus: (c.fireStatus as CourseFireStatus) ?? 'PENDING',
      firedDate: c.firedDate ? new Date(c.firedDate) : undefined,
    }));

    // Financials
    const subtotal = Number(raw.subtotal) || 0;
    const taxAmount = Number(raw.tax) || 0;
    const tipAmount = Number(raw.tip) || 0;
    const totalAmount = Number(raw.total) || 0;

    // Payment status
    const checkPaymentStatus = mapBackendPaymentStatus(raw.paymentStatus);

    // Build payments array
    const payments: Payment[] = [];
    if (raw.paymentMethod || raw.stripePaymentIntentId || raw.paypalOrderId) {
      payments.push({
        guid: raw.stripePaymentIntentId ?? raw.paypalOrderId ?? crypto.randomUUID(),
        paymentMethod: raw.paymentMethod ?? 'unknown',
        amount: totalAmount,
        tipAmount,
        status: checkPaymentStatus,
        paymentProcessor: raw.stripePaymentIntentId ? 'stripe' : (raw.paypalOrderId ? 'paypal' : undefined),
        paymentProcessorId: raw.stripePaymentIntentId ?? raw.paypalOrderId,
        paidDate: checkPaymentStatus === 'PAID' ? new Date() : undefined,
      });
    }

    // Single check wrapping all items
    const check: Check = {
      guid: `check-${raw.id ?? crypto.randomUUID()}`,
      displayNumber: '1',
      selections,
      payments,
      paymentStatus: checkPaymentStatus,
      subtotal,
      taxAmount,
      tipAmount,
      totalAmount,
    };

    // Dining option
    const diningOptionType = mapOrderType(raw.orderType ?? 'dine-in');
    const diningOption = raw.diningOption ?? getDiningOption(diningOptionType);

    // Timestamps
    const timestamps: OrderTimestamps = {
      createdDate: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      confirmedDate: raw.confirmedAt ? new Date(raw.confirmedAt) : undefined,
      sentDate: raw.sentAt ? new Date(raw.sentAt) : undefined,
      prepStartDate: raw.prepStartAt ? new Date(raw.prepStartAt) : undefined,
      preparingDate: raw.preparingAt ? new Date(raw.preparingAt) : undefined,
      readyDate: raw.readyAt ? new Date(raw.readyAt) : undefined,
      closedDate: raw.completedAt ? new Date(raw.completedAt) : undefined,
      voidedDate: raw.cancelledAt ? new Date(raw.cancelledAt) : undefined,
      lastModifiedDate: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    };

    // Server
    const server = raw.server ?? {
      guid: 'system',
      name: 'System',
      entityType: 'RestaurantUser' as const,
    };

    // Device
    const device = raw.device ?? {
      guid: raw.sourceDeviceId ?? 'unknown',
      name: raw.sourceDeviceId ? 'POS Device' : 'Unknown Device',
    };

    // Table
    const table = raw.table ?? (raw.tableId ? {
      guid: raw.tableId,
      name: raw.tableNumber ?? raw.tableId,
      entityType: 'Table' as const,
    } : undefined);

    // Customer
    const customer = raw.customer ? {
      firstName: raw.customer.firstName ?? '',
      lastName: raw.customer.lastName ?? '',
      phone: raw.customer.phone ?? '',
      email: raw.customer.email ?? '',
    } : undefined;

    return {
      guid: raw.id ?? crypto.randomUUID(),
      restaurantId: raw.restaurantId ?? '',
      orderNumber: raw.orderNumber ?? '',
      guestOrderStatus,
      businessDate: raw.businessDate,
      server,
      device,
      table,
      diningOption,
      diningOptionType,
      approvalStatus: raw.approvalStatus,
      promisedDate: raw.promisedDate,
      checks: [check],
      courses: courses.length > 0 ? courses : undefined,
      subtotal,
      taxAmount,
      tipAmount,
      totalAmount,
      customer,
      specialInstructions: raw.specialInstructions,
      timestamps,
      deliveryInfo: raw.deliveryInfo ?? (raw.deliveryAddress ? {
        address: raw.deliveryAddress,
        address2: raw.deliveryAddress2 ?? undefined,
        city: raw.deliveryCity ?? undefined,
        state: raw.deliveryStateUs ?? undefined,
        zip: raw.deliveryZip ?? undefined,
        deliveryNotes: raw.deliveryNotes ?? undefined,
        deliveryState: raw.deliveryStatus ?? 'PREPARING',
        estimatedDeliveryTime: raw.deliveryEstimatedAt ? new Date(raw.deliveryEstimatedAt) : undefined,
        dispatchedDate: raw.dispatchedAt ? new Date(raw.dispatchedAt) : undefined,
        deliveredDate: raw.deliveredAt ? new Date(raw.deliveredAt) : undefined,
      } : undefined),
      curbsideInfo: raw.curbsideInfo ?? (raw.vehicleDescription ? {
        vehicleDescription: raw.vehicleDescription,
        arrivalNotified: raw.arrivalNotified ?? false,
      } : undefined),
      cateringInfo: raw.cateringInfo ?? (raw.eventDate || raw.headcount ? {
        eventDate: raw.eventDate,
        eventTime: raw.eventTime,
        headcount: raw.headcount,
        eventType: raw.eventType,
        setupRequired: raw.setupRequired ?? false,
        depositAmount: raw.depositAmount ? Number(raw.depositAmount) : undefined,
        depositPaid: raw.depositPaid ?? false,
        specialInstructions: raw.cateringInstructions,
      } : undefined),
    };
  }

  // --- Dining option action methods ---

  async updateDeliveryStatus(orderId: string, deliveryStatus: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/delivery-status`,
          { deliveryStatus }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async approveOrder(orderId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/approval`,
          { status: 'APPROVED' }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async rejectOrder(orderId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/approval`,
          { status: 'NOT_APPROVED' }
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async notifyCurbsideArrival(orderId: string): Promise<boolean> {
    if (!this.restaurantId) return false;
    try {
      const raw = await firstValueFrom(
        this.http.patch<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/arrival`,
          {}
        )
      );
      const updated = this.mapOrder(raw);
      this._orders.update(orders => orders.map(o => o.guid === orderId ? updated : o));
      return true;
    } catch {
      return false;
    }
  }

  async retryPrint(orderId: string): Promise<void> {
    if (!this.restaurantId) return;

    this.setPrintStatus(orderId, 'printing');
    this.startPrintTimeout(orderId);

    try {
      await firstValueFrom(
        this.http.post<any>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/reprint`,
          {}
        )
      );
    } catch {
      this.setPrintStatus(orderId, 'failed');
    }
  }

  private setPrintStatus(orderId: string, status: PrintStatus): void {
    this._printStatuses.update(map => {
      const updated = new Map(map);
      updated.set(orderId, status);
      return updated;
    });
    if (status === 'printed' || status === 'failed') {
      this.clearPrintTimeout(orderId);
    }
  }

  private startPrintTimeout(orderId: string): void {
    this.clearPrintTimeout(orderId);
    const timer = setTimeout(() => {
      if (this._printStatuses().get(orderId) === 'printing') {
        this.setPrintStatus(orderId, 'failed');
      }
    }, OrderService.PRINT_TIMEOUT_MS);
    this._printTimeouts.set(orderId, timer);
  }

  private clearPrintTimeout(orderId: string): void {
    const existing = this._printTimeouts.get(orderId);
    if (existing) {
      clearTimeout(existing);
      this._printTimeouts.delete(orderId);
    }
  }
}
