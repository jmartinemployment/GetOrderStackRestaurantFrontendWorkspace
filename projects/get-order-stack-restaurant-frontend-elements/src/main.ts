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
  ];

  for (const [component, tag] of elements) {
    const el = createCustomElement(component, { injector: app.injector });
    customElements.define(tag, el);
  }

  console.log(`GetOrderStack elements registered: ${elements.map(([, tag]) => tag).join(', ')}`);
})();
