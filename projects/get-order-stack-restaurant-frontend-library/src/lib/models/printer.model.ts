export type PrinterModel = 'Star mC-Print3' | 'Star mC-Print2' | 'Star TSP654II' | 'Star TSP743II';

export type ControlPanelTab = 'printers' | 'ai-settings' | 'online-pricing' | 'catering-calendar' | 'payments';

export interface Printer {
  id: string;
  restaurantId: string;
  name: string;
  model: string;
  macAddress: string;
  ipAddress: string | null;
  cloudPrntId: string | null;
  registrationToken: string;
  printWidth: number;
  isDefault: boolean;
  isActive: boolean;
  lastPollAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrinterFormData {
  name: string;
  model: PrinterModel;
  macAddress: string;
  ipAddress?: string;
  printWidth?: number;
  isDefault?: boolean;
}

export interface CloudPrntConfig {
  serverUrl: string;
  instructions: string;
}

export interface PrinterCreateResponse {
  printer: Printer;
  cloudPrntConfig: CloudPrntConfig;
}

export interface TestPrintResponse {
  success: boolean;
  jobId: string;
}
