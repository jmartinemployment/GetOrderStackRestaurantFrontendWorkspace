import { Component, input, output, computed, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { Order, GuestOrderStatus, Selection, Course, CoursePacingMode, PrintStatus } from '../../models';
import { StatusBadge } from '../status-badge/status-badge';

export interface CourseGroup {
  course: Course | null;
  label: string;
  selections: SelectionWithDelay[];
  fireStatus: 'PENDING' | 'FIRED' | 'READY';
  maxPrepSeconds: number;
}

export interface SelectionWithDelay {
  selection: Selection;
  prepSeconds: number;
  fireDelaySeconds: number;
}

@Component({
  selector: 'get-order-stack-order-card',
  imports: [StatusBadge],
  templateUrl: './order-card.html',
  styleUrl: './order-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCard implements OnInit, OnDestroy {
  order = input.required<Order>();
  estimatedPrepMinutes = input<number>(0);
  isRushed = input(false);
  coursePacingMode = input<CoursePacingMode>('disabled');
  prepTimeMap = input<Map<string, number>>(new Map());
  autoFireDelaySeconds = input(300);
  prepTimeFiringEnabled = input(false);
  defaultPrepMinutes = input(10);
  printStatus = input<PrintStatus>('none');
  isExpoQueue = input(false);

  statusChange = output<{ orderId: string; status: GuestOrderStatus }>();
  rushToggle = output<string>();
  expoCheck = output<string>();
  fireCourse = output<{ orderId: string; courseGuid: string }>();
  fireItemNow = output<{ orderId: string; selectionGuid: string }>();
  retryPrint = output<string>();
  recallOrder = output<string>();

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private autoFireTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _elapsedMinutes = signal(0);
  private readonly _now = signal(Date.now());
  private readonly _autoFireCountdowns = signal<Map<string, number>>(new Map());
  private readonly _staggerStartTime = signal<number | null>(null);
  private readonly _manuallyFiredItems = signal(new Set<string>());
  private _lastOrderGuid = '';
  readonly elapsedMinutes = this._elapsedMinutes.asReadonly();
  readonly autoFireCountdowns = this._autoFireCountdowns.asReadonly();

  readonly prepProgress = computed(() => {
    const est = this.estimatedPrepMinutes();
    if (est <= 0) return 0;
    return Math.round((this._elapsedMinutes() / est) * 100);
  });

  readonly prepColorClass = computed(() => {
    const progress = this.prepProgress();
    if (progress >= 100) return 'prep-overdue';
    if (progress >= 70) return 'prep-warning';
    return 'prep-ok';
  });

  readonly remainingMinutes = computed(() => {
    const est = this.estimatedPrepMinutes();
    if (est <= 0) return null;
    return Math.max(0, est - this._elapsedMinutes());
  });

  readonly isUrgent = computed(() => {
    const est = this.estimatedPrepMinutes();
    if (est > 0) return this.prepProgress() >= 100;
    return this._elapsedMinutes() > 10;
  });

  readonly orderTypeClass = computed(() => {
    switch (this.order().diningOption.type) {
      case 'takeout': return 'order-type-pickup';
      case 'delivery': return 'order-type-delivery';
      case 'dine-in': return 'order-type-dinein';
      case 'curbside': return 'order-type-curbside';
      case 'catering': return 'order-type-catering';
      default: return '';
    }
  });

  readonly orderTypeLabel = computed(() => {
    return this.order().diningOption.name;
  });

  readonly allSelections = computed(() =>
    this.order().checks.flatMap(c => c.selections)
  );

  readonly hasCourses = computed(() => {
    if (this.coursePacingMode() === 'disabled') return false;
    return this.allSelections().some(s => s.course !== undefined);
  });

  readonly showGroupedView = computed(() => {
    if (this.hasCourses()) return true;
    if (this.prepTimeFiringEnabled()) return true;
    return false;
  });

  readonly courseGroups = computed((): CourseGroup[] => {
    const selections = this.allSelections();
    const ptMap = this.prepTimeMap();

    if (!this.hasCourses()) {
      // No course grouping — single "Immediate" group
      const items = this.buildSelectionsWithDelay(selections, ptMap);
      return [{
        course: null,
        label: 'Immediate',
        selections: items,
        fireStatus: 'FIRED',
        maxPrepSeconds: items.reduce((max, s) => Math.max(max, s.prepSeconds), 0),
      }];
    }

    // Group by course
    const courseMap = new Map<string, { course: Course; sels: Selection[] }>();
    const noCourse: Selection[] = [];

    for (const sel of selections) {
      if (sel.course) {
        const key = sel.course.guid;
        const existing = courseMap.get(key);
        if (existing) {
          existing.sels.push(sel);
        } else {
          courseMap.set(key, { course: sel.course, sels: [sel] });
        }
      } else {
        noCourse.push(sel);
      }
    }

    const groups: CourseGroup[] = [];

    // "Immediate" group for items without a course
    if (noCourse.length > 0) {
      const items = this.buildSelectionsWithDelay(noCourse, ptMap);
      groups.push({
        course: null,
        label: 'Immediate',
        selections: items,
        fireStatus: 'FIRED',
        maxPrepSeconds: items.reduce((max, s) => Math.max(max, s.prepSeconds), 0),
      });
    }

    // Course groups sorted by sortOrder
    const sorted = [...courseMap.values()].sort((a, b) => a.course.sortOrder - b.course.sortOrder);
    for (const { course, sels } of sorted) {
      const items = this.buildSelectionsWithDelay(sels, ptMap);
      groups.push({
        course,
        label: course.name,
        selections: items,
        fireStatus: course.fireStatus,
        maxPrepSeconds: items.reduce((max, s) => Math.max(max, s.prepSeconds), 0),
      });
    }

    return groups;
  });

  readonly nextAction = computed<{ label: string; status: GuestOrderStatus } | null>(() => {
    switch (this.order().guestOrderStatus) {
      case 'RECEIVED': return { label: 'START', status: 'IN_PREPARATION' };
      case 'IN_PREPARATION': return { label: 'READY', status: 'READY_FOR_PICKUP' };
      case 'READY_FOR_PICKUP': return { label: 'COMPLETE', status: 'CLOSED' };
      default: return null;
    }
  });

  readonly bumpLabel = computed(() => {
    if (this.isExpoQueue()) return 'CHECKED';
    return this.nextAction()?.label ?? '';
  });

  readonly canRecall = computed(() => {
    const status = this.order().guestOrderStatus;
    return status === 'IN_PREPARATION' || status === 'READY_FOR_PICKUP';
  });

  ngOnInit(): void {
    this.updateElapsedTime();
    this._lastOrderGuid = this.order().guid;
    this.timerInterval = setInterval(() => {
      this.updateElapsedTime();
      this._now.set(Date.now());
      this.updateAutoFireCountdowns();
      this.detectStaggerStart();
      this.detectOrderChange();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    for (const timer of this.autoFireTimers.values()) {
      clearTimeout(timer);
    }
  }

  private updateElapsedTime(): void {
    const created = this.order().timestamps.createdDate.getTime();
    const now = Date.now();
    const minutes = Math.floor((now - created) / 60000);
    this._elapsedMinutes.set(minutes);
  }

  private buildSelectionsWithDelay(selections: Selection[], ptMap: Map<string, number>): SelectionWithDelay[] {
    let maxPrep = 0;
    const items: { selection: Selection; prepSeconds: number }[] = [];

    for (const sel of selections) {
      const prepMin = ptMap.get(sel.menuItemGuid) ?? this.defaultPrepMinutes();
      const prepSec = prepMin * 60;
      if (prepSec > maxPrep) maxPrep = prepSec;
      items.push({ selection: sel, prepSeconds: prepSec });
    }

    return items.map(item => ({
      ...item,
      fireDelaySeconds: maxPrep > 0 ? maxPrep - item.prepSeconds : 0,
    }));
  }

  private updateAutoFireCountdowns(): void {
    if (this.coursePacingMode() !== 'auto_fire_timed') return;

    const groups = this.courseGroups();
    const countdowns = new Map<string, number>();

    for (let i = 1; i < groups.length; i++) {
      const group = groups[i];
      const prevGroup = groups[i - 1];

      if (group.fireStatus === 'PENDING' && prevGroup.fireStatus === 'READY' && group.course) {
        // Previous course is done — countdown to auto-fire
        const allReady = prevGroup.selections.every(s => s.selection.fulfillmentStatus === 'SENT' || s.selection.fulfillmentStatus === 'ON_THE_FLY');
        if (allReady) {
          const existing = this._autoFireCountdowns().get(group.course.guid);
          if (existing !== undefined && existing > 0) {
            countdowns.set(group.course.guid, existing - 1);
            if (existing - 1 <= 0) {
              this.onFireCourse(group.course.guid);
            }
          } else if (existing === undefined) {
            countdowns.set(group.course.guid, this.autoFireDelaySeconds());
          }
        }
      }
    }

    if (countdowns.size > 0) {
      this._autoFireCountdowns.set(countdowns);
    }
  }

  getFireDelayDisplay(seconds: number): string {
    if (seconds <= 0) return 'Fire now';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min > 0) return `+${min}:${sec.toString().padStart(2, '0')}`;
    return `+${sec}s`;
  }

  getCountdownDisplay(courseGuid: string): string {
    const secs = this._autoFireCountdowns().get(courseGuid) ?? 0;
    if (secs <= 0) return '';
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  isItemHeld(sel: Selection): boolean {
    return sel.fulfillmentStatus === 'HOLD' || (sel.course?.fireStatus === 'PENDING' && this.coursePacingMode() !== 'disabled');
  }

  onBump(): void {
    if (this.isExpoQueue()) {
      this.expoCheck.emit(this.order().guid);
      return;
    }
    const action = this.nextAction();
    if (action) {
      this.statusChange.emit({ orderId: this.order().guid, status: action.status });
    }
  }

  onRush(): void {
    this.rushToggle.emit(this.order().guid);
  }

  onRetryPrint(): void {
    this.retryPrint.emit(this.order().guid);
  }

  onRecall(): void {
    this.recallOrder.emit(this.order().guid);
  }

  onFireCourse(courseGuid: string): void {
    this.fireCourse.emit({ orderId: this.order().guid, courseGuid });
  }

  getItemFireState(item: SelectionWithDelay, courseStartTime?: number): 'active' | 'countdown' | 'waiting' {
    // If prep firing disabled, everything is active
    if (!this.prepTimeFiringEnabled()) return 'active';
    // If item has 0 delay, always active (longest prep item)
    if (item.fireDelaySeconds <= 0) return 'active';
    // If manually fired early
    if (this._manuallyFiredItems().has(item.selection.guid)) return 'active';

    // Determine start time: use course firedDate if available, else order-level stagger start
    const start = courseStartTime ?? this._staggerStartTime();
    if (start === null) return 'waiting';

    // Compute remaining countdown
    const elapsed = (this._now() - start) / 1000;
    if (elapsed >= item.fireDelaySeconds) return 'active';
    return 'countdown';
  }

  getItemCountdownSeconds(item: SelectionWithDelay, courseStartTime?: number): number {
    const start = courseStartTime ?? this._staggerStartTime();
    if (start === null) return item.fireDelaySeconds;
    const elapsed = (this._now() - start) / 1000;
    return Math.max(0, Math.round(item.fireDelaySeconds - elapsed));
  }

  getCourseStartTime(course: Course | undefined | null): number | null {
    if (!course) return this._staggerStartTime();  // No course = use order-level
    if (course.fireStatus !== 'FIRED' && course.fireStatus !== 'READY') return null;
    return course.firedDate?.getTime() ?? null;
  }

  formatCountdown(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  onFireItemNow(selGuid: string): void {
    this._manuallyFiredItems.update(set => {
      const updated = new Set(set);
      updated.add(selGuid);
      return updated;
    });
    this.fireItemNow.emit({ orderId: this.order().guid, selectionGuid: selGuid });
  }

  private detectStaggerStart(): void {
    // Detect when order enters IN_PREPARATION and start stagger timer (non-coursed orders)
    if (this._staggerStartTime() === null && this.order().guestOrderStatus === 'IN_PREPARATION') {
      // Use prepStartDate if available, else fall back to Date.now()
      const prepDate = this.order().timestamps.prepStartDate;
      this._staggerStartTime.set(prepDate ? prepDate.getTime() : Date.now());
    }
  }

  private detectOrderChange(): void {
    // Track order changes to reset stagger state
    if (this.order().guid !== this._lastOrderGuid) {
      this._lastOrderGuid = this.order().guid;
      this._staggerStartTime.set(null);
      this._manuallyFiredItems.set(new Set());
    }
  }
}
