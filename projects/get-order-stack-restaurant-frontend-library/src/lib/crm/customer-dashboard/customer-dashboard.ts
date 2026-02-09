import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DecimalPipe, DatePipe } from '@angular/common';
import { CustomerService } from '../../services/customer';
import { AuthService } from '../../services/auth';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { Customer, CustomerSegment, CrmTab, CrmSortField } from '../../models';

@Component({
  selector: 'get-order-stack-crm',
  imports: [CurrencyPipe, DecimalPipe, DatePipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './customer-dashboard.html',
  styleUrl: './customer-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboard {
  private readonly customerService = inject(CustomerService);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<CrmTab>('customers');
  private readonly _searchTerm = signal('');
  private readonly _segmentFilter = signal<CustomerSegment | null>(null);
  private readonly _sortField = signal<CrmSortField>('totalSpent');
  private readonly _sortAsc = signal(false);
  private readonly _selectedCustomer = signal<Customer | null>(null);

  readonly activeTab = this._activeTab.asReadonly();
  readonly searchTerm = this._searchTerm.asReadonly();
  readonly segmentFilter = this._segmentFilter.asReadonly();
  readonly sortField = this._sortField.asReadonly();
  readonly sortAsc = this._sortAsc.asReadonly();
  readonly selectedCustomer = this._selectedCustomer.asReadonly();

  readonly customers = this.customerService.customers;
  readonly isLoading = this.customerService.isLoading;
  readonly error = this.customerService.error;

  readonly filteredCustomers = computed(() => {
    let list = this.customers();
    const search = this._searchTerm().toLowerCase();
    const segment = this._segmentFilter();

    if (search) {
      list = list.filter(c =>
        (c.firstName ?? '').toLowerCase().includes(search) ||
        (c.lastName ?? '').toLowerCase().includes(search) ||
        (c.email ?? '').toLowerCase().includes(search) ||
        (c.phone ?? '').includes(search)
      );
    }

    if (segment) {
      list = list.filter(c => this.customerService.getSegment(c).segment === segment);
    }

    const field = this._sortField();
    const asc = this._sortAsc();
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = (a.firstName ?? '').localeCompare(b.firstName ?? '');
          break;
        case 'totalSpent':
          cmp = a.totalSpent - b.totalSpent;
          break;
        case 'totalOrders':
          cmp = a.totalOrders - b.totalOrders;
          break;
        case 'lastOrderDate':
          cmp = new Date(a.lastOrderDate ?? 0).getTime() - new Date(b.lastOrderDate ?? 0).getTime();
          break;
        case 'loyaltyPoints':
          cmp = a.loyaltyPoints - b.loyaltyPoints;
          break;
      }
      return asc ? cmp : -cmp;
    });

    return list;
  });

  readonly segmentCounts = computed(() => {
    const counts = { vip: 0, regular: 0, new: 0, 'at-risk': 0, dormant: 0 };
    for (const customer of this.customers()) {
      const seg = this.customerService.getSegment(customer).segment;
      counts[seg]++;
    }
    return counts;
  });

  readonly totalCustomers = computed(() => this.customers().length);
  readonly totalRevenue = computed(() =>
    this.customers().reduce((sum, c) => sum + c.totalSpent, 0)
  );
  readonly avgLifetimeValue = computed(() => {
    const count = this.totalCustomers();
    return count > 0 ? this.totalRevenue() / count : 0;
  });
  readonly totalLoyaltyPoints = computed(() =>
    this.customers().reduce((sum, c) => sum + c.loyaltyPoints, 0)
  );

  constructor() {
    effect(() => {
      if (this.isAuthenticated() && this.authService.selectedRestaurantId()) {
        this.customerService.loadCustomers();
      }
    });
  }

  setTab(tab: CrmTab): void {
    this._activeTab.set(tab);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._searchTerm.set(value);
  }

  setSegmentFilter(segment: CustomerSegment | null): void {
    this._segmentFilter.set(segment);
  }

  toggleSort(field: CrmSortField): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(false);
    }
  }

  selectCustomer(customer: Customer): void {
    this._selectedCustomer.set(customer);
  }

  closeDetail(): void {
    this._selectedCustomer.set(null);
  }

  getSegment(customer: Customer) {
    return this.customerService.getSegment(customer);
  }

  getCustomerName(customer: Customer): string {
    const parts = [customer.firstName, customer.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown';
  }

  getDaysSinceOrder(customer: Customer): number | null {
    if (!customer.lastOrderDate) return null;
    return Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
  }

  getSortIcon(field: CrmSortField): string {
    if (this._sortField() !== field) return '';
    return this._sortAsc() ? 'asc' : 'desc';
  }

  clearError(): void {
    this.customerService.clearError();
  }

  retry(): void {
    this.customerService.loadCustomers();
  }
}
