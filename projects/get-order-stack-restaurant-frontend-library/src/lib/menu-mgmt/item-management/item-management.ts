import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { MenuService } from '../../services/menu';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { MenuItem, DietaryInfo } from '../../models';

@Component({
  selector: 'get-order-stack-item-management',
  imports: [ReactiveFormsModule, CurrencyPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './item-management.html',
  styleUrl: './item-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemManagement implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _editingItem = signal<MenuItem | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _selectedCategoryId = signal<string | null>(null);

  readonly editingItem = this._editingItem.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  readonly items = this.menuService.allItems;
  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly error = this.menuService.error;

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

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.menuService.loadMenu();
    }
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

    try {
      const formValue = this.itemForm.value;
      const dietaryStrings = formValue.dietary
        ? formValue.dietary.split(',').map(d => d.trim().toLowerCase()).filter(d => d)
        : [];

      // Validate and cast dietary values
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
        await this.menuService.updateItem(
          this._editingItem()!.id,
          data
        );
      } else {
        await this.menuService.createItem(data);
      }

      this.closeForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async deleteItem(item: MenuItem): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    await this.menuService.deleteItem(item.id);
  }

  async toggleActive(item: MenuItem): Promise<void> {
    await this.menuService.updateItem(
      item.id,
      { isActive: !item.isActive }
    );
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || 'Unknown';
  }

  retry(): void {
    this.menuService.loadMenu();
  }
}
