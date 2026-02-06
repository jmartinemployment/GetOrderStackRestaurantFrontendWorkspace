import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MenuService } from '../../services/menu';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { MenuCategory } from '../../models';

@Component({
  selector: 'get-order-stack-category-management',
  imports: [ReactiveFormsModule, LoadingSpinner, ErrorDisplay],
  templateUrl: './category-management.html',
  styleUrl: './category-management.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagement implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _editingCategory = signal<MenuCategory | null>(null);
  private readonly _showForm = signal(false);
  private readonly _isSaving = signal(false);

  readonly editingCategory = this._editingCategory.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();

  readonly categories = this.menuService.categories;
  readonly isLoading = this.menuService.isLoading;
  readonly error = this.menuService.error;

  readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    if (this.isAuthenticated()) {
      this.menuService.loadMenu();
    }
  }

  openCreateForm(): void {
    this._editingCategory.set(null);
    this.categoryForm.reset({ name: '', description: '', isActive: true });
    this._showForm.set(true);
  }

  openEditForm(category: MenuCategory): void {
    this._editingCategory.set(category);
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive ?? true,
    });
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
    this._editingCategory.set(null);
    this.categoryForm.reset();
  }

  async saveCategory(): Promise<void> {
    if (this.categoryForm.invalid || this._isSaving()) return;

    this._isSaving.set(true);

    try {
      const formValue = this.categoryForm.value;
      const data = {
        name: formValue.name!,
        description: formValue.description || undefined,
        isActive: formValue.isActive ?? true,
      };

      if (this._editingCategory()) {
        await this.menuService.updateCategory(
          this._editingCategory()!.id,
          data
        );
      } else {
        await this.menuService.createCategory(data);
      }

      this.closeForm();
    } finally {
      this._isSaving.set(false);
    }
  }

  async deleteCategory(category: MenuCategory): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    await this.menuService.deleteCategory(category.id);
  }

  async toggleActive(category: MenuCategory): Promise<void> {
    await this.menuService.updateCategory(
      category.id,
      { isActive: !category.isActive }
    );
  }

  retry(): void {
    this.menuService.loadMenu();
  }
}
