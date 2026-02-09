# Get-Order-Stack — Angular Elements Web Component Architecture

## Project Overview

This workspace contains Angular Elements (Web Components) for the Get-Order-Stack restaurant ordering system. The built bundle is loaded on the WordPress site geekatyourspot.com as a demo project alongside other independent Web Component bundles.

**Deployment:** Built bundle is copied into the Geek-At-Your-Spot dist directory, then FTP uploaded to WordPress. This is a git repository.

**Stack:** Angular 21, Bootstrap SCSS 5.3.8, Angular Elements, Socket.io-client. All code uses current, non-deprecated Angular APIs.

## Architecture: Angular Elements Bundle

This project follows the **Angular Elements multi-project workspace pattern** — an Angular library containing all components/services/models, paired with an Angular Elements app that registers selected components as Web Components.

### The Pattern

1. **An Angular library** (`get-order-stack-restaurant-frontend-library`) — components, services, models exported via `public-api.ts`
2. **An Angular Elements app** (`get-order-stack-restaurant-frontend-elements`) — imports from the library, registers Web Components via `createCustomElement()` + `customElements.define()`
3. **`outputHashing: "none"`** — predictable filenames (`main.js`, `styles.css`)
4. **`provideZonelessChangeDetection()`** — no Zone.js
5. **No deprecated methods** — no `@import` (use `@use`), no `toPromise()` (use `firstValueFrom()`), no `*ngFor`/`*ngIf` (use `@for`/`@if`), current Angular 21 APIs only
6. **Loaded via `wp_enqueue_script_module()`** — produces `<script type="module">` for scope isolation

### Why `type="module"` Is Required

Standard `<script>` tags share the global scope. When two Angular Elements bundles load without `type="module"`, the second bundle's Angular runtime collides with the first's. The `type="module"` attribute gives each script its own scope, preventing this.

**WordPress:** Use `wp_enqueue_script_module()` (WordPress 6.5+), NOT `wp_enqueue_script()`, for all Angular Elements bundles.

## Project Structure

```
Get-Order-Stack-Restaurant-Frontend-Workspace/
├── projects/
│   ├── get-order-stack-restaurant-frontend-library/   # Angular library
│   │   └── src/
│   │       ├── public-api.ts                          # Library entry point
│   │       └── lib/
│   │           ├── auth/                              # Authentication
│   │           │   ├── login/                         # Login component
│   │           │   └── restaurant-select/             # Restaurant selector
│   │           ├── sos/                               # Self-Order System
│   │           │   ├── sos-terminal/                  # Main SOS interface
│   │           │   ├── menu-display/                  # Menu display
│   │           │   ├── menu-item-card/                # Menu item card
│   │           │   ├── cart-drawer/                   # Shopping cart
│   │           │   ├── checkout-modal/                # Checkout interface
│   │           │   ├── order-notifications/           # Order alerts
│   │           │   └── upsell-bar/                    # Upselling component
│   │           ├── kds/                               # Kitchen Display System
│   │           │   ├── kds-display/                   # Main KDS display
│   │           │   ├── order-card/                    # Order card
│   │           │   └── status-badge/                  # Status badge
│   │           ├── orders/                            # Order management
│   │           │   ├── pending-orders/                # Pending order view
│   │           │   ├── order-history/                 # Historical orders
│   │           │   └── receipt-printer/               # Receipt printing
│   │           ├── inventory/                          # Inventory management
│   │           │   └── inventory-dashboard/            # Main inventory UI
│   │           ├── menu-mgmt/                         # Menu management
│   │           │   ├── category-management/           # Category CRUD
│   │           │   └── item-management/               # Item CRUD
│   │           ├── shared/                            # Shared components
│   │           │   ├── loading-spinner/               # Loading indicator
│   │           │   ├── error-display/                 # Error display
│   │           │   └── connection-status/             # Connection status
│   │           ├── models/                            # TypeScript interfaces
│   │           │   ├── auth.model.ts
│   │           │   ├── menu.model.ts
│   │           │   ├── order.model.ts
│   │           │   ├── cart.model.ts
│   │           │   └── restaurant.model.ts
│   │           ├── services/                          # Core services
│   │           │   ├── auth.ts                        # Authentication
│   │           │   ├── menu.ts                        # Menu CRUD
│   │           │   ├── cart.ts                        # Cart state (signals)
│   │           │   ├── order.ts                       # Order management
│   │           │   └── socket.ts                      # WebSocket + polling
│   │           └── environments/
│   │               ├── environment.ts                 # Dev config
│   │               └── environment.prod.ts            # Prod config
│   │
│   └── get-order-stack-restaurant-frontend-elements/  # Angular Elements (registers Web Components)
│       └── src/main.ts
│
└── dist/                                              # Built bundles
```

## Naming Convention

**All custom element tags follow `get-order-stack-*` naming.** No exceptions.

## Registered Web Components (10 in main.ts)

| Custom Element Tag | Source Component | Domain |
|---|---|---|
| `get-order-stack-login` | `Login` | Auth |
| `get-order-stack-restaurant-select` | `RestaurantSelect` | Auth |
| `get-order-stack-sos-terminal` | `SosTerminal` | SOS |
| `get-order-stack-kds-display` | `KdsDisplay` | KDS |
| `get-order-stack-menu-engineering` | `MenuEngineeringDashboard` | Analytics |
| `get-order-stack-sales-dashboard` | `SalesDashboard` | Analytics |
| `get-order-stack-inventory-dashboard` | `InventoryDashboard` | Inventory |
| `get-order-stack-category-management` | `CategoryManagement` | Menu Mgmt |
| `get-order-stack-item-management` | `ItemManagement` | Menu Mgmt |
| `get-order-stack-floor-plan` | `FloorPlan` | Table Mgmt |

Internal (not registered as custom elements):
- All `shared/` components — used internally by other components
- `MenuDisplay`, `CartDrawer`, `CheckoutModal`, `UpsellBar`, `OrderNotifications`, `MenuItemCard` — used internally by `SosTerminal`
- `OrderCard`, `StatusBadge` — used internally by `KdsDisplay`
- `PendingOrders`, `OrderHistory`, `ReceiptPrinter` — used internally by other components

## Core Services

| Service | Purpose | Key Pattern |
|---|---|---|
| `AnalyticsService` | AI upsell, menu engineering, sales reports | Signals, debounced fetch, `firstValueFrom()` |
| `AuthService` | Authentication, session, restaurant selection | Signals, localStorage persistence |
| `InventoryService` | Inventory CRUD, stock actions, AI predictions, reports | Signals, 10 HTTP methods, `firstValueFrom()` |
| `PaymentService` | Stripe Elements, payment intents, refunds | Stripe.js, signals, `firstValueFrom()` |
| `MenuService` | Menu CRUD, AI cost estimation, language support (en/es) | `firstValueFrom()`, HttpClient |
| `CartService` | Shopping cart state, tax/tip calculation | Signals, 8.25% default tax |
| `OrderService` | Order management, profit insights | `firstValueFrom()`, HttpClient |
| `TableService` | Table CRUD, position/status updates | Signals, `firstValueFrom()` |
| `SocketService` | Real-time WebSocket + polling fallback | socket.io-client, reconnection, heartbeat |

### WebSocket Events

- `order:new` — New order created
- `order:updated` — Order status changed
- `order:cancelled` — Order cancelled
- `heartbeat` — Connection keep-alive (every 15s)

## Build & Deploy

```bash
# Build the elements bundle
ng build get-order-stack-restaurant-frontend-elements

# Output: dist/get-order-stack-restaurant-frontend-elements/browser/main.js + styles.css
```

### Copy bundle into Geek dist for FTP upload

```bash
cp dist/get-order-stack-restaurant-frontend-elements/browser/{main.js,styles.css} \
   /Users/jam/development/geek-at-your-spot-workspace/dist/geek-at-your-spot-elements/browser/get-order-stack-elements/
```

### WordPress Integration

The bundle is conditionally loaded on demo pages via `functions.php` in the Geek-At-Your-Spot workspace:

```php
// OrderStack bundle — demo pages only
if (is_page('taipa-demo')) {
    wp_enqueue_style('order-stack-elements-css',
        get_template_directory_uri() . '/assets/geek-elements/get-order-stack-elements/styles.css', ...);
    wp_enqueue_script_module('order-stack-elements',
        get_template_directory_uri() . '/assets/geek-elements/get-order-stack-elements/main.js', ...);
}
```

**Important:** `wp_enqueue_script_module` and `wp_enqueue_script` are separate systems. Modules cannot depend on classic scripts.

## Critical: Development Configuration (`ng serve`)

### tsconfig paths MUST point to library source

The default `ng generate library` creates tsconfig paths pointing to `./dist/`. This causes:
- Dev server uses **stale pre-built library** instead of live source
- File watcher does NOT detect library source changes (no hot reload)

**Fix:** In root `tsconfig.json`, point paths to library source and add `baseUrl`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "get-order-stack-restaurant-frontend-library": [
        "projects/get-order-stack-restaurant-frontend-library/src/public-api.ts"
      ]
    }
  }
}
```

### `:host { display: block }` is MANDATORY on every component

Custom elements default to `display: inline`. This collapses block content (flexbox, grid, min-height) to zero height. **Every component** that is registered as a custom element via `customElements.define()` MUST have:

```scss
:host {
  display: block;
}
```

This applies even when the component is used internally as an Angular component — if the selector is also registered as a custom element, the browser applies `display: inline` to it everywhere.

## Coding Conventions

### Angular 21 Patterns (MANDATORY)

- **Standalone components** with `imports: [...]`
- **`ChangeDetectionStrategy.OnPush`** on all components
- **Signals** for state management (`signal()`, `computed()`, `.asReadonly()`)
- **`inject()`** function for dependency injection (no constructor injection)
- **`@if`/`@for`/`@empty`** control flow (never `*ngIf`/`*ngFor`)
- **`firstValueFrom()`** for Promise-based async (never `toPromise()`)
- **`@use`** for Sass imports (never `@import`)
- **`providedIn: 'root'`** for all services

### Code Style

- 2-space indentation
- Single quotes for TypeScript
- 100-character line width (Prettier)
- SCSS for all styles
- Separate `.html` and `.scss` files for components

## API Configuration

API URL: `https://get-order-stack-restaurant-backend.onrender.com/api`
Socket URL: `https://get-order-stack-restaurant-backend.onrender.com`
Test Restaurant ID: `f2cfe8dd-48f3-4596-ab1e-22a28b23ad38`

### Key API Endpoints

- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Menu: `/api/restaurant/{id}/menu/grouped`, `/api/restaurant/{id}/menu/categories`, `/api/restaurant/{id}/menu/items`
- Language support: `?lang=en|es`

## Common Issues

### Components not rendering
- Check DevTools Console for errors
- Verify bundle loaded with `type="module"` in Network tab
- Verify custom element registered: `customElements.get('get-order-stack-menu-display')`
- Check `:host { display: block }` in component SCSS
- Check tsconfig paths point to library source, not dist

### Second bundle fails / console errors
- Confirm scripts loaded via `wp_enqueue_script_module()`, NOT `wp_enqueue_script()`
- Check Network tab for `type="module"` attribute on script tags
- Each bundle must use `createApplication()` with its own injector

### WebSocket not connecting
- Check Socket URL matches environment config
- Verify backend is running on Render
- Check DevTools Network tab for WebSocket upgrade or polling fallback

## Related Projects

| Project | Location | Purpose |
|---------|----------|---------|
| Geek-At-Your-Spot | `/Users/jam/development/geek-at-your-spot-workspace` | WordPress site that loads this bundle |
| Get-Order-Stack Backend | `/Users/jam/development/Get-Order-Stack-Restaurant-Backend` | Express API backend |
| ACORD PCS CRM | `/Users/jam/development/acord-pcs-crm/frontend/acord-pcs-crm` | CRM application (separate demo bundle) |

## MANDATORY: Inclusion Requirements

This project must follow the Angular 21 Library of Angular Elements packaged as Web Components pattern — with no deprecated methods — same as Geek-At-Your-Spot itself.

All code must use:
1. Angular 21 with current, non-deprecated APIs
2. `createApplication()` + `provideZonelessChangeDetection()`
3. `createCustomElement()` + `customElements.define()`
4. `outputHashing: "none"` for predictable filenames
5. `@use` (not `@import`), `firstValueFrom()` (not `toPromise()`), `@for`/`@if` (not `*ngFor`/`*ngIf`)
6. Loaded via `wp_enqueue_script_module()` for scope isolation

## Before Context Compression / Ending Session

**CRITICAL:** Before context gets compressed or session ends, update this file with:

- Any new components added or modified
- New services or models created
- Changes to the registered Web Components list
- Errors encountered and how they were resolved
- Build changes or configuration updates
- Any patterns or decisions made during the session

This ensures critical context survives compression and new sessions start with full knowledge.

## AI Feature Roadmap

See **[plan.md](./plan.md)** for the comprehensive AI feature roadmap (22 features across 4 tiers). Key points:

- **Tier 1 (7 features):** Backend AI services already built (Claude Sonnet 4) but not surfaced in frontend — cart-aware upselling, menu engineering quadrants, sales insights, order profit display, inventory dashboard, AI cost estimation, Stripe payments
- **Tier 2 (6 features):** Enhance existing components — smart KDS routing, auto-86 from inventory, data-driven menu badges, table floor plan
- **Tier 3 (6 features):** New modules to compete with Toast IQ — AI command center, CRM, labor scheduling, online ordering, reservations, AI chat assistant
- **Tier 4 (5 features):** Differentiators — autonomous monitoring agent, voice ordering, dynamic pricing, waste reduction, sentiment analysis

### Session Notes

**[February 9, 2026] (Session 1):**
- Created: `plan.md` — full AI feature roadmap with 22 features across 4 tiers
- Discovery: Backend has 7 AI services (AICostService, MenuEngineeringService, SalesInsightsService, InventoryService, OrderProfitService, TaxService, StripeService) with live API endpoints that frontend never calls
- Discovery: `OrderService.getProfitInsight()` exists in frontend (line 187) but is never invoked by any component
- Discovery: Only 4 components registered in `main.ts` (not 9 as documented)
- Next: Begin Tier 1 implementation — start with T1-01 (AI Upsell Bar), T1-06 (AI Cost Estimation), T1-04 (Order Profit Insights)

**[February 9, 2026] (Session 2):**
- Implemented: T1-06 — AI Cost Estimation in Item Management (5 files)
- Modified: `menu.model.ts` — added AI fields to `MenuItem` (`aiEstimatedCost`, `aiSuggestedPrice`, `aiProfitMargin`, `aiConfidence`, `aiLastUpdated`), added `AICostEstimation`, `AICostEstimationResponse`, `AIBatchResponse` interfaces
- Modified: `services/menu.ts` — added 4 AI methods: `estimateItemCost()`, `generateItemDescription()`, `estimateAllCosts()`, `generateAllDescriptions()`
- Modified: `item-management.ts` — added AI signals (`isEstimating`, `isGenerating`, `lastEstimation`), 5 AI methods, `getConfidenceBadgeClass()` helper
- Modified: `item-management.html` — batch AI buttons in header, AI data display per item card (cost/price/margin/confidence), per-item AI Cost/AI Describe buttons, estimation result dismissible panel
- Modified: `item-management.scss` — styles for `.ai-data`, `.ai-estimation-result`, `.confidence-badge`, `.ai-btn`
- Build: Both library and elements bundle compile with zero errors
- Next: T1-01 (AI Upsell Bar), T1-04 (Order Profit Insights), or other Tier 1 features

**[February 9, 2026] (Session 3):**
- Implemented: T1-04, T1-01, T1-02, T1-03 — four Tier 1 features in one session
- **T1-04 Order Profit Insights:**
  - Added `ProfitInsight` interface to `order.model.ts`
  - Typed `OrderService.getProfitInsight()` return (was `any`)
  - `CheckoutModal`: fetches profit insight after order submit, shows dismissible panel with cost/revenue/margin/star item/quick tip
  - `PendingOrders`: per-order "Profit" button that fetches and shows margin badge + star item
  - `OrderHistory`: profit badge in list view, full profit detail in order detail modal with "View Profit Insight" button
- **T1-01 AI-Powered Cart-Aware Upsell Bar:**
  - Created `analytics.model.ts` with `UpsellSuggestion` interface
  - Created `AnalyticsService` (`services/analytics.ts`) with debounced `fetchUpsellSuggestions()`, `loadMenuEngineering()`, `loadSalesReport()`
  - Updated `UpsellBar` to accept `UpsellSuggestion[]` with reason text, falls back to static `popularItems`
  - Updated `SosTerminal` with cart-watching effect that reactively calls AI upsell endpoint on cart changes (500ms debounce)
- **T1-02 Menu Engineering Dashboard:**
  - Created `analytics/menu-engineering-dashboard/` (3 files: .ts, .html, .scss)
  - Quadrant summary cards (Stars/Cash Cows/Puzzles/Dogs) with click-to-filter
  - Sortable items table (name/margin/popularity) with quadrant badges
  - AI Recommendations panel with priority-colored insight cards
  - Day range selector (7/14/30/90 days)
  - Registered as custom element: `get-order-stack-menu-engineering`
- **T1-03 Sales Insights Dashboard:**
  - Created `analytics/sales-dashboard/` (3 files: .ts, .html, .scss)
  - KPI cards (Revenue/Orders/Avg Order) with comparison arrows
  - Top Sellers list, Peak Hours bar chart
  - AI Insights panel with positive/negative/neutral color coding
  - Daily/Weekly toggle
  - Registered as custom element: `get-order-stack-sales-dashboard`
- **Also registered in `main.ts`:** `CategoryManagement`, `ItemManagement` (were documented but not registered)
- Custom elements now registered: 9 total (Login, RestaurantSelect, SosTerminal, KdsDisplay, MenuEngineering, SalesDashboard, CategoryManagement, ItemManagement, CheckoutModal... wait — CheckoutModal and MenuDisplay are internal via SosTerminal)
- Build: Both library and elements bundle compile with zero errors/warnings (672 KB main.js)
- Tier 1 remaining: T1-05 (Inventory Dashboard), T1-07 (Stripe Payments)

**[February 9, 2026] (Session 4):**
- Implemented: T1-05 — Inventory Management Dashboard
- Created: `lib/models/inventory.model.ts` — 7 interfaces (`InventoryItem`, `InventoryAlert`, `StockPrediction`, `InventoryReorderItem`, `InventoryReport`) + 2 types (`InventoryTab`, `StockActionType`)
- Created: `lib/services/inventory.ts` — `InventoryService` with 10 HTTP methods (loadReport, loadItems, loadAlerts, loadPredictions, createItem, updateStock, recordUsage, recordRestock, predictItem, refresh) matching all backend endpoints
- Created: `lib/inventory/inventory-dashboard/` — 4 files (ts, html, scss, index.ts)
  - 3 tabs: Overview (KPI cards, alerts, reorder list), Items (search/filter/sort table, stock bars, add form, stock action modal), Predictions (urgency-sorted cards with confidence badges)
  - Signal-based state management with computed filters/sorting
  - Bootstrap 5.3.8 dark theme consistent with other dashboards
- Modified: `models/index.ts` — added inventory model re-export
- Modified: `public-api.ts` — added InventoryService + InventoryDashboard exports
- Modified: `elements/src/main.ts` — registered `get-order-stack-inventory-dashboard` (now 9 custom elements total)
- Build: Library + Elements compile with zero errors (711 kB main.js, style budget warning at 6.01 kB vs 4 kB — under 8 kB error threshold)
- Tier 1 remaining: T1-07 (Stripe Payments)

**[February 9, 2026] (Session 5):**
- Implemented: T1-07 — Stripe Payment Integration in Checkout
- Installed: `@stripe/stripe-js` npm package
- Created: `lib/models/payment.model.ts` — `PaymentIntentResponse`, `PaymentStatusResponse`, `RefundResponse`, `PaymentStep` interfaces
- Created: `lib/services/payment.ts` — `PaymentService` with Stripe.js loader, `createPaymentIntent()`, `mountPaymentElement()`, `confirmPayment()`, `getPaymentStatus()`, `cancelPayment()`, `requestRefund()`, signal-based state
- Modified: `environments/environment.ts` + `environment.prod.ts` — added `stripePublishableKey` (placeholder)
- Modified: `models/order.model.ts` — added `paymentMethod` and `stripePaymentIntentId` to `Order` interface
- Modified: `checkout-modal.ts` — 2-step flow: cart review → Stripe Payment Element, success/failed states, cancel/retry payment
- Modified: `checkout-modal.html` — 4-state template (cart/paying/success/failed), Stripe mount point via `#stripeMount` viewChild, order totals summary, payment confirmation buttons
- Modified: `checkout-modal.scss` — payment summary, Stripe container, success/failed icons, payment badge styles
- Modified: `pending-orders.ts` + `pending-orders.html` — payment status badge per order in card meta
- Modified: `pending-orders.scss` — payment badge color classes
- Modified: `order-history.ts` + `order-history.html` — payment badge in list view, refund button in detail modal with loading/success/error states
- Modified: `order-history.scss` — payment badge + alert styles
- Modified: `models/index.ts` — added payment model re-export
- Modified: `public-api.ts` — added PaymentService export
- Build: Library + Elements compile with zero errors (740 kB main.js)
- Stripe appearance: `night` theme with project color variables (--medium-slate-blue, --midnight-black)
- Backend endpoints used: `/payment-intent`, `/payment-status`, `/cancel-payment`, `/refund` (all already built)
- Note: `stripePublishableKey` is `pk_test_placeholder` — must be replaced with real key before testing
- Tier 1 complete: All 7 frontend features implemented (T1-01 through T1-07)

**[February 9, 2026] (Session 6):**
- Implemented: T2-06 (Table Floor Plan), T2-03 (AI Menu Badges), T2-01 (Smart KDS)
- **T2-06 Table Management Floor Plan:**
  - Created `lib/models/table.model.ts` — `RestaurantTable`, `TableFormData`, `TableStatus` interfaces
  - Created `lib/services/table.ts` — `TableService` with full CRUD: `loadTables()`, `createTable()`, `updateTable()`, `updatePosition()`, `updateStatus()`, `deleteTable()`
  - Created `lib/table-mgmt/floor-plan/` — 4 files (ts, html, scss, index.ts)
  - Visual drag-and-drop canvas with pointer events, table nodes color-coded by status (available/occupied/reserved/dirty/maintenance)
  - List view with sortable table, status dropdown, delete confirm
  - KPI strip (total tables, seats, available/occupied/reserved counts)
  - Section filter, unplaced tables panel, add/edit modal, table detail side panel with active orders
  - Registered as custom element: `get-order-stack-floor-plan`
- **T2-03 AI-Enhanced Menu Item Cards:**
  - Added `MenuBadgeType`, `MenuItemBadge` to `analytics.model.ts`
  - Added `itemBadges` computed signal and `getItemBadge()` method to `AnalyticsService`
  - Modified `MenuItemCard` — replaced static `isPopular`/`popular` badge with data-driven badge from menu engineering classification
  - Badge types: Best Seller (stars, gold), Chef's Pick (cash-cows, green), Popular (puzzles, purple), New (< 14 days, blue)
  - SosTerminal loads menu engineering data on init via new effect
- **T2-01 Smart KDS with Prep Time Tracking:**
  - Modified `OrderCard` — added `estimatedPrepMinutes` and `isRushed` inputs, `rushToggle` output
  - Added prep time progress bar with color escalation: green (<70%), amber (70-100%), red (overdue)
  - Added remaining time display ("Xm left" / "overdue"), Rush priority button
  - Modified `KdsDisplay` — injects MenuService, loads menu on init, builds prep time lookup map from MenuItem.prepTimeMinutes
  - Added `_rushedOrders` signal set, `getEstimatedPrep()`, `isRushed()`, `toggleRush()` methods
  - KDS header stats: Active orders, Overdue count, Avg wait time
- Modified: `models/index.ts` — added table model re-export
- Modified: `public-api.ts` — added TableService, FloorPlan exports
- Modified: `elements/src/main.ts` — registered `get-order-stack-floor-plan` (now 10 custom elements)
- Build: 778 kB main.js, zero errors
- Tier 2 progress: T2-01 DONE, T2-03 DONE, T2-06 DONE. Remaining: T2-02 (Auto-86), T2-04 (Multi-Device Routing), T2-05 (Priority Notifications)
- Backend repo: `jmartinemployment/Get-Order-Stack-Restaurant-Backend` (https://github.com/jmartinemployment/Get-Order-Stack-Restaurant-Backend.git)
- Next: T2-02 (Auto-86) or T2-05 (Priority Notifications), then Tier 3

---

*Last Updated: February 9, 2026*
