import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '../../services/menu';
import { CartService } from '../../services/cart';
import { OrderService } from '../../services/order';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { MenuItem, OrderType } from '../../models';
import { environment } from '../../environments/environment';

type OnlineStep = 'menu' | 'cart' | 'info' | 'confirm';

@Component({
  selector: 'get-order-stack-online-ordering',
  imports: [CurrencyPipe, LoadingSpinner],
  templateUrl: './online-order-portal.html',
  styleUrl: './online-order-portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnlineOrderPortal {
  private readonly menuService = inject(MenuService);
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _step = signal<OnlineStep>('menu');
  private readonly _selectedCategory = signal<string | null>(null);
  private readonly _searchTerm = signal('');
  private readonly _orderType = signal<OrderType>('pickup');
  private readonly _customerName = signal('');
  private readonly _customerPhone = signal('');
  private readonly _customerEmail = signal('');
  private readonly _deliveryAddress = signal('');
  private readonly _specialInstructions = signal('');
  private readonly _isSubmitting = signal(false);
  private readonly _orderConfirmed = signal(false);
  private readonly _orderNumber = signal('');
  private readonly _error = signal<string | null>(null);

  readonly step = this._step.asReadonly();
  readonly selectedCategory = this._selectedCategory.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly orderType = this._orderType.asReadonly();
  readonly customerName = this._customerName.asReadonly();
  readonly customerPhone = this._customerPhone.asReadonly();
  readonly customerEmail = this._customerEmail.asReadonly();
  readonly deliveryAddress = this._deliveryAddress.asReadonly();
  readonly specialInstructions = this._specialInstructions.asReadonly();
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly orderConfirmed = this._orderConfirmed.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly error = this._error.asReadonly();

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
    const name = this._customerName().trim();
    const phone = this._customerPhone().trim();
    if (!name || !phone) return false;
    if (this._orderType() === 'delivery' && !this._deliveryAddress().trim()) return false;
    return this.cartItemCount() > 0;
  });

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? environment.defaultRestaurantId;
  }

  constructor() {
    effect(() => {
      const rid = this.authService.selectedRestaurantId() ?? environment.defaultRestaurantId;
      if (rid) {
        this.menuService.loadMenuForRestaurant(rid);
      }
    });
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
      case 'name': this._customerName.set(value); break;
      case 'phone': this._customerPhone.set(value); break;
      case 'email': this._customerEmail.set(value); break;
      case 'address': this._deliveryAddress.set(value); break;
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
      const orderData = {
        orderType: this._orderType(),
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
          name: this._customerName().trim(),
          phone: this._customerPhone().trim(),
          email: this._customerEmail().trim() || undefined,
        },
        specialInstructions: this._specialInstructions().trim() || undefined,
        deliveryAddress: this._orderType() === 'delivery' ? this._deliveryAddress().trim() : undefined,
      };

      const order = await this.orderService.createOrder(orderData as Partial<any>);
      if (order) {
        this._orderNumber.set(order.orderNumber || order.id.slice(-4).toUpperCase());
        this._orderConfirmed.set(true);
        this._step.set('confirm');
        this.cartService.clear();
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
    this._orderConfirmed.set(false);
    this._orderNumber.set('');
    this._step.set('menu');
    this._customerName.set('');
    this._customerPhone.set('');
    this._customerEmail.set('');
    this._deliveryAddress.set('');
    this._specialInstructions.set('');
    this._error.set(null);
  }

  getCategoryName(categoryId: string): string {
    return this.categories().find(c => c.id === categoryId)?.name ?? '';
  }
}
