import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { PaymentIntentResponse, PaymentStatusResponse, RefundResponse, PaymentStep } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private stripeInstance: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  private readonly _paymentStep = signal<PaymentStep>('cart');
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _clientSecret = signal<string | null>(null);
  private readonly _paymentIntentId = signal<string | null>(null);

  readonly paymentStep = this._paymentStep.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly clientSecret = this._clientSecret.asReadonly();
  readonly paymentIntentId = this._paymentIntentId.asReadonly();

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async ensureStripeLoaded(): Promise<Stripe | null> {
    if (this.stripeInstance) return this.stripeInstance;

    if (environment.stripePublishableKey.includes('placeholder')) {
      this._error.set('Stripe publishable key not configured — replace pk_test_placeholder in environment files');
      return null;
    }

    this.stripeInstance = await loadStripe(environment.stripePublishableKey);
    return this.stripeInstance;
  }

  async createPaymentIntent(orderId: string): Promise<PaymentIntentResponse | null> {
    if (!this.restaurantId) return null;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<PaymentIntentResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/payment-intent`,
          {}
        )
      );
      this._clientSecret.set(response.clientSecret);
      this._paymentIntentId.set(response.paymentIntentId);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create payment intent';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async mountPaymentElement(container: HTMLElement): Promise<boolean> {
    const stripe = await this.ensureStripeLoaded();
    const secret = this._clientSecret();

    if (!stripe || !secret) {
      this._error.set('Stripe not available');
      return false;
    }

    this.elements = stripe.elements({
      clientSecret: secret,
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#7E5EF2',
          colorBackground: '#03020D',
          colorText: '#ffffff',
          colorDanger: '#dc3545',
          borderRadius: '0.375rem',
          fontFamily: 'inherit',
        },
      },
    });

    this.paymentElement = this.elements.create('payment');
    this.paymentElement.mount(container);
    return true;
  }

  async confirmPayment(): Promise<boolean> {
    const stripe = this.stripeInstance;
    if (!stripe || !this.elements) {
      this._error.set('Payment not initialized');
      return false;
    }

    this._isProcessing.set(true);
    this._error.set(null);
    this._paymentStep.set('paying');

    try {
      const { error } = await stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: globalThis.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        this._error.set(error.message ?? 'Payment failed');
        this._paymentStep.set('failed');
        return false;
      }

      this._paymentStep.set('success');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment confirmation failed';
      this._error.set(message);
      this._paymentStep.set('failed');
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async getPaymentStatus(orderId: string): Promise<PaymentStatusResponse | null> {
    if (!this.restaurantId) return null;

    try {
      return await firstValueFrom(
        this.http.get<PaymentStatusResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/payment-status`
        )
      );
    } catch {
      return null;
    }
  }

  async cancelPayment(orderId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/cancel-payment`,
          {}
        )
      );
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel payment';
      this._error.set(message);
      return false;
    } finally {
      this._isProcessing.set(false);
    }
  }

  async requestRefund(orderId: string, amount?: number): Promise<RefundResponse | null> {
    if (!this.restaurantId) return null;

    this._isProcessing.set(true);
    this._error.set(null);

    try {
      const body = amount !== undefined ? { amount } : {};
      const response = await firstValueFrom(
        this.http.post<RefundResponse>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders/${orderId}/refund`,
          body
        )
      );
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process refund';
      this._error.set(message);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }

  reset(): void {
    this.paymentElement?.destroy();
    this.paymentElement = null;
    this.elements = null;
    this._paymentStep.set('cart');
    this._isProcessing.set(false);
    this._error.set(null);
    this._clientSecret.set(null);
    this._paymentIntentId.set(null);
  }

  setStep(step: PaymentStep): void {
    this._paymentStep.set(step);
  }

  clearError(): void {
    this._error.set(null);
  }
}
