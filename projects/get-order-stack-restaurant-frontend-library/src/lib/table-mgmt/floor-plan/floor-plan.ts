import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TableService } from '../../services/table';
import { OrderService } from '../../services/order';
import { LoadingSpinner } from '../../shared/loading-spinner/loading-spinner';
import { ErrorDisplay } from '../../shared/error-display/error-display';
import { RestaurantTable, TableFormData, TableStatus } from '../../models';
import { Order } from '../../models';

@Component({
  selector: 'get-order-stack-floor-plan',
  imports: [CurrencyPipe, LoadingSpinner, ErrorDisplay],
  templateUrl: './floor-plan.html',
  styleUrl: './floor-plan.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlan implements OnInit {
  private readonly tableService = inject(TableService);
  private readonly orderService = inject(OrderService);
  private readonly canvasRef = viewChild<ElementRef<HTMLDivElement>>('floorCanvas');

  readonly tables = this.tableService.tables;
  readonly isLoading = this.tableService.isLoading;
  readonly error = this.tableService.error;
  readonly orders = this.orderService.orders;

  // View state
  private readonly _activeView = signal<'floor' | 'list'>('floor');
  private readonly _sectionFilter = signal<string>('all');
  private readonly _selectedTable = signal<RestaurantTable | null>(null);
  private readonly _showAddForm = signal(false);
  private readonly _editingTable = signal<RestaurantTable | null>(null);

  readonly activeView = this._activeView.asReadonly();
  readonly sectionFilter = this._sectionFilter.asReadonly();
  readonly selectedTable = this._selectedTable.asReadonly();
  readonly showAddForm = this._showAddForm.asReadonly();
  readonly editingTable = this._editingTable.asReadonly();

  // Form state
  private readonly _formNumber = signal('');
  private readonly _formName = signal('');
  private readonly _formCapacity = signal(4);
  private readonly _formSection = signal('');

  readonly formNumber = this._formNumber.asReadonly();
  readonly formName = this._formName.asReadonly();
  readonly formCapacity = this._formCapacity.asReadonly();
  readonly formSection = this._formSection.asReadonly();

  // Drag state
  private readonly _isDragging = signal(false);
  private readonly _dragTableId = signal<string | null>(null);
  private _dragOffsetX = 0;
  private _dragOffsetY = 0;
  private readonly _dragX = signal(0);
  private readonly _dragY = signal(0);

  readonly isDragging = this._isDragging.asReadonly();
  readonly dragTableId = this._dragTableId.asReadonly();
  readonly dragX = this._dragX.asReadonly();
  readonly dragY = this._dragY.asReadonly();

  // Action state
  private readonly _isSubmitting = signal(false);
  private readonly _actionError = signal<string | null>(null);
  private readonly _showStatusMenu = signal<string | null>(null);
  private readonly _showDeleteConfirm = signal<string | null>(null);

  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly showStatusMenu = this._showStatusMenu.asReadonly();
  readonly showDeleteConfirm = this._showDeleteConfirm.asReadonly();

  readonly sections = computed(() => {
    const sectionSet = new Set<string>();
    for (const table of this.tables()) {
      if (table.section) sectionSet.add(table.section);
    }
    return Array.from(sectionSet).sort();
  });

  readonly filteredTables = computed(() => {
    const filter = this._sectionFilter();
    if (filter === 'all') return this.tables();
    return this.tables().filter(t => t.section === filter);
  });

  readonly placedTables = computed(() =>
    this.filteredTables().filter(t => t.posX !== null && t.posY !== null)
  );

  readonly unplacedTables = computed(() =>
    this.filteredTables().filter(t => t.posX === null || t.posY === null)
  );

  readonly statusCounts = computed(() => {
    const counts = { available: 0, occupied: 0, reserved: 0, other: 0 };
    for (const table of this.tables()) {
      if (table.status === 'available') counts.available++;
      else if (table.status === 'occupied') counts.occupied++;
      else if (table.status === 'reserved') counts.reserved++;
      else counts.other++;
    }
    return counts;
  });

  readonly totalCapacity = computed(() =>
    this.tables().reduce((sum, t) => sum + t.capacity, 0)
  );

  readonly statusOptions: { value: TableStatus; label: string }[] = [
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'dirty', label: 'Dirty' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  ngOnInit(): void {
    this.tableService.loadTables();
    this.orderService.loadOrders();
  }

  setView(view: 'floor' | 'list'): void {
    this._activeView.set(view);
  }

  setSectionFilter(section: string): void {
    this._sectionFilter.set(section);
  }

  selectTable(table: RestaurantTable): void {
    this._selectedTable.set(table);
    this._showStatusMenu.set(null);
  }

  deselectTable(): void {
    this._selectedTable.set(null);
  }

  // --- Form ---

  openAddForm(): void {
    this._formNumber.set('');
    this._formName.set('');
    this._formCapacity.set(4);
    this._formSection.set('');
    this._editingTable.set(null);
    this._showAddForm.set(true);
    this._actionError.set(null);
  }

  openEditForm(table: RestaurantTable): void {
    this._formNumber.set(table.tableNumber);
    this._formName.set(table.tableName ?? '');
    this._formCapacity.set(table.capacity);
    this._formSection.set(table.section ?? '');
    this._editingTable.set(table);
    this._showAddForm.set(true);
    this._actionError.set(null);
  }

  closeForm(): void {
    this._showAddForm.set(false);
    this._editingTable.set(null);
    this._actionError.set(null);
  }

  setFormNumber(value: string): void { this._formNumber.set(value); }
  setFormName(value: string): void { this._formName.set(value); }
  setFormCapacity(value: number): void { this._formCapacity.set(value); }
  setFormSection(value: string): void { this._formSection.set(value); }

  async submitForm(): Promise<void> {
    const number = this._formNumber().trim();
    if (!number) {
      this._actionError.set('Table number is required');
      return;
    }

    this._isSubmitting.set(true);
    this._actionError.set(null);

    const data: TableFormData = {
      tableNumber: number,
      capacity: this._formCapacity(),
    };
    const name = this._formName().trim();
    const section = this._formSection().trim();
    if (name) data.tableName = name;
    if (section) data.section = section;

    const editing = this._editingTable();
    if (editing) {
      const result = await this.tableService.updateTable(editing.id, data);
      if (result) {
        this.closeForm();
        if (this._selectedTable()?.id === editing.id) {
          this._selectedTable.set(result);
        }
      } else {
        this._actionError.set(this.tableService.error() ?? 'Update failed');
      }
    } else {
      const result = await this.tableService.createTable(data);
      if (result) {
        this.closeForm();
      } else {
        this._actionError.set(this.tableService.error() ?? 'Create failed');
      }
    }

    this._isSubmitting.set(false);
  }

  // --- Status ---

  toggleStatusMenu(tableId: string, event: Event): void {
    event.stopPropagation();
    this._showStatusMenu.set(
      this._showStatusMenu() === tableId ? null : tableId
    );
  }

  async setTableStatus(tableId: string, status: string): Promise<void> {
    this._showStatusMenu.set(null);
    await this.tableService.updateStatus(tableId, status);
    const selected = this._selectedTable();
    if (selected?.id === tableId) {
      const updated = this.tables().find(t => t.id === tableId);
      if (updated) this._selectedTable.set(updated);
    }
  }

  // --- Delete ---

  confirmDelete(tableId: string, event: Event): void {
    event.stopPropagation();
    this._showDeleteConfirm.set(tableId);
  }

  cancelDelete(): void {
    this._showDeleteConfirm.set(null);
  }

  async deleteTable(tableId: string): Promise<void> {
    this._showDeleteConfirm.set(null);
    const success = await this.tableService.deleteTable(tableId);
    if (success && this._selectedTable()?.id === tableId) {
      this._selectedTable.set(null);
    }
  }

  // --- Drag & Drop ---

  onDragStart(table: RestaurantTable, event: PointerEvent): void {
    event.preventDefault();
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const startX = table.posX ?? 0;
    const startY = table.posY ?? 0;

    this._dragTableId.set(table.id);
    this._isDragging.set(true);
    this._dragOffsetX = event.clientX - rect.left - startX;
    this._dragOffsetY = event.clientY - rect.top - startY;
    this._dragX.set(startX);
    this._dragY.set(startY);
  }

  onDragMove(event: PointerEvent): void {
    if (!this._isDragging()) return;
    event.preventDefault();

    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 80, event.clientX - rect.left - this._dragOffsetX));
    const y = Math.max(0, Math.min(rect.height - 60, event.clientY - rect.top - this._dragOffsetY));

    this._dragX.set(Math.round(x));
    this._dragY.set(Math.round(y));
  }

  async onDragEnd(): Promise<void> {
    if (!this._isDragging()) return;
    const tableId = this._dragTableId();
    const x = this._dragX();
    const y = this._dragY();

    this._isDragging.set(false);
    this._dragTableId.set(null);

    if (tableId) {
      await this.tableService.updatePosition(tableId, x, y);
    }
  }

  async placeTableOnCanvas(table: RestaurantTable): Promise<void> {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    // Place at center of visible canvas
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(rect.width / 2 - 40);
    const y = Math.round(rect.height / 2 - 30);

    await this.tableService.updatePosition(table.id, x, y);
  }

  async removeFromCanvas(table: RestaurantTable, event: Event): Promise<void> {
    event.stopPropagation();
    await this.tableService.updateTable(table.id, { posX: null as unknown as number, posY: null as unknown as number });
  }

  // --- Helpers ---

  getTableStyle(table: RestaurantTable): string {
    if (this._dragTableId() === table.id) {
      return `left:${this._dragX()}px;top:${this._dragY()}px`;
    }
    return `left:${table.posX ?? 0}px;top:${table.posY ?? 0}px`;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'available': return 'status-available';
      case 'occupied': return 'status-occupied';
      case 'reserved': return 'status-reserved';
      case 'dirty': return 'status-dirty';
      case 'maintenance': return 'status-maintenance';
      default: return 'status-available';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'available': return 'bg-success';
      case 'occupied': return 'bg-danger';
      case 'reserved': return 'bg-warning text-dark';
      case 'dirty': return 'bg-secondary';
      case 'maintenance': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  getTableOrders(tableId: string): Order[] {
    return this.orders().filter(
      o => o.tableId === tableId && o.status !== 'completed' && o.status !== 'cancelled'
    );
  }

  getTableOrderTotal(tableId: string): number {
    return this.getTableOrders(tableId).reduce((sum, o) => sum + o.total, 0);
  }

  retry(): void {
    this.tableService.loadTables();
  }
}
