import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RestaurantSettingsService } from '../../services/restaurant-settings';
import { PaymentProcessorType, PaymentSettings } from '../../models';

@Component({
  selector: 'get-order-stack-payment-settings',
  templateUrl: './payment-settings.html',
  styleUrl: './payment-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSettingsComponent implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);

  private readonly _processor = signal<PaymentProcessorType>('none');
  private readonly _requirePayment = signal(false);
  private readonly _saved = signal(false);

  readonly processor = this._processor.asReadonly();
  readonly requirePayment = this._requirePayment.asReadonly();
  readonly isSaving = this.settingsService.isSaving;
  readonly saved = this._saved.asReadonly();

  readonly isDirty = computed(() => {
    const current = this.settingsService.paymentSettings();
    return this._processor() !== current.processor
      || this._requirePayment() !== current.requirePaymentBeforeKitchen;
  });

  ngOnInit(): void {
    const s = this.settingsService.paymentSettings();
    this._processor.set(s.processor);
    this._requirePayment.set(s.requirePaymentBeforeKitchen);
  }

  onProcessorChange(event: Event): void {
    this._processor.set((event.target as HTMLInputElement).value as PaymentProcessorType);
    this._saved.set(false);
  }

  onRequirePaymentChange(event: Event): void {
    this._requirePayment.set((event.target as HTMLInputElement).checked);
    this._saved.set(false);
  }

  async save(): Promise<void> {
    const settings: PaymentSettings = {
      processor: this._processor(),
      requirePaymentBeforeKitchen: this._requirePayment(),
    };
    await this.settingsService.savePaymentSettings(settings);
    this._saved.set(true);
  }

  discard(): void {
    const s = this.settingsService.paymentSettings();
    this._processor.set(s.processor);
    this._requirePayment.set(s.requirePaymentBeforeKitchen);
    this._saved.set(false);
  }
}
