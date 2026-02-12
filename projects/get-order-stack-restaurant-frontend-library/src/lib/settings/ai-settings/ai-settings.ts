import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RestaurantSettingsService } from '../../services/restaurant-settings';
import { AuthService } from '../../services/auth';
import { CoursePacingMode } from '../../models';

@Component({
  selector: 'get-order-stack-ai-settings',
  imports: [FormsModule],
  templateUrl: './ai-settings.html',
  styleUrl: './ai-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiSettings implements OnInit {
  private readonly settingsService = inject(RestaurantSettingsService);
  private readonly authService = inject(AuthService);

  readonly isLoading = this.settingsService.isLoading;
  readonly isSaving = this.settingsService.isSaving;

  // Local form signals (copy from service on load)
  private readonly _approvalEnabled = signal(true);
  private readonly _timeThresholdHours = signal(12);
  private readonly _valueThresholdDollars = signal(200);
  private readonly _quantityThreshold = signal(20);
  private readonly _coursePacingMode = signal<CoursePacingMode>('disabled');
  private readonly _expoStationEnabled = signal(false);
  private readonly _approvalTimeoutHours = signal(24);
  private readonly _hasUnsavedChanges = signal(false);
  private readonly _showSaveSuccess = signal(false);

  readonly approvalEnabled = this._approvalEnabled.asReadonly();
  readonly timeThresholdHours = this._timeThresholdHours.asReadonly();
  readonly valueThresholdDollars = this._valueThresholdDollars.asReadonly();
  readonly quantityThreshold = this._quantityThreshold.asReadonly();
  readonly coursePacingMode = this._coursePacingMode.asReadonly();
  readonly expoStationEnabled = this._expoStationEnabled.asReadonly();
  readonly approvalTimeoutHours = this._approvalTimeoutHours.asReadonly();
  readonly hasUnsavedChanges = this._hasUnsavedChanges.asReadonly();

  readonly pacingModeOptions: { value: CoursePacingMode; label: string; description: string }[] = [
    { value: 'disabled', label: 'Disabled', description: 'All items fire immediately when sent to kitchen.' },
    { value: 'server_fires', label: 'Server Fires', description: 'Server manually fires each course from their device.' },
    { value: 'auto_fire_timed', label: 'Auto-Fire Timed', description: 'Next course fires automatically after a delay when the previous course completes.' },
  ];

  readonly currentModeDescription = computed(() =>
    this.pacingModeOptions.find(o => o.value === this._coursePacingMode())?.description ?? ''
  );

  readonly timeoutDescription = computed(() => {
    const hours = this._approvalTimeoutHours();
    return `Catering orders awaiting approval will be auto-rejected after ${hours} hour${hours !== 1 ? 's' : ''}.`;
  });
  readonly showSaveSuccess = this._showSaveSuccess.asReadonly();

  readonly isManagerOrAbove = computed(() => {
    const role = this.authService.user()?.role;
    return role === 'owner' || role === 'manager' || role === 'super_admin';
  });

  readonly thresholdDescription = computed(() => {
    const hours = this._timeThresholdHours();
    const dollars = this._valueThresholdDollars();
    const qty = this._quantityThreshold();
    return `Orders scheduled more than ${hours} hours out, over $${dollars}, or with more than ${qty} items will require AI review.`;
  });

  ngOnInit(): void {
    this.loadFromService();
  }

  private loadFromService(): void {
    const s = this.settingsService.aiSettings();
    this._approvalEnabled.set(s.aiOrderApprovalEnabled);
    this._timeThresholdHours.set(s.timeThresholdHours);
    this._valueThresholdDollars.set(s.valueThresholdDollars);
    this._quantityThreshold.set(s.quantityThreshold);
    this._coursePacingMode.set(s.coursePacingMode);
    this._expoStationEnabled.set(s.expoStationEnabled);
    this._approvalTimeoutHours.set(s.approvalTimeoutHours);
    this._hasUnsavedChanges.set(false);
  }

  onApprovalToggle(event: Event): void {
    this._approvalEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  onTimeThreshold(event: Event): void {
    this._timeThresholdHours.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 12);
    this._hasUnsavedChanges.set(true);
  }

  onValueThreshold(event: Event): void {
    this._valueThresholdDollars.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 200);
    this._hasUnsavedChanges.set(true);
  }

  onQuantityThreshold(event: Event): void {
    this._quantityThreshold.set(Number.parseInt((event.target as HTMLInputElement).value, 10) || 20);
    this._hasUnsavedChanges.set(true);
  }

  onCoursePacingModeChange(value: CoursePacingMode): void {
    this._coursePacingMode.set(value);
    this._hasUnsavedChanges.set(true);
  }

  onApprovalTimeoutChange(event: Event): void {
    const val = Number.parseInt((event.target as HTMLInputElement).value, 10) || 24;
    this._approvalTimeoutHours.set(val);
    this._hasUnsavedChanges.set(true);
  }

  onExpoStationToggle(event: Event): void {
    this._expoStationEnabled.set((event.target as HTMLInputElement).checked);
    this._hasUnsavedChanges.set(true);
  }

  async save(): Promise<void> {
    await this.settingsService.saveAISettings({
      aiOrderApprovalEnabled: this._approvalEnabled(),
      timeThresholdHours: this._timeThresholdHours(),
      valueThresholdDollars: this._valueThresholdDollars(),
      quantityThreshold: this._quantityThreshold(),
      coursePacingMode: this._coursePacingMode(),
      expoStationEnabled: this._expoStationEnabled(),
      approvalTimeoutHours: this._approvalTimeoutHours(),
    });
    this._hasUnsavedChanges.set(false);
    this._showSaveSuccess.set(true);
    setTimeout(() => this._showSaveSuccess.set(false), 3000);
  }

  discard(): void {
    this.loadFromService();
  }
}
