import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { InventoryService } from '../../services/inventory';
import { AuthService } from '../../services/auth';
import {
  WasteEntry,
  WasteCategory,
  WasteSummary,
  WasteRecommendation,
  WasteTab,
} from '../../models/waste.model';

const WASTE_CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: 'prep_loss', label: 'Prep Loss' },
  { value: 'spoilage', label: 'Spoilage' },
  { value: 'customer_return', label: 'Customer Return' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'overproduction', label: 'Overproduction' },
];

@Component({
  selector: 'get-order-stack-waste-tracker',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './waste-tracker.html',
  styleUrl: './waste-tracker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WasteTracker {
  private readonly inventoryService = inject(InventoryService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly inventoryItems = this.inventoryService.items;

  private readonly _activeTab = signal<WasteTab>('log');
  private readonly _entries = signal<WasteEntry[]>([]);
  private readonly _showForm = signal(false);
  private readonly _categoryFilter = signal<WasteCategory | 'all'>('all');

  // Form signals
  private readonly _formItemId = signal('');
  private readonly _formCategory = signal<WasteCategory>('prep_loss');
  private readonly _formQuantity = signal(0);
  private readonly _formReason = signal('');

  private readonly _recommendations = signal<WasteRecommendation[]>([
    { title: 'Reduce chicken prep batches', description: 'Chicken prep waste averages 12% of total usage. Consider reducing batch size from 20 to 15 portions during weekdays.', estimatedSavings: '$180/week', priority: 'high', category: 'prep_loss' },
    { title: 'Improve produce storage rotation', description: 'Lettuce and tomato spoilage spikes on Mondays, suggesting weekend stock is not being rotated properly.', estimatedSavings: '$95/week', priority: 'high', category: 'spoilage' },
    { title: 'Adjust Friday prep quantities', description: 'Friday evening overproduction accounts for 30% of weekly waste. Align prep with actual Friday order volume.', estimatedSavings: '$120/week', priority: 'medium', category: 'overproduction' },
    { title: 'Review sauce portion sizes', description: 'Customer returns frequently cite "too much sauce" — consider reducing default portion by 15%.', estimatedSavings: '$45/week', priority: 'low', category: 'customer_return' },
  ]);

  readonly activeTab = this._activeTab.asReadonly();
  readonly entries = this._entries.asReadonly();
  readonly showForm = this._showForm.asReadonly();
  readonly categoryFilter = this._categoryFilter.asReadonly();
  readonly formItemId = this._formItemId.asReadonly();
  readonly formCategory = this._formCategory.asReadonly();
  readonly formQuantity = this._formQuantity.asReadonly();
  readonly formReason = this._formReason.asReadonly();
  readonly recommendations = this._recommendations.asReadonly();

  readonly wasteCategories = WASTE_CATEGORIES;

  readonly filteredEntries = computed(() => {
    const cat = this._categoryFilter();
    const list = this._entries();
    return cat === 'all' ? list : list.filter(e => e.category === cat);
  });

  readonly summary = computed<WasteSummary>(() => {
    const entries = this._entries();
    const byCategory = {} as Record<WasteCategory, { count: number; cost: number }>;
    for (const cat of WASTE_CATEGORIES) {
      const catEntries = entries.filter(e => e.category === cat.value);
      byCategory[cat.value] = {
        count: catEntries.length,
        cost: catEntries.reduce((sum, e) => sum + e.estimatedCost, 0),
      };
    }

    const itemMap = new Map<string, { name: string; totalCost: number; count: number }>();
    for (const entry of entries) {
      const existing = itemMap.get(entry.inventoryItemId);
      if (existing) {
        existing.totalCost += entry.estimatedCost;
        existing.count++;
      } else {
        itemMap.set(entry.inventoryItemId, {
          name: entry.itemName,
          totalCost: entry.estimatedCost,
          count: 1,
        });
      }
    }

    const topWasted = [...itemMap.values()]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      totalCost: entries.reduce((sum, e) => sum + e.estimatedCost, 0),
      byCategory,
      topWastedItems: topWasted,
    };
  });

  readonly totalWasteCost = computed(() => this.summary().totalCost);

  setTab(tab: WasteTab): void {
    this._activeTab.set(tab);
  }

  setCategoryFilter(cat: WasteCategory | 'all'): void {
    this._categoryFilter.set(cat);
  }

  openForm(): void {
    this._formItemId.set('');
    this._formCategory.set('prep_loss');
    this._formQuantity.set(0);
    this._formReason.set('');
    this._showForm.set(true);
  }

  closeForm(): void {
    this._showForm.set(false);
  }

  onFormField(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (field) {
      case 'item': this._formItemId.set(value); break;
      case 'category': this._formCategory.set(value as WasteCategory); break;
      case 'quantity': this._formQuantity.set(Number.parseFloat(value) || 0); break;
      case 'reason': this._formReason.set(value); break;
    }
  }

  logWaste(): void {
    const itemId = this._formItemId();
    const qty = this._formQuantity();
    if (!itemId || qty <= 0) return;

    const invItem = this.inventoryItems().find(i => i.id === itemId);
    if (!invItem) return;

    const entry: WasteEntry = {
      id: crypto.randomUUID(),
      inventoryItemId: itemId,
      itemName: invItem.name,
      category: this._formCategory(),
      quantity: qty,
      unit: invItem.unit,
      estimatedCost: qty * invItem.costPerUnit,
      reason: this._formReason().trim() || undefined,
      createdAt: new Date(),
    };

    this._entries.update(prev => [entry, ...prev]);

    // Also record usage in inventory service
    this.inventoryService.recordUsage(
      itemId,
      qty,
      `Waste: ${this.getCategoryLabel(this._formCategory())}${this._formReason() ? ' - ' + this._formReason() : ''}`
    );

    this.closeForm();
  }

  deleteEntry(entryId: string): void {
    this._entries.update(prev => prev.filter(e => e.id !== entryId));
  }

  getCategoryLabel(cat: WasteCategory): string {
    return WASTE_CATEGORIES.find(c => c.value === cat)?.label ?? cat;
  }

  getCategoryClass(cat: WasteCategory): string {
    switch (cat) {
      case 'prep_loss': return 'cat-prep';
      case 'spoilage': return 'cat-spoilage';
      case 'customer_return': return 'cat-return';
      case 'damaged': return 'cat-damaged';
      case 'overproduction': return 'cat-overprod';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      default: return 'priority-low';
    }
  }

  getCategoryPercent(cat: WasteCategory): number {
    const total = this.summary().totalCost;
    if (total === 0) return 0;
    return Math.round((this.summary().byCategory[cat].cost / total) * 100);
  }
}
