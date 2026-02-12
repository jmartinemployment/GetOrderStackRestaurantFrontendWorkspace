import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../services/auth';
import { RestaurantSettingsService } from '../../services/restaurant-settings';
import { PrinterSettings } from '../printer-settings';
import { AiSettings } from '../ai-settings';
import { OnlinePricing } from '../online-pricing';
import { CateringCalendar } from '../catering-calendar';
import { ControlPanelTab } from '../../models';

@Component({
  selector: 'get-order-stack-control-panel',
  imports: [PrinterSettings, AiSettings, OnlinePricing, CateringCalendar],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<ControlPanelTab>('printers');
  readonly activeTab = this._activeTab.asReadonly();

  readonly tabs: { key: ControlPanelTab; label: string }[] = [
    { key: 'printers', label: 'Printers' },
    { key: 'ai-settings', label: 'AI Settings' },
    { key: 'online-pricing', label: 'Online Pricing' },
    { key: 'catering-calendar', label: 'Catering Calendar' },
  ];

  ngOnInit(): void {
    this.settingsService.loadSettings();
  }

  setTab(tab: ControlPanelTab): void {
    this._activeTab.set(tab);
  }
}
