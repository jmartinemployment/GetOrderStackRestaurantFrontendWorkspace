import { Component, inject, output, signal, computed, ChangeDetectionStrategy, ElementRef, viewChild } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../services/cart';
import { AuthService } from '../../services/auth';
import { SocketService } from '../../services/socket';
import { PaymentService } from '../../services/payment';
import { Modifier, CustomerInfo, Course } from '../../models';
import {
  DiningOptionType,
  DINING_OPTIONS,
  getDiningOption,
  validateDiningRequirements,
  DeliveryInfo,
  CurbsideInfo,
  CateringInfo,
} from '../../models/dining-option.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'get-order-stack-checkout-modal',
  imports: [CurrencyPipe],
  templateUrl: './checkout-modal.html',
  styleUrl: './checkout-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutModal {
  private readonly http = inject(HttpClient);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly paymentService = inject(PaymentService);
  private readonly apiUrl = environment.apiUrl;

  orderPlaced = output<string>();

  // --- Existing signals ---
  private readonly _isSubmitting = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _orderId = signal<string | null>(null);
  private readonly _orderNumber = signal<string | null>(null);
  private readonly _stripeReady = signal(false);

  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly error = this._error.asReadonly();
  readonly orderId = this._orderId.asReadonly();
  readonly orderNumber = this._orderNumber.asReadonly();
  readonly stripeReady = this._stripeReady.asReadonly();

  readonly paymentStep = this.paymentService.paymentStep;
  readonly isProcessingPayment = this.paymentService.isProcessing;
  readonly paymentError = this.paymentService.error;

  readonly isOpen = this.cartService.isOpen;
  readonly items = this.cartService.items;
  readonly isEmpty = this.cartService.isEmpty;
  readonly itemCount = this.cartService.itemCount;
  readonly subtotal = this.cartService.subtotal;
  readonly tax = this.cartService.tax;
  readonly tip = this.cartService.tip;
  readonly total = this.cartService.total;

  readonly stripeMount = viewChild<ElementRef>('stripeMount');

  // --- Dining option ---
  private readonly _diningType = signal<DiningOptionType>('dine-in');
  readonly diningType = this._diningType.asReadonly();

  readonly selectedDiningOption = computed(() => getDiningOption(this._diningType()));

  readonly diningOptionTypes: { type: DiningOptionType; label: string }[] = [
    { type: 'dine-in', label: 'Dine In' },
    { type: 'takeout', label: 'Takeout' },
    { type: 'curbside', label: 'Curbside' },
    { type: 'delivery', label: 'Delivery' },
    { type: 'catering', label: 'Catering' },
  ];

  // --- Dine-in ---
  private readonly _tableNumber = signal('');
  readonly tableNumber = this._tableNumber.asReadonly();

  // --- Customer info ---
  private readonly _firstName = signal('');
  private readonly _lastName = signal('');
  private readonly _phone = signal('');
  private readonly _email = signal('');
  readonly firstName = this._firstName.asReadonly();
  readonly lastName = this._lastName.asReadonly();
  readonly phone = this._phone.asReadonly();
  readonly email = this._email.asReadonly();

  // --- Delivery info ---
  private readonly _address = signal('');
  private readonly _address2 = signal('');
  private readonly _city = signal('');
  private readonly _state = signal('');
  private readonly _zip = signal('');
  private readonly _deliveryNotes = signal('');
  readonly address = this._address.asReadonly();
  readonly address2 = this._address2.asReadonly();
  readonly city = this._city.asReadonly();
  readonly state = this._state.asReadonly();
  readonly zip = this._zip.asReadonly();
  readonly deliveryNotes = this._deliveryNotes.asReadonly();

  // --- Curbside info ---
  private readonly _vehicleDescription = signal('');
  private readonly _vehicleMake = signal('');
  private readonly _vehicleModel = signal('');
  private readonly _vehicleColor = signal('');
  readonly vehicleDescription = this._vehicleDescription.asReadonly();
  readonly vehicleMake = this._vehicleMake.asReadonly();
  readonly vehicleModel = this._vehicleModel.asReadonly();
  readonly vehicleColor = this._vehicleColor.asReadonly();

  // --- Catering info ---
  private readonly _eventDate = signal('');
  private readonly _eventTime = signal('');
  private readonly _headcount = signal(0);
  private readonly _eventType = signal('');
  private readonly _setupRequired = signal(false);
  private readonly _depositAmount = signal(0);
  readonly eventDate = this._eventDate.asReadonly();
  readonly eventTime = this._eventTime.asReadonly();
  readonly headcount = this._headcount.asReadonly();
  readonly eventType = this._eventType.asReadonly();
  readonly setupRequired = this._setupRequired.asReadonly();
  readonly depositAmount = this._depositAmount.asReadonly();

  // --- Scheduled orders ---
  private readonly _promisedDate = signal('');
  readonly promisedDate = this._promisedDate.asReadonly();

  // --- Course assignment (dine-in only) ---
  private readonly _courseAssignments = signal<Map<string, string>>(new Map());
  readonly courseAssignments = this._courseAssignments.asReadonly();

  readonly courseOptions: { value: string; label: string }[] = [
    { value: '', label: 'No Course' },
    { value: 'course-1', label: 'Course 1' },
    { value: 'course-2', label: 'Course 2' },
    { value: 'course-3', label: 'Course 3' },
  ];

  readonly showCourseAssignment = computed(() =>
    this._diningType() === 'dine-in' && !this.isEmpty()
  );

  getCourseForItem(itemId: string): string {
    return this._courseAssignments().get(itemId) ?? '';
  }

  onCourseAssign(itemId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this._courseAssignments.update(map => {
      const updated = new Map(map);
      if (value) {
        updated.set(itemId, value);
      } else {
        updated.delete(itemId);
      }
      return updated;
    });
  }

  private buildCourses(): Course[] {
    const assignments = this._courseAssignments();
    const courseMap = new Map<string, Course>();

    for (const [, courseValue] of assignments) {
      if (courseValue && !courseMap.has(courseValue)) {
        const opt = this.courseOptions.find(o => o.value === courseValue);
        const sortOrder = courseValue === 'course-1' ? 1 : courseValue === 'course-2' ? 2 : 3;
        courseMap.set(courseValue, {
          guid: courseValue,
          name: opt?.label ?? courseValue,
          sortOrder,
          fireStatus: sortOrder === 1 ? 'FIRED' : 'PENDING',
        });
      }
    }

    return [...courseMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // --- Validation ---
  private readonly _showValidation = signal(false);
  readonly showValidation = this._showValidation.asReadonly();

  readonly validationResult = computed(() => {
    const type = this._diningType();
    const customer: CustomerInfo | undefined =
      this.selectedDiningOption().requiresCustomer
        ? { firstName: this._firstName().trim(), lastName: this._lastName().trim(), phone: this._phone().trim(), email: this._email().trim() }
        : undefined;

    const deliveryInfo: DeliveryInfo | undefined =
      this.selectedDiningOption().requiresAddress
        ? { address: this._address().trim(), address2: this._address2().trim(), city: this._city().trim(), state: this._state().trim(), zip: this._zip().trim(), deliveryNotes: this._deliveryNotes().trim(), deliveryState: 'PREPARING' }
        : undefined;

    const curbsideInfo: CurbsideInfo | undefined =
      this.selectedDiningOption().requiresVehicle
        ? { vehicleDescription: this._vehicleDescription().trim() }
        : undefined;

    const cateringInfo: CateringInfo | undefined =
      type === 'catering'
        ? { eventDate: this._eventDate() ? new Date(this._eventDate()) : undefined as unknown as Date, eventTime: this._eventTime(), headcount: this._headcount(), setupRequired: this._setupRequired(), depositPaid: false }
        : undefined;

    return validateDiningRequirements(type, {
      tableGuid: type === 'dine-in' ? this._tableNumber().trim() || undefined : undefined,
      customer,
      deliveryInfo,
      curbsideInfo,
      cateringInfo,
    });
  });

  readonly canSubmit = computed(() => {
    if (this.isEmpty()) return false;
    if (this._isSubmitting()) return false;
    return this.validationResult().valid;
  });

  // --- Actions ---

  setDiningType(type: DiningOptionType): void {
    this._diningType.set(type);
    this._error.set(null);
    this._showValidation.set(false);
  }

  close(): void {
    if (this.paymentStep() === 'paying') return;
    this.paymentService.reset();
    this.cartService.close();
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._stripeReady.set(false);
    this._error.set(null);
    this._showValidation.set(false);
  }

  incrementQuantity(itemId: string): void {
    this.cartService.incrementQuantity(itemId);
  }

  decrementQuantity(itemId: string): void {
    this.cartService.decrementQuantity(itemId);
  }

  removeItem(itemId: string): void {
    this.cartService.removeItem(itemId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  formatModifiers(modifiers: Modifier[]): string {
    return modifiers.map(m => m.name).join(', ');
  }

  // --- Form input handlers ---

  onTableNumberInput(event: Event): void {
    this._tableNumber.set((event.target as HTMLInputElement).value);
    this._error.set(null);
  }

  onFieldInput(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._error.set(null);
    switch (field) {
      case 'firstName': this._firstName.set(value); break;
      case 'lastName': this._lastName.set(value); break;
      case 'phone': this._phone.set(value); break;
      case 'email': this._email.set(value); break;
      case 'address': this._address.set(value); break;
      case 'address2': this._address2.set(value); break;
      case 'city': this._city.set(value); break;
      case 'state': this._state.set(value); break;
      case 'zip': this._zip.set(value); break;
      case 'deliveryNotes': this._deliveryNotes.set(value); break;
      case 'vehicleDescription': this._vehicleDescription.set(value); break;
      case 'vehicleMake': this._vehicleMake.set(value); break;
      case 'vehicleModel': this._vehicleModel.set(value); break;
      case 'vehicleColor': this._vehicleColor.set(value); break;
      case 'eventDate': this._eventDate.set(value); break;
      case 'eventTime': this._eventTime.set(value); break;
      case 'headcount': this._headcount.set(Number.parseInt(value, 10) || 0); break;
      case 'eventType': this._eventType.set(value); break;
      case 'depositAmount': this._depositAmount.set(Number.parseFloat(value) || 0); break;
      case 'promisedDate': this._promisedDate.set(value); break;
    }
  }

  onSetupRequiredChange(event: Event): void {
    this._setupRequired.set((event.target as HTMLInputElement).checked);
  }

  hasValidationError(field: string): boolean {
    if (!this._showValidation()) return false;
    return this.validationResult().missingFields.includes(field);
  }

  // --- Submit ---

  async submitOrder(): Promise<void> {
    if (this._isSubmitting()) return;

    this._showValidation.set(true);

    if (!this.validationResult().valid) {
      this._error.set('Please fill in all required fields');
      return;
    }

    this._isSubmitting.set(true);
    this._error.set(null);

    try {
      const restaurantId = this.authService.selectedRestaurantId();
      const type = this._diningType();
      const option = this.selectedDiningOption();

      // Build course data if dine-in with assignments
      const courses = type === 'dine-in' ? this.buildCourses() : [];
      const courseAssignments = this._courseAssignments();

      // Base order data
      const orderData: Record<string, unknown> = {
        orderType: type === 'takeout' ? 'pickup' : type,
        orderSource: 'pos',
        sourceDeviceId: this.socketService.deviceId(),
        items: this.items().map(item => {
          const courseValue = courseAssignments.get(item.id);
          const course = courseValue ? courses.find(c => c.guid === courseValue) : undefined;
          return {
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
            modifiers: item.selectedModifiers.map(m => ({ modifierId: m.id })),
            ...(course ? { course: { guid: course.guid, name: course.name, sortOrder: course.sortOrder } } : {}),
          };
        }),
      };

      // Include courses array if any were assigned
      if (courses.length > 0) {
        orderData['courses'] = courses;
      }

      // Dine-in: table number
      if (type === 'dine-in') {
        orderData['tableNumber'] = this._tableNumber().trim();
      }

      // Customer info
      if (option.requiresCustomer) {
        orderData['customer'] = {
          firstName: this._firstName().trim(),
          lastName: this._lastName().trim(),
          phone: this._phone().trim(),
          email: this._email().trim(),
        };
      }

      // Delivery info
      if (option.requiresAddress) {
        const deliveryInfo: DeliveryInfo = {
          address: this._address().trim(),
          city: this._city().trim(),
          state: this._state().trim(),
          zip: this._zip().trim(),
          deliveryState: 'PREPARING',
        };
        if (this._address2().trim()) deliveryInfo.address2 = this._address2().trim();
        if (this._deliveryNotes().trim()) deliveryInfo.deliveryNotes = this._deliveryNotes().trim();
        orderData['deliveryInfo'] = deliveryInfo;
      }

      // Curbside info
      if (option.requiresVehicle) {
        const curbsideInfo: CurbsideInfo = {
          vehicleDescription: this._vehicleDescription().trim(),
        };
        if (this._vehicleMake().trim()) curbsideInfo.vehicleMake = this._vehicleMake().trim();
        if (this._vehicleModel().trim()) curbsideInfo.vehicleModel = this._vehicleModel().trim();
        if (this._vehicleColor().trim()) curbsideInfo.vehicleColor = this._vehicleColor().trim();
        orderData['curbsideInfo'] = curbsideInfo;
      }

      // Catering info
      if (type === 'catering') {
        const cateringInfo: CateringInfo = {
          eventDate: new Date(this._eventDate()),
          eventTime: this._eventTime(),
          headcount: this._headcount(),
          setupRequired: this._setupRequired(),
          depositPaid: false,
        };
        if (this._eventType().trim()) cateringInfo.eventType = this._eventType().trim();
        if (this._depositAmount() > 0) cateringInfo.depositAmount = this._depositAmount();
        orderData['cateringInfo'] = cateringInfo;
        orderData['approvalStatus'] = 'NEEDS_APPROVAL';
      }

      // Promised date (scheduled orders)
      if (this._promisedDate()) {
        orderData['promisedDate'] = this._promisedDate();
      }

      // Dining option object
      orderData['diningOption'] = option;

      const response = await firstValueFrom(
        this.http.post<any>(`${this.apiUrl}/restaurant/${restaurantId}/orders`, orderData)
      );

      if (response) {
        const oId = response.id;
        const oNum = response.orderNumber ?? response.id;
        this._orderId.set(oId);
        this._orderNumber.set(oNum);

        this.orderPlaced.emit(oNum);
        this.resetForm();
        this.cartService.clear();
        this.close();
      } else {
        this._error.set('Failed to place order. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as any)?.error?.error ?? 'An error occurred. Please try again.';
      this._error.set(message);
    } finally {
      this._isSubmitting.set(false);
    }
  }

  async confirmPayment(): Promise<void> {
    const success = await this.paymentService.confirmPayment();
    const oId = this._orderId();

    if (success && oId) {
      this.orderPlaced.emit(this._orderNumber() ?? oId);
      this.resetForm();
      this.cartService.clear();
    }
  }

  async cancelPayment(): Promise<void> {
    const oId = this._orderId();
    if (!oId) return;

    await this.paymentService.cancelPayment(oId);
    this.paymentService.reset();
    this._orderId.set(null);
    this._orderNumber.set(null);
    this._stripeReady.set(false);
  }

  retryPayment(): void {
    this.paymentService.clearError();
    this.paymentService.setStep('paying');

    setTimeout(async () => {
      const mountEl = this.stripeMount()?.nativeElement;
      if (mountEl) {
        const mounted = await this.paymentService.mountPaymentElement(mountEl);
        this._stripeReady.set(mounted);
      }
    }, 50);
  }

  private resetForm(): void {
    this._tableNumber.set('');
    this._diningType.set('dine-in');
    this._firstName.set('');
    this._lastName.set('');
    this._phone.set('');
    this._email.set('');
    this._address.set('');
    this._address2.set('');
    this._city.set('');
    this._state.set('');
    this._zip.set('');
    this._deliveryNotes.set('');
    this._vehicleDescription.set('');
    this._vehicleMake.set('');
    this._vehicleModel.set('');
    this._vehicleColor.set('');
    this._eventDate.set('');
    this._eventTime.set('');
    this._headcount.set(0);
    this._eventType.set('');
    this._setupRequired.set(false);
    this._depositAmount.set(0);
    this._promisedDate.set('');
    this._courseAssignments.set(new Map());
    this._showValidation.set(false);
  }
}
