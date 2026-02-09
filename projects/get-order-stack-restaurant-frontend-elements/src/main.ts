import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  Login,
  RestaurantSelect,
  SosTerminal,
  KdsDisplay,
  MenuEngineeringDashboard,
  SalesDashboard,
  CategoryManagement,
  ItemManagement,
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
    [MenuEngineeringDashboard, 'get-order-stack-menu-engineering'],
    [SalesDashboard, 'get-order-stack-sales-dashboard'],
    [CategoryManagement, 'get-order-stack-category-management'],
    [ItemManagement, 'get-order-stack-item-management'],
  ];

  for (const [component, tag] of elements) {
    const el = createCustomElement(component, { injector: app.injector });
    customElements.define(tag, el);
  }

  console.log(`GetOrderStack elements registered: ${elements.map(([, tag]) => tag).join(', ')}`);
})();
