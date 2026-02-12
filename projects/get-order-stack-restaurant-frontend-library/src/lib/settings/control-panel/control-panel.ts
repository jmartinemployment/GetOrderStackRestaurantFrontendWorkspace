import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '../../services/auth';
import { PrinterSettings } from '../printer-settings';
import { ControlPanelTab } from '../../models';

@Component({
  selector: 'get-order-stack-control-panel',
  imports: [PrinterSettings],
  templateUrl: './control-panel.html',
  styleUrl: './control-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlPanel {
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = this.authService.isAuthenticated;

  private readonly _activeTab = signal<ControlPanelTab>('printers');
  readonly activeTab = this._activeTab.asReadonly();

  readonly tabs: { key: ControlPanelTab; label: string }[] = [
    { key: 'printers', label: 'Printers' },
  ];

  setTab(tab: ControlPanelTab): void {
    this._activeTab.set(tab);
  }
}
