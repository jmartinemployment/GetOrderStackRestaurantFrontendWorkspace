import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MenuCategory, MenuItem } from '../models';
import { AuthService } from './auth';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  // Private writable signals
  private readonly _categories = signal<MenuCategory[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentLanguage = signal<'en' | 'es'>('es');

  // Public readonly signals
  readonly categories = this._categories.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentLanguage = this._currentLanguage.asReadonly();

  // Computed signals
  readonly activeCategories = computed(() =>
    this._categories().filter(cat => cat.isActive !== false)
  );

  readonly allItems = computed(() => {
    const items: MenuItem[] = [];
    const collectItems = (categories: MenuCategory[]) => {
      for (const cat of categories) {
        if (cat.items) {
          items.push(...cat.items.filter(item => item.isActive !== false));
        }
        if (cat.subcategories) {
          collectItems(cat.subcategories);
        }
      }
    };
    collectItems(this._categories());
    return items;
  });

  readonly popularItems = computed(() =>
    this.allItems().filter(item => item.popular || item.isPopular)
  );

  private get restaurantId(): string | null {
    return this.authService.selectedRestaurantId();
  }

  async loadMenu(): Promise<void> {
    if (!this.restaurantId) {
      this._error.set('No restaurant selected');
      return;
    }

    if (this._isLoading()) {
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<MenuCategory[]>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/grouped?lang=${this._currentLanguage()}`
        )
      );
      this._categories.set(response || []);
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to load menu';
      this._error.set(message);
    } finally {
      this._isLoading.set(false);
    }
  }

  setLanguage(lang: 'en' | 'es'): void {
    this._currentLanguage.set(lang);
    this.loadMenu();
  }

  async createCategory(data: Partial<MenuCategory>): Promise<MenuCategory | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const category = await firstValueFrom(
        this.http.post<MenuCategory>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/categories`,
          data
        )
      );
      await this.loadMenu();
      return category;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to create category';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateCategory(categoryId: string, data: Partial<MenuCategory>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/categories/${categoryId}`,
          data
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to update category';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/categories/${categoryId}`
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to delete category';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async createItem(data: Partial<MenuItem>): Promise<MenuItem | null> {
    if (!this.restaurantId) return null;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const item = await firstValueFrom(
        this.http.post<MenuItem>(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items`,
          data
        )
      );
      await this.loadMenu();
      return item;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to create item';
      this._error.set(message);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateItem(itemId: string, data: Partial<MenuItem>): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}`,
          data
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to update item';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  async deleteItem(itemId: string): Promise<boolean> {
    if (!this.restaurantId) return false;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/restaurant/${this.restaurantId}/menu/items/${itemId}`
        )
      );
      await this.loadMenu();
      return true;
    } catch (err: any) {
      const message = err?.error?.message ?? 'Failed to delete item';
      this._error.set(message);
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
