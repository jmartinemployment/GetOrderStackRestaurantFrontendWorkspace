import { Component, inject, output, signal, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../services/cart';
import { AuthService } from '../../services/auth';
import { OrderService } from '../../services/order';
import { SocketService } from '../../services/socket';
import { PaymentService } from '../../services/payment';
import { Modifier, ProfitInsight, PaymentStep } from '../../models';
import { environment } from '../../environments/environment';

@Component({
  selector: 'get-order-stack-checkout-modal',
  imports: [CurrencyPipe],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutModal {
  private readonly http = inject(HttpClient);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly socketService = inject(SocketService);
  private readonly paymentService = inject(PaymentService);
  private readonly apiUrl = environment.apiUrl;

  orderPlaced = output<string>();

  private readonly _isSubmitting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _tableNumber = signal('');
  private readonly _profitInsight = signal<ProfitInsight | null>(null);
  private readonly _orderId = signal<string | null>(null);
  private readonly _orderNumber = signal<string | null>(null);
  private readonly _stripeReady = signal(false);

  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly error = this._error.asReadonly();
  readonly tableNumber = this._tableNumber.asReadonly();
  readonly profitInsight = this._profitInsight.asReadonly();
  readonly orderId = this._orderId.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly stripeReady = this._stripeReady.asReadonly();

  readonly paymentStep = this.paymentService.paymentStep;
  readonly isProcessingPayment = this.paymentService.isProcessing;
  readonly paymentError = this.paymentService.error;

  readonly isOpen = this.cartService.isOpen;
  readonly items = this.cartService.items;
  readonly isEmpty = this.cartService.isEmpty;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly tax = this.cartService.tax;
  readonly tip = this.cartService.tip;
  readonly total = this.cartService.total;

  readonly stripeMount = viewChild<ElementRef>('stripeMount');

  close(): void {
    if (this.paymentStep() === 'paying') return;
    this.paymentService.reset();
    this.cartService.close();
    this._profitInsight.set(null);
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._stripeReady.set(false);
    this._error.set(null);
  }

  dismissProfitInsight(): void {
    this._profitInsight.set(null);
  }

  incrementQuantity(itemId: string): void {
    this.cartService.incrementQuantity(itemId);
  }

  decrementQuantity(itemId: string): void {
    this.cartService.decrementQuantity(itemId);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  onTableNumberInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._tableNumber.set(value);
    this._error.set(null);
  }

  formatModifiers(modifiers: Modifier[]): string {
    return modifiers.map(m => m.name).join(', ');
  }

  async submitOrder(): Promise<void> {
    if (this._isSubmitting()) return;

    if (!this._tableNumber().trim()) {
      this._error.set('Please enter a table number');
      return;
    }

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const restaurantId = this.authService.selectedRestaurantId();

      const orderData = {
        orderType: 'dine-in',
        orderSource: 'pos',
        sourceDeviceId: this.socketService.deviceId(),
        tableNumber: this._tableNumber().trim(),
        items: this.items().map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
          modifiers: item.selectedModifiers.map(m => ({ modifierId: m.id })),
        })),
      };

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/restaurant/${restaurantId}/orders`, orderData)
      );

      if (response) {
        const oId = response.id;
        const oNum = response.orderNumber ?? response.id;
        this._orderId.set(oId);
        this._orderNumber.set(oNum);

        const intentResult = await this.paymentService.createPaymentIntent(oId);

        if (intentResult) {
          this.paymentService.setStep('paying');

          setTimeout(async () => {
            const mountEl = this.stripeMount()?.nativeElement;
            if (mountEl) {
              const mounted = await this.paymentService.mountPaymentElement(mountEl);
              this._stripeReady.set(mounted);
            }
          }, 50);
        } else {
          this._error.set('Failed to initialize payment. Order was created but payment could not be started.');
          this.orderPlaced.emit(oNum);
          this._tableNumber.set('');
          this.cartService.clear();
        }
      } else {
        this._error.set('Failed to place order. Please try again.');
      }
    } catch (err: any) {
      this._error.set(err?.error?.error ?? 'An error occurred. Please try again.');
    } finally {
      this._isSubmitting.set(false);
    }
  }

  async confirmPayment(): Promise<void> {
    const success = await this.paymentService.confirmPayment();
    const oId = this._orderId();

    if (success && oId) {
      this.orderPlaced.emit(this._orderNumber() ?? oId);
      this._tableNumber.set('');
      this.cartService.clear();

      const insight = await this.orderService.getProfitInsight(oId);
      if (insight) {
        this._profitInsight.set(insight);
      }
    }
  }

  async cancelPayment(): Promise<void> {
    const oId = this._orderId();
    if (!oId) return;

    await this.paymentService.cancelPayment(oId);
    this.paymentService.reset();
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._stripeReady.set(false);
  }

  retryPayment(): void {
    this.paymentService.clearError();
    this.paymentService.setStep('paying');

    setTimeout(async () => {
      const mountEl = this.stripeMount()?.nativeElement;
      if (mountEl) {
        const mounted = await this.paymentService.mountPaymentElement(mountEl);
        this._stripeReady.set(mounted);
      }
    }, 50);
  }

  closeAfterSuccess(): void {
    this.paymentService.reset();
    this.cartService.close();
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._stripeReady.set(false);
  }
}
