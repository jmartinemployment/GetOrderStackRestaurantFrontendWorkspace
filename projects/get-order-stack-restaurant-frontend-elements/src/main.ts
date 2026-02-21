import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  Login,
  RestaurantSelect,
  SosTerminal,
  KdsDisplay,
  CommandCenter,
  MenuEngineeringDashboard,
  SalesDashboard,
  InventoryDashboard,
  CategoryManagement,
  ItemManagement,
  FloorPlan,
  CustomerDashboard,
  ReservationManager,
  ChatAssistant,
  OnlineOrderPortal,
  MonitoringAgent,
  VoiceOrder,
  DynamicPricing,
  WasteTracker,
  SentimentDashboard,
  PendingOrders,
  OrderHistory,
  ControlPanel,
  ServerPosTerminal,
  OrderPad,
  CloseOfDay,
  CashDrawer,
  KioskTerminal,
  StaffScheduling,
  CampaignBuilder,
  InvoiceManager,
  ComboManagement,
  ModifierManagement,
  StaffPortal,
  PosLogin,
  FoodCostDashboard,
  MultiLocationDashboard,
  SetupWizard,
} from 'get-order-stack-restaurant-frontend-library';

(async () => {
  const app = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
    ],
  });

  const elements: [any, string][] = [
    [Login, 'get-order-stack-login'],
    [RestaurantSelect, 'get-order-stack-restaurant-select'],
    [SosTerminal, 'get-order-stack-sos-terminal'],
    [KdsDisplay, 'get-order-stack-kds-display'],
    [CommandCenter, 'get-order-stack-command-center'],
    [MenuEngineeringDashboard, 'get-order-stack-menu-engineering'],
    [SalesDashboard, 'get-order-stack-sales-dashboard'],
    [InventoryDashboard, 'get-order-stack-inventory-dashboard'],
    [CategoryManagement, 'get-order-stack-category-management'],
    [ItemManagement, 'get-order-stack-item-management'],
    [FloorPlan, 'get-order-stack-floor-plan'],
    [CustomerDashboard, 'get-order-stack-crm'],
    [ReservationManager, 'get-order-stack-reservations'],
    [ChatAssistant, 'get-order-stack-ai-chat'],
    [OnlineOrderPortal, 'get-order-stack-online-ordering'],
    [MonitoringAgent, 'get-order-stack-monitoring-agent'],
    [VoiceOrder, 'get-order-stack-voice-order'],
    [DynamicPricing, 'get-order-stack-dynamic-pricing'],
    [WasteTracker, 'get-order-stack-waste-tracker'],
    [SentimentDashboard, 'get-order-stack-sentiment'],
    [PendingOrders, 'get-order-stack-pending-orders'],
    [OrderHistory, 'get-order-stack-order-history'],
    [ControlPanel, 'get-order-stack-control-panel'],
    [ServerPosTerminal, 'get-order-stack-pos-terminal'],
    [OrderPad, 'get-order-stack-order-pad'],
    [CloseOfDay, 'get-order-stack-close-of-day'],
    [CashDrawer, 'get-order-stack-cash-drawer'],
    [KioskTerminal, 'get-order-stack-kiosk'],
    [StaffScheduling, 'get-order-stack-scheduling'],
    [CampaignBuilder, 'get-order-stack-campaign-builder'],
    [InvoiceManager, 'get-order-stack-invoice-manager'],
    [ComboManagement, 'get-order-stack-combo-management'],
    [ModifierManagement, 'get-order-stack-modifier-management'],
    [StaffPortal, 'get-order-stack-staff-portal'],
    [FoodCostDashboard, 'get-order-stack-food-cost'],
    [MultiLocationDashboard, 'get-order-stack-multi-location'],
    [PosLogin, 'get-order-stack-pos-login'],
    [SetupWizard, 'get-order-stack-setup-wizard'],
  ];

  for (const [component, tag] of elements) {
    const el = createCustomElement(component, { injector: app.injector });
    customElements.define(tag, el);
  }

  console.log(`GetOrderStack elements registered: ${elements.map(([, tag]) => tag).join(', ')}`);
})();
