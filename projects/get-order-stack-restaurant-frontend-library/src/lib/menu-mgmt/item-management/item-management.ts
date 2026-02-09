import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '../../services/menu';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { MenuItem, DietaryInfo, AICostEstimation } from '../../models';

@Component({
  selector: 'get-order-stack-item-management',
  imports: [ReactiveFormsModule, CurrencyPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './item-management.html',
  styleUrl: './item-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemManagement {
  private readonly fb = inject(FormBuilder);
  readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _editingItem = signal<MenuItem | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _selectedCategoryId = signal<string | null>(null);
  private readonly _localError = signal<string | null>(null);
  private readonly _menuLoaded = signal(false);
  private readonly _isEstimating = signal<string | null>(null);
  private readonly _isGenerating = signal<string | null>(null);
  private readonly _lastEstimation = signal<AICostEstimation | null>(null);

  readonly editingItem = this._editingItem.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();
  readonly localError = this._localError.asReadonly();
  readonly isEstimating = this._isEstimating.asReadonly();
  readonly isGenerating = this._isGenerating.asReadonly();
  readonly lastEstimation = this._lastEstimation.asReadonly();

  readonly items = this.menuService.allItems;
  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly crudSupported = this.menuService.crudSupported;

  readonly filteredItems = computed(() => {
    const catId = this._selectedCategoryId();
    if (!catId) return this.items();
    return this.items().filter(item => item.categoryId === catId);
  });

  readonly itemForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    categoryId: ['', Validators.required],
    image: [''],
    isActive: [true],
    isPopular: [false],
    dietary: [''],
  });

  constructor() {
    effect(() => {
      const restaurantId = this.authService.selectedRestaurantId();
      if (this.isAuthenticated() && restaurantId && !this._menuLoaded()) {
        this._menuLoaded.set(true);
        this.menuService.loadMenu();
      }
    });
  }

  selectCategory(categoryId: string | null): void {
    this._selectedCategoryId.set(categoryId);
  }

  openCreateForm(): void {
    this._editingItem.set(null);
    this.itemForm.reset({
      name: '',
      description: '',
      price: 0,
      categoryId: this._selectedCategoryId() || '',
      image: '',
      isActive: true,
      isPopular: false,
      dietary: '',
    });
    this._showForm.set(true);
  }

  openEditForm(item: MenuItem): void {
    this._editingItem.set(item);
    this.itemForm.patchValue({
      name: item.name,
      description: item.description || '',
      price: Number(item.price),
      categoryId: item.categoryId,
      image: item.image || '',
      isActive: item.isActive ?? true,
      isPopular: item.isPopular ?? false,
      dietary: item.dietary?.join(', ') || '',
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingItem.set(null);
    this.itemForm.reset();
  }

  async saveItem(): Promise<void> {
    if (this.itemForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);
    this._localError.set(null);

    try {
      const formValue = this.itemForm.value;
      const dietaryStrings = formValue.dietary
        ? formValue.dietary.split(',').map(d => d.trim().toLowerCase()).filter(d => d)
        : [];

      const validDietary: DietaryInfo[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'spicy', 'halal', 'kosher'];
      const dietary = dietaryStrings.filter(d => validDietary.includes(d as DietaryInfo)) as DietaryInfo[];

      const data: Partial<MenuItem> = {
        name: formValue.name!,
        description: formValue.description || undefined,
        price: formValue.price!,
        categoryId: formValue.categoryId!,
        image: formValue.image || undefined,
        isActive: formValue.isActive ?? true,
        isPopular: formValue.isPopular ?? false,
        dietary,
      };

      if (this._editingItem()) {
        const success = await this.menuService.updateItem(
          this._editingItem()!.id,
          data
        );
        if (!success) {
          this._localError.set(this.menuService.error() ?? 'Failed to update item');
          return;
        }
      } else {
        const result = await this.menuService.createItem(data);
        if (!result) {
          this._localError.set(this.menuService.error() ?? 'Failed to create item');
          return;
        }
      }

      this.closeForm();
    } catch (err: any) {
      this._localError.set(err?.message ?? 'An unexpected error occurred');
    } finally {
      this._isSaving.set(false);
    }
  }

  async deleteItem(item: MenuItem): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    this._localError.set(null);
    try {
      const success = await this.menuService.deleteItem(item.id);
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to delete item');
      }
    } catch (err: any) {
      this._localError.set(err?.message ?? 'An unexpected error occurred');
    }
  }

  async toggleActive(item: MenuItem): Promise<void> {
    this._localError.set(null);
    try {
      const success = await this.menuService.updateItem(
        item.id,
        { isActive: !item.isActive }
      );
      if (!success) {
        this._localError.set(this.menuService.error() ?? 'Failed to update item');
      }
    } catch (err: any) {
      this._localError.set(err?.message ?? 'An unexpected error occurred');
    }
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  clearLocalError(): void {
    this._localError.set(null);
  }

  retry(): void {
    this._localError.set(null);
    this.menuService.loadMenu();
  }

  async estimateCost(item: MenuItem): Promise<void> {
    this._isEstimating.set(item.id);
    this._localError.set(null);
    try {
      const result = await this.menuService.estimateItemCost(item.id);
      if (result) {
        this._lastEstimation.set(result.estimation);
      } else {
        this._localError.set(this.menuService.error() ?? 'Failed to estimate cost');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to estimate cost');
    } finally {
      this._isEstimating.set(null);
    }
  }

  async generateDescription(item: MenuItem): Promise<void> {
    this._isGenerating.set(item.id);
    this._localError.set(null);
    try {
      const result = await this.menuService.generateItemDescription(item.id);
      if (!result) {
        this._localError.set(this.menuService.error() ?? 'Failed to generate description');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to generate description');
    } finally {
      this._isGenerating.set(null);
    }
  }

  async estimateAllCosts(): Promise<void> {
    this._isEstimating.set('all');
    this._localError.set(null);
    try {
      const result = await this.menuService.estimateAllCosts();
      if (!result) {
        this._localError.set(this.menuService.error() ?? 'Failed to estimate costs');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to estimate costs');
    } finally {
      this._isEstimating.set(null);
    }
  }

  async generateAllDescriptions(): Promise<void> {
    this._isGenerating.set('all');
    this._localError.set(null);
    try {
      const result = await this.menuService.generateAllDescriptions();
      if (!result) {
        this._localError.set(this.menuService.error() ?? 'Failed to generate descriptions');
      }
    } catch (err: unknown) {
      this._localError.set(err instanceof Error ? err.message : 'Failed to generate descriptions');
    } finally {
      this._isGenerating.set(null);
    }
  }

  dismissEstimation(): void {
    this._lastEstimation.set(null);
  }

  getConfidenceBadgeClass(confidence: string): string {
    switch (confidence) {
      case 'high': return 'bg-success';
      case 'medium': return 'bg-warning text-dark';
      case 'low': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
