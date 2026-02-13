import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  AISettings,
  OnlinePricingSettings,
  CateringCapacitySettings,
  PaymentSettings,
  TipManagementSettings,
  CapacityBlock,
  defaultAISettings,
  defaultOnlinePricingSettings,
  defaultCateringCapacitySettings,
  defaultPaymentSettings,
  defaultTipManagementSettings,
} from '../models';
import { Order } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RestaurantSettingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _aiSettings = signal<AISettings>(defaultAISettings());
  private readonly _onlinePricingSettings = signal<OnlinePricingSettings>(defaultOnlinePricingSettings());
  private readonly _cateringCapacitySettings = signal<CateringCapacitySettings>(defaultCateringCapacitySettings());
  private readonly _paymentSettings = signal<PaymentSettings>(defaultPaymentSettings());
  private readonly _tipManagementSettings = signal<TipManagementSettings>(defaultTipManagementSettings());
  private readonly _capacityBlocks = signal<CapacityBlock[]>([]);
  private readonly _cateringOrders = signal<Order[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly aiSettings = this._aiSettings.asReadonly();
  readonly onlinePricingSettings = this._onlinePricingSettings.asReadonly();
  readonly cateringCapacitySettings = this._cateringCapacitySettings.asReadonly();
  readonly paymentSettings = this._paymentSettings.asReadonly();
  readonly tipManagementSettings = this._tipManagementSettings.asReadonly();
  readonly capacityBlocks = this._capacityBlocks.asReadonly();
  readonly cateringOrders = this._cateringOrders.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly error = this._error.asReadonly();

  private get restaurantId(): string {
    return this.authService.selectedRestaurantId() ?? '';
  }

  async loadSettings(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<Record<string, unknown>>(
          `${this.apiUrl}/restaurant/${this.restaurantId}`
        )
      );

      const aiFromServer = response['aiSettings'] as Partial<AISettings> | undefined;
      const pricingFromServer = response['onlinePricingSettings'] as Partial<OnlinePricingSettings> | undefined;
      const cateringFromServer = response['cateringCapacitySettings'] as Partial<CateringCapacitySettings> | undefined;
      const paymentFromServer = response['paymentSettings'] as Partial<PaymentSettings> | undefined;

      this._aiSettings.set({
        ...defaultAISettings(),
        ...this.migrateAISettings(this.readLocalStorage('ai-settings') ?? {}),
        ...this.migrateAISettings((aiFromServer ?? {}) as Record<string, unknown>),
      });
      this._onlinePricingSettings.set({ ...defaultOnlinePricingSettings(), ...this.readLocalStorage('online-pricing-settings'), ...pricingFromServer });
      this._cateringCapacitySettings.set({ ...defaultCateringCapacitySettings(), ...this.readLocalStorage('catering-capacity-settings'), ...cateringFromServer });
      this._paymentSettings.set({ ...defaultPaymentSettings(), ...this.readLocalStorage('payment-settings'), ...paymentFromServer });

      const tipFromServer = response['tipManagementSettings'] as Partial<TipManagementSettings> | undefined;
      this._tipManagementSettings.set({ ...defaultTipManagementSettings(), ...this.readLocalStorage('tip-management-settings'), ...tipFromServer });
    } catch {
      // Backend may not have these fields yet — fall back to localStorage
      this._aiSettings.set({
        ...defaultAISettings(),
        ...this.migrateAISettings(this.readLocalStorage('ai-settings') ?? {}),
      });
      this._onlinePricingSettings.set({ ...defaultOnlinePricingSettings(), ...this.readLocalStorage('online-pricing-settings') });
      this._cateringCapacitySettings.set({ ...defaultCateringCapacitySettings(), ...this.readLocalStorage('catering-capacity-settings') });
      this._paymentSettings.set({ ...defaultPaymentSettings(), ...this.readLocalStorage('payment-settings') });
      this._tipManagementSettings.set({ ...defaultTipManagementSettings(), ...this.readLocalStorage('tip-management-settings') });
    } finally {
      this.loadCapacityBlocks();
      this._isLoading.set(false);
    }
  }

  async saveAISettings(s: AISettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { aiSettings: s }
        )
      );
    } catch {
      // Backend may not support this field yet — localStorage is the fallback
    } finally {
      localStorage.setItem(`${this.restaurantId}-ai-settings`, JSON.stringify(s));
      this._aiSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveOnlinePricingSettings(s: OnlinePricingSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { onlinePricingSettings: s }
        )
      );
    } catch {
      // Backend may not support this field yet
    } finally {
      localStorage.setItem(`${this.restaurantId}-online-pricing-settings`, JSON.stringify(s));
      this._onlinePricingSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveCateringCapacitySettings(s: CateringCapacitySettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { cateringCapacitySettings: s }
        )
      );
    } catch {
      // Backend may not support this field yet
    } finally {
      localStorage.setItem(`${this.restaurantId}-catering-capacity-settings`, JSON.stringify(s));
      this._cateringCapacitySettings.set(s);
      this._isSaving.set(false);
    }
  }

  async savePaymentSettings(s: PaymentSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { paymentSettings: s }
        )
      );
    } catch {
      // Backend may not support this field yet
    } finally {
      localStorage.setItem(`${this.restaurantId}-payment-settings`, JSON.stringify(s));
      this._paymentSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async saveTipManagementSettings(s: TipManagementSettings): Promise<void> {
    if (!this.restaurantId) return;
    this._isSaving.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}`,
          { tipManagementSettings: s }
        )
      );
    } catch {
      // Backend may not support this field yet
    } finally {
      localStorage.setItem(`${this.restaurantId}-tip-management-settings`, JSON.stringify(s));
      this._tipManagementSettings.set(s);
      this._isSaving.set(false);
    }
  }

  async loadCateringOrders(): Promise<void> {
    if (!this.restaurantId) return;
    this._isLoading.set(true);

    try {
      const orders = await firstValueFrom(
        this.http.get<Order[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/orders?orderType=catering&limit=200`
        )
      );
      this._cateringOrders.set(orders);
    } catch {
      this._error.set('Failed to load catering orders');
    } finally {
      this._isLoading.set(false);
    }
  }

  addCapacityBlock(block: Omit<CapacityBlock, 'id'>): void {
    const newBlock: CapacityBlock = {
      ...block,
      id: crypto.randomUUID(),
    };
    this._capacityBlocks.update(blocks => [...blocks, newBlock]);
    this.persistCapacityBlocks();
  }

  removeCapacityBlock(blockId: string): void {
    this._capacityBlocks.update(blocks => blocks.filter(b => b.id !== blockId));
    this.persistCapacityBlocks();
  }

  clearError(): void {
    this._error.set(null);
  }

  private migrateAISettings(raw: Record<string, unknown>): Partial<AISettings> {
    if ('aiCoursePacingEnabled' in raw && !('coursePacingMode' in raw)) {
      return {
        ...raw,
        coursePacingMode: raw['aiCoursePacingEnabled'] ? 'server_fires' : 'disabled',
      } as Partial<AISettings>;
    }
    return raw as Partial<AISettings>;
  }

  private readLocalStorage(key: string): Record<string, unknown> | undefined {
    if (!this.restaurantId) return undefined;
    const raw = localStorage.getItem(`${this.restaurantId}-${key}`);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  private loadCapacityBlocks(): void {
    if (!this.restaurantId) return;
    const raw = localStorage.getItem(`${this.restaurantId}-capacity-blocks`);
    if (raw) {
      try {
        this._capacityBlocks.set(JSON.parse(raw) as CapacityBlock[]);
      } catch {
        this._capacityBlocks.set([]);
      }
    }
  }

  private persistCapacityBlocks(): void {
    if (!this.restaurantId) return;
    localStorage.setItem(
      `${this.restaurantId}-capacity-blocks`,
      JSON.stringify(this._capacityBlocks())
    );
  }
}
