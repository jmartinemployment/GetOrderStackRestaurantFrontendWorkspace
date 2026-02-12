import { Component, inject, signal, computed, effect, input, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '../../services/menu';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { MenuItem, Order, OrderType, getOrderIdentifier } from '../../models';

type OnlineStep = 'menu' | 'cart' | 'info' | 'confirm';

@Component({
  selector: 'get-order-stack-online-ordering',
  imports: [CurrencyPipe, LoadingSpinner],
  templateUrl: './online-order-portal.html',
  styleUrl: './online-order-portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineOrderPortal implements OnDestroy {
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  readonly restaurantSlug = input<string>('');

  readonly isAuthenticated = this.authService.isAuthenticated;
  private readonly _resolveError = signal<string | null>(null);
  readonly resolveError = this._resolveError.asReadonly();

  private readonly _step = signal<OnlineStep>('menu');
  private readonly _selectedCategory = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _orderType = signal<OrderType>('pickup');
  private readonly _customerFirstName = signal('');
  private readonly _customerLastName = signal('');
  private readonly _customerPhone = signal('');
  private readonly _customerEmail = signal('');
  // Structured delivery address
  private readonly _deliveryAddress = signal('');
  private readonly _deliveryAddress2 = signal('');
  private readonly _deliveryCity = signal('');
  private readonly _deliveryStateUS = signal('');
  private readonly _deliveryZip = signal('');
  private readonly _deliveryNotes = signal('');
  // Curbside
  private readonly _vehicleDescription = signal('');

  private readonly _specialInstructions = signal('');
  private readonly _isSubmitting = signal(false);
  private readonly _orderConfirmed = signal(false);
  private readonly _orderNumber = signal('');
  private readonly _error = signal<string | null>(null);

  // Order tracking
  private readonly _submittedOrder = signal<Order | null>(null);
  private _trackingInterval: ReturnType<typeof setInterval> | null = null;

  readonly step = this._step.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly orderType = this._orderType.asReadonly();
  readonly customerFirstName = this._customerFirstName.asReadonly();
  readonly customerLastName = this._customerLastName.asReadonly();
  readonly customerPhone = this._customerPhone.asReadonly();
  readonly customerEmail = this._customerEmail.asReadonly();
  readonly deliveryAddress = this._deliveryAddress.asReadonly();
  readonly deliveryAddress2 = this._deliveryAddress2.asReadonly();
  readonly deliveryCity = this._deliveryCity.asReadonly();
  readonly deliveryStateUS = this._deliveryStateUS.asReadonly();
  readonly deliveryZip = this._deliveryZip.asReadonly();
  readonly deliveryNotes = this._deliveryNotes.asReadonly();
  readonly vehicleDescription = this._vehicleDescription.asReadonly();
  readonly specialInstructions = this._specialInstructions.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly orderConfirmed = this._orderConfirmed.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly error = this._error.asReadonly();
  readonly submittedOrder = this._submittedOrder.asReadonly();

  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly cartItems = this.cartService.items;
  readonly cartTotal = this.cartService.total;
  readonly cartSubtotal = this.cartService.subtotal;
  readonly cartTax = this.cartService.tax;
  readonly cartItemCount = this.cartService.itemCount;

  readonly filteredItems = computed(() => {
    let items = this.menuService.allItems().filter(i => i.isActive !== false && !i.eightySixed);
    const catId = this._selectedCategory();
    const search = this._searchTerm().toLowerCase();

    if (catId) {
      items = items.filter(i => i.categoryId === catId);
    }
    if (search) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(search) ||
        (i.description ?? '').toLowerCase().includes(search)
      );
    }
    return items;
  });

  readonly canSubmit = computed(() => {
    const firstName = this._customerFirstName().trim();
    const lastName = this._customerLastName().trim();
    const phone = this._customerPhone().trim();
    if (!firstName || !lastName || !phone) return false;
    if (this._orderType() === 'delivery') {
      if (!this._deliveryAddress().trim() || !this._deliveryCity().trim()
        || !this._deliveryStateUS().trim() || !this._deliveryZip().trim()) return false;
    }
    if (this._orderType() === 'curbside' && !this._vehicleDescription().trim()) return false;
    return this.cartItemCount() > 0;
  });

  constructor() {
    // Resolve restaurant from slug attribute or fall back to auth selection
    effect(() => {
      const slug = this.restaurantSlug();
      const authId = this.authService.selectedRestaurantId();

      if (slug) {
        this.resolveSlug(slug);
      } else if (authId) {
        this.menuService.loadMenuForRestaurant(authId);
      }
    });
  }

  private async resolveSlug(slug: string): Promise<void> {
    this._resolveError.set(null);
    const restaurant = await this.authService.resolveRestaurantBySlug(slug);
    if (restaurant) {
      this.authService.selectRestaurant(restaurant.id, restaurant.name, restaurant.logo);
      if (restaurant.taxRate > 0) {
        this.cartService.setTaxRate(restaurant.taxRate);
      }
      this.menuService.loadMenuForRestaurant(restaurant.id);
    } else {
      this._resolveError.set(`Restaurant "${slug}" not found`);
    }
  }

  setStep(step: OnlineStep): void {
    this._step.set(step);
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategory.set(categoryId);
  }

  onSearch(event: Event): void {
    this._searchTerm.set((event.target as HTMLInputElement).value);
  }

  addToCart(item: MenuItem): void {
    this.cartService.addItem(item);
  }

  getItemQuantity(menuItemId: string): number {
    return this.cartItems().find(i => i.menuItem.id === menuItemId)?.quantity ?? 0;
  }

  getCartItemId(menuItemId: string): string | undefined {
    return this.cartItems().find(i => i.menuItem.id === menuItemId)?.id;
  }

  incrementItem(menuItemId: string): void {
    const cartItemId = this.getCartItemId(menuItemId);
    if (cartItemId) {
      this.cartService.incrementQuantity(cartItemId);
    }
  }

  decrementItem(menuItemId: string): void {
    const item = this.cartItems().find(i => i.menuItem.id === menuItemId);
    if (item) {
      if (item.quantity <= 1) {
        this.cartService.removeItem(item.id);
      } else {
        this.cartService.decrementQuantity(item.id);
      }
    }
  }

  removeFromCart(cartItemId: string): void {
    this.cartService.removeItem(cartItemId);
  }

  setOrderType(type: OrderType): void {
    this._orderType.set(type);
  }

  onFieldInput(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'firstName': this._customerFirstName.set(value); break;
      case 'lastName': this._customerLastName.set(value); break;
      case 'phone': this._customerPhone.set(value); break;
      case 'email': this._customerEmail.set(value); break;
      case 'address': this._deliveryAddress.set(value); break;
      case 'address2': this._deliveryAddress2.set(value); break;
      case 'city': this._deliveryCity.set(value); break;
      case 'stateUS': this._deliveryStateUS.set(value); break;
      case 'zip': this._deliveryZip.set(value); break;
      case 'deliveryNotes': this._deliveryNotes.set(value); break;
      case 'vehicle': this._vehicleDescription.set(value); break;
      case 'instructions': this._specialInstructions.set(value); break;
    }
  }

  goToCart(): void {
    if (this.cartItemCount() > 0) {
      this._step.set('cart');
    }
  }

  goToInfo(): void {
    this._step.set('info');
  }

  async submitOrder(): Promise<void> {
    if (!this.canSubmit() || this._isSubmitting()) return;

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const type = this._orderType();
      const orderData: Record<string, unknown> = {
        orderType: type,
        orderSource: 'online',
        items: this.cartItems().map(item => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          modifiers: item.selectedModifiers.map(m => ({
            id: m.id,
            name: m.name,
            priceAdjustment: m.priceAdjustment,
          })),
        })),
        subtotal: this.cartSubtotal(),
        tax: this.cartTax(),
        tip: 0,
        total: this.cartTotal(),
        customer: {
          firstName: this._customerFirstName().trim(),
          lastName: this._customerLastName().trim(),
          phone: this._customerPhone().trim(),
          email: this._customerEmail().trim(),
        },
        specialInstructions: this._specialInstructions().trim() || undefined,
      };

      // Structured delivery info
      if (type === 'delivery') {
        orderData['deliveryInfo'] = {
          address: this._deliveryAddress().trim(),
          address2: this._deliveryAddress2().trim() || undefined,
          city: this._deliveryCity().trim(),
          state: this._deliveryStateUS().trim(),
          zip: this._deliveryZip().trim(),
          deliveryNotes: this._deliveryNotes().trim() || undefined,
        };
      }

      // Curbside info
      if (type === 'curbside') {
        orderData['curbsideInfo'] = {
          vehicleDescription: this._vehicleDescription().trim(),
        };
      }

      const order = await this.orderService.createOrder(orderData as Partial<any>);
      if (order) {
        this._orderNumber.set(getOrderIdentifier(order));
        this._submittedOrder.set(order);
        this._orderConfirmed.set(true);
        this._step.set('confirm');
        this.cartService.clear();
        this.startTracking(order.guid);
      } else {
        this._error.set(this.orderService.error() ?? 'Failed to submit order');
      }
    } catch (err: unknown) {
      this._error.set(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      this._isSubmitting.set(false);
    }
  }

  startNewOrder(): void {
    this.stopTracking();
    this._orderConfirmed.set(false);
    this._orderNumber.set('');
    this._submittedOrder.set(null);
    this._step.set('menu');
    this._customerFirstName.set('');
    this._customerLastName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
    this._deliveryAddress.set('');
    this._deliveryAddress2.set('');
    this._deliveryCity.set('');
    this._deliveryStateUS.set('');
    this._deliveryZip.set('');
    this._deliveryNotes.set('');
    this._vehicleDescription.set('');
    this._specialInstructions.set('');
    this._error.set(null);
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? '';
  }

  getDeliveryStateLabel(state: string): string {
    switch (state) {
      case 'PREPARING': return 'Preparing';
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery';
      case 'DELIVERED': return 'Delivered';
      default: return state;
    }
  }

  async notifyArrival(): Promise<void> {
    const order = this._submittedOrder();
    if (!order) return;
    await this.orderService.notifyCurbsideArrival(order.guid);
    // Update local state optimistically
    this._submittedOrder.set({
      ...order,
      curbsideInfo: order.curbsideInfo
        ? { ...order.curbsideInfo, arrivalNotified: true }
        : undefined,
    });
  }

  private startTracking(orderId: string): void {
    this.stopTracking();
    this._trackingInterval = setInterval(async () => {
      const orders = this.orderService.orders();
      const updated = orders.find(o => o.guid === orderId);
      if (updated) {
        this._submittedOrder.set(updated);
        // Stop tracking once order is closed
        if (updated.guestOrderStatus === 'CLOSED') {
          this.stopTracking();
        }
      }
    }, 15000);
  }

  private stopTracking(): void {
    if (this._trackingInterval) {
      clearInterval(this._trackingInterval);
      this._trackingInterval = null;
    }
  }
}
