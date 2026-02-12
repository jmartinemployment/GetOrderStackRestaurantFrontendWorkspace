# Get-Order-Stack — Angular Elements Web Component Architecture

## Project Overview

This workspace contains Angular Elements (Web Components) for the Get-Order-Stack restaurant ordering system — a production product for **getorderstack.com**. The built bundle is loaded on the WordPress site geekatyourspot.com alongside other independent Web Component bundles.

**Deployment:** Built bundle is copied into the Geek-At-Your-Spot dist directory, then FTP uploaded to WordPress. This is a git repository.

**Stack:** Angular 21, Bootstrap SCSS 5.3.8, Angular Elements, Socket.io-client. All code uses current, non-deprecated Angular APIs.

**Related Documentation:**
- **`Get-Order-Stack-Workflow.md`** — Complete business logic, workflows, data models, Control Panel settings, payment processing, and competitive analysis
- **`plan.md`** — Feature roadmap with tier status (T1-T4)

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

## Registered Web Components (23 in main.ts)

| Custom Element Tag | Source Component | Domain |
|---|---|---|
| `get-order-stack-login` | `Login` | Auth |
| `get-order-stack-restaurant-select` | `RestaurantSelect` | Auth |
| `get-order-stack-sos-terminal` | `SosTerminal` | SOS |
| `get-order-stack-kds-display` | `KdsDisplay` | KDS |
| `get-order-stack-command-center` | `CommandCenter` | Analytics |
| `get-order-stack-menu-engineering` | `MenuEngineeringDashboard` | Analytics |
| `get-order-stack-sales-dashboard` | `SalesDashboard` | Analytics |
| `get-order-stack-inventory-dashboard` | `InventoryDashboard` | Inventory |
| `get-order-stack-category-management` | `CategoryManagement` | Menu Mgmt |
| `get-order-stack-item-management` | `ItemManagement` | Menu Mgmt |
| `get-order-stack-floor-plan` | `FloorPlan` | Table Mgmt |
| `get-order-stack-control-panel` | `ControlPanel` | Settings |
| `get-order-stack-crm` | `CustomerDashboard` | CRM |
| `get-order-stack-reservations` | `ReservationManager` | Reservations |
| `get-order-stack-ai-chat` | `ChatAssistant` | AI Chat |
| `get-order-stack-online-ordering` | `OnlineOrderPortal` | Online Ordering |
| `get-order-stack-monitoring-agent` | `MonitoringAgent` | Monitoring |
| `get-order-stack-voice-order` | `VoiceOrder` | Voice Ordering |
| `get-order-stack-dynamic-pricing` | `DynamicPricing` | Pricing |
| `get-order-stack-waste-tracker` | `WasteTracker` | Waste Reduction |
| `get-order-stack-sentiment` | `SentimentDashboard` | Sentiment |
| `get-order-stack-pending-orders` | `PendingOrders` | Orders |
| `get-order-stack-order-history` | `OrderHistory` | Orders |

Internal (not registered as custom elements):
- All `shared/` components — used internally by other components
- `MenuDisplay`, `CartDrawer`, `CheckoutModal`, `UpsellBar`, `OrderNotifications`, `MenuItemCard` — used internally by `SosTerminal`
- `OrderCard`, `StatusBadge` — used internally by `KdsDisplay`
- `PrinterSettings` — used internally by `ControlPanel`
- `PaymentSettingsComponent` — used internally by `ControlPanel`
- `ReceiptPrinter` — used internally by other components

## Core Services

| Service | Purpose | Key Pattern |
|---|---|---|
| `AnalyticsService` | AI upsell, menu engineering, sales reports | Signals, debounced fetch, `firstValueFrom()` |
| `AuthService` | Authentication, session, restaurant selection | Signals, localStorage persistence |
| `InventoryService` | Inventory CRUD, stock actions, AI predictions, reports | Signals, 10 HTTP methods, `firstValueFrom()` |
| `PaymentService` | Processor-agnostic orchestrator (PayPal Zettle + Stripe), provider pattern, refunds | Signals, `firstValueFrom()`, delegates to `PaymentProvider` instances |
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

The bundle is conditionally loaded on OrderStack pages via `functions.php` in the Geek-At-Your-Spot workspace. Uses `is_page($array)` with all OrderStack page slugs:

```php
$orderstack_pages = array(
    'taipa-demo', 'orderstack-kds', 'orderstack-menu-engineering', 'orderstack-sales',
    'orderstack-inventory', 'orderstack-menu-management', 'orderstack-orders',
    'orderstack-online-ordering', 'orderstack-reservations', 'orderstack-command-center',
    'orderstack-floor-plan', 'orderstack-crm', 'orderstack-ai-chat',
    'orderstack-monitoring', 'orderstack-voice-order', 'orderstack-pricing',
    'orderstack-waste', 'orderstack-sentiment',
);
if (is_page($orderstack_pages)) {
    wp_enqueue_style('order-stack-elements-css', ...);
    wp_enqueue_script_module('order-stack-elements', ...);
}
```

### WordPress Page Templates (18 pages)

Each page has a PHP template (`page-{slug}.php`) in the Geek-At-Your-Spot theme. All include `<get-order-stack-login>` + `<get-order-stack-restaurant-select>` for auth (except online-ordering which is public-facing).

| Page Slug | PHP Template | Components |
|---|---|---|
| `taipa-demo` | `page-taipa-demo.php` | login, restaurant-select, sos-terminal |
| `orderstack-kds` | `page-orderstack-kds.php` | login, restaurant-select, kds-display |
| `orderstack-menu-engineering` | `page-orderstack-menu-engineering.php` | login, restaurant-select, menu-engineering |
| `orderstack-sales` | `page-orderstack-sales.php` | login, restaurant-select, sales-dashboard |
| `orderstack-inventory` | `page-orderstack-inventory.php` | login, restaurant-select, inventory-dashboard |
| `orderstack-menu-management` | `page-orderstack-menu-management.php` | login, restaurant-select, category-management, item-management |
| `orderstack-orders` | `page-orderstack-orders.php` | login, restaurant-select, pending-orders, order-history |
| `orderstack-online-ordering` | `page-orderstack-online-ordering.php` | online-ordering (no auth — customer-facing) |
| `orderstack-reservations` | `page-orderstack-reservations.php` | login, restaurant-select, reservations |
| `orderstack-command-center` | `page-orderstack-command-center.php` | login, restaurant-select, command-center |
| `orderstack-floor-plan` | `page-orderstack-floor-plan.php` | login, restaurant-select, floor-plan |
| `orderstack-crm` | `page-orderstack-crm.php` | login, restaurant-select, crm |
| `orderstack-ai-chat` | `page-orderstack-ai-chat.php` | login, restaurant-select, ai-chat |
| `orderstack-monitoring` | `page-orderstack-monitoring.php` | login, restaurant-select, monitoring-agent |
| `orderstack-voice-order` | `page-orderstack-voice-order.php` | login, restaurant-select, voice-order |
| `orderstack-pricing` | `page-orderstack-pricing.php` | login, restaurant-select, dynamic-pricing |
| `orderstack-waste` | `page-orderstack-waste.php` | login, restaurant-select, waste-tracker |
| `orderstack-sentiment` | `page-orderstack-sentiment.php` | login, restaurant-select, sentiment |

**Important:** Pages must be created in WordPress Admin (Pages > Add New) with matching slug and "Custom PHP Page Template" selected. Then flush permalinks (Settings > Permalinks > Save).

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
Development Restaurant ID: `f2cfe8dd-48f3-4596-ab1e-22a28b23ad38` (production uses slug-based resolution via `GET /restaurant/slug/:slug`)

### Key API Endpoints

- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- Menu: `/api/restaurant/{id}/menu/grouped`, `/api/restaurant/{id}/menu/categories`, `/api/restaurant/{id}/menu/items`
- Language support: `?lang=en|es`

## Configuration Required

| Setting | File | Status |
|---------|------|--------|
| Stripe publishable key | `environments/environment.ts` + `environment.prod.ts` | `pk_test_placeholder` — must be replaced with real key from Stripe dashboard |
| PayPal client ID | `environments/environment.ts` + `environment.prod.ts` | `sb` (sandbox) — replace with real PayPal client ID for production |
| Restaurant slug | WordPress `page-orderstack-online-ordering.php` | Add `restaurant-slug="taipa"` attribute to `<get-order-stack-online-ordering>` tag |

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
| ACORD PCS CRM | `/Users/jam/development/acord-pcs-crm/frontend/acord-pcs-crm` | CRM application (separate bundle) |

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

**[February 9, 2026] (Session 7):**
- Completed: T2-02 (Intelligent 86 System), T2-05 (Priority Notifications) — Tier 2 fully complete (T2-04 deferred: no backend endpoints)
- Completed: All Tier 3 features (T3-01 through T3-06) — 6 new components
- **T2-05 Priority Notifications:**
  - Enhanced `OrderNotifications` with Web Audio API (4 distinct tones), Desktop Notification API, urgency classification, elapsed time display, sound/desktop toggle controls, pulse animation for urgent alerts
- **T3-01 AI Command Center:**
  - Created `analytics/command-center/` — composes AnalyticsService, InventoryService, OrderService via `Promise.all()`
  - Added `RecentProfitSummary` interface to `order.model.ts`, `getRecentProfit()` to OrderService
  - 3 tabs: Overview (6 KPIs + insights + top sellers + stock watch), AI Insights (unified feed), Alerts (inventory alerts + predictions)
  - Registered as `get-order-stack-command-center`
- **T3-02 Customer CRM:**
  - Created `customer.model.ts`, `CustomerService` with segment calculation (VIP/Regular/New/At-Risk/Dormant)
  - Created `crm/customer-dashboard/` — search, segment filtering, sortable table, detail side panel
  - Registered as `get-order-stack-crm`
- **T3-04 Online Ordering Portal:**
  - Created `online-ordering/online-order-portal/` — 4-step mobile-optimized flow: menu → cart → info → confirm
  - Category pills, search, qty controls, floating cart bar, order type toggle (pickup/delivery/dine-in), customer form, order summary
  - Uses CartService (menuItem pattern), OrderService with `orderSource: 'online'`
  - Registered as `get-order-stack-online-ordering`
- **T3-05 Reservation Manager:**
  - Created `reservation.model.ts`, `ReservationService` with CRUD + status workflow
  - Created `reservations/reservation-manager/` — today/upcoming/past tabs, booking form, status actions, KPI strip
  - Registered as `get-order-stack-reservations`
- **T3-06 AI Chat Assistant:**
  - Created `chat.model.ts`, `ChatService` with conversation management
  - Created `ai-chat/chat-assistant/` — message bubbles, typing indicator, suggested queries, auto-scroll
  - Registered as `get-order-stack-ai-chat`
- New services exported: ChatService, CustomerService, ReservationService
- Build: 892.64 kB main.js, zero errors (SCSS budget warnings non-blocking)
- Custom elements: 15 total registered in main.ts
- Error fixed: CartItem uses `menuItem: MenuItem` (nested object) + `id` (cart item ID), not flat `menuItemId`/`name` — fixed in OnlineOrderPortal
- **Tier status:** T1 complete (7/7), T2 complete (5/6, T2-04 deferred), T3 complete (6/6)
- Next: Tier 4 features or deployment/testing

**[February 9, 2026] (Session 8):**
- Completed: All Tier 4 features (T4-01 through T4-05) — 5 new components, 1 new service
- **T4-01 Autonomous Monitoring Agent:**
  - Created `models/monitoring.model.ts` — `MonitoringAlert`, `MonitoringSnapshot`, `AnomalyRule` interfaces
  - Created `services/monitoring.ts` — `MonitoringService` with configurable polling (60s default), 8 built-in anomaly rules, deduplication, acknowledge/clear, snapshot timeline
  - Created `monitoring/monitoring-agent/` — 3 tabs: Live Feed (filtered alerts with severity/category), Alert History, Rules (toggle on/off)
  - Polls existing AnalyticsService, InventoryService for data — no new backend needed
  - Registered as `get-order-stack-monitoring-agent`
- **T4-02 Voice AI Ordering:**
  - Created `models/voice.model.ts` — `VoiceMatch`, `VoiceTranscript`, `VoiceSession` interfaces
  - Created `voice-ordering/voice-order/` — Web Speech API integration, bilingual (EN/ES), fuzzy menu matching with quantity extraction ("two chicken tacos"), SpeechSynthesis voice feedback, animated waveform, confidence badges
  - Uses `(globalThis as any).SpeechRecognition` for cross-browser compat
  - Registered as `get-order-stack-voice-order`
- **T4-03 Dynamic Menu Pricing:**
  - Created `models/pricing.model.ts` — `PricingRule`, `PricingRecommendation`, `ItemPricePreview` interfaces
  - Created `pricing/dynamic-pricing/` — 3 tabs: Rules (CRUD form with type/multiplier/time/days), Price Preview (live table with strikethrough base prices), AI Suggestions (4 sample recommendations)
  - Time-based rule engine: checks current time/day against rules, applies multiplier
  - Rule types: happy_hour, surge, off_peak, seasonal, custom
  - Registered as `get-order-stack-dynamic-pricing`
- **T4-04 AI Waste Reduction:**
  - Created `models/waste.model.ts` — `WasteEntry`, `WasteSummary`, `WasteRecommendation` interfaces
  - Created `waste/waste-tracker/` — 3 tabs: Waste Log (entry form + filtered list), Analysis (category breakdown bars + top wasted items), AI Tips (4 sample recommendations with priority/savings)
  - Integrates with InventoryService.recordUsage() to deduct stock on waste entry
  - 5 waste categories: prep_loss, spoilage, customer_return, damaged, overproduction
  - Registered as `get-order-stack-waste-tracker`
- **T4-05 Sentiment Analysis:**
  - Created `models/sentiment.model.ts` — `SentimentEntry`, `SentimentSummary`, `SentimentFlag` interfaces
  - Created `sentiment/sentiment-dashboard/` — 3 tabs: Overview (sentiment bars + keyword cloud + flag grid), Entries (filtered list with score/keywords/flags), Flags (detail view by flag type)
  - Client-side NLP: keyword matching for positive/negative scoring, 6 flag categories (complaint, allergy, rush, compliment, dietary, modification)
  - Fetches orders and analyzes specialInstructions text
  - Registered as `get-order-stack-sentiment`
- Build: 1.00 MB main.js (at budget warning threshold), zero errors
- Custom elements: 20 total registered in main.ts
- New services exported: MonitoringService
- New models: monitoring, voice, pricing, waste, sentiment (5 new model files)
- Errors fixed: InventoryService methods take no restaurantId arg (reads internally), SpeechRecognition types need `any` cast, arrow functions not allowed in Angular templates
- **ALL TIERS COMPLETE:** T1 (7/7), T2 (5/6, T2-04 deferred), T3 (6/6), T4 (5/5) — 22 features total implemented

**[February 9, 2026] (Session 9):**
- Deployed: Bundle (main.js 754 KB + styles.css 225 KB) uploaded to WordPress via FTPS curl
- Created: 17 PHP page templates in Geek-At-Your-Spot theme for all OrderStack features
  - `page-orderstack-kds.php`, `page-orderstack-menu-engineering.php`, `page-orderstack-sales.php`
  - `page-orderstack-inventory.php`, `page-orderstack-menu-management.php`, `page-orderstack-orders.php`
  - `page-orderstack-online-ordering.php`, `page-orderstack-reservations.php`
  - `page-orderstack-command-center.php`, `page-orderstack-floor-plan.php`, `page-orderstack-crm.php`, `page-orderstack-ai-chat.php`
  - `page-orderstack-monitoring.php`, `page-orderstack-voice-order.php`, `page-orderstack-pricing.php`, `page-orderstack-waste.php`, `page-orderstack-sentiment.php`
- Modified: `functions.php` — replaced single `is_page('taipa-demo')` with `is_page($orderstack_pages)` array of 18 slugs for both CSS and JS enqueue
- All pages follow same pattern: geek-navbar header, login + restaurant-select for auth, functional component(s) in main
- Exception: `page-orderstack-online-ordering.php` — no auth components (customer-facing portal)
- FTP uploaded: all 17 PHP files + updated functions.php to geekatyourspot.com theme directory
- Note: WordPress pages must be created in admin (Pages > Add New) with matching slugs and "Custom PHP Page Template" selected, then permalinks flushed
- Updated CLAUDE.md WordPress Integration section with full page template table

**[February 10, 2026] (Session 10):**
- Production hardening: removed all demo assumptions and hardcoded sample data
- **Step 1 — Monitoring baseline**: replaced `const baseline = 25` with dynamic `_baselineAov` signal set from first scan's `salesReport.summary.averageOrderValue`
- **Step 2 — Cart tax rate**: replaced `private readonly defaultTaxRate = 0.0825` with `_taxRate = signal(0.0825)` + `setTaxRate(rate)` method + `taxRate` public readonly
- **Step 3 — Slug-based resolution**: removed `defaultRestaurantId` from both environments, added `resolveRestaurantBySlug(slug)` to AuthService, added `restaurantSlug` input to OnlineOrderPortal that resolves restaurant + sets tax rate, removed `?? environment.defaultRestaurantId` from OrderService
- **Step 4 — DynamicPricing**: removed 3 hardcoded pricing rules + 4 hardcoded recommendations, init as empty arrays, added localStorage persistence per restaurant, added empty-state messaging
- **Step 5 — WasteTracker**: replaced hardcoded `_recommendations` signal with `computed()` that analyzes actual `_entries()` data (top category, top item, day patterns), added empty-state messaging
- **Step 6 — Stripe validation**: added runtime check in `ensureStripeLoaded()` — if key contains "placeholder", sets error signal instead of loading
- **Step 7 — plan.md**: removed ~15 "demo" references, replaced WordPress Demo Expansion Plan with note about completed Session 9 deployment, marked all 4 tiers as COMPLETE
- **Step 8 — CLAUDE.md**: "demo project" → "production product", "demo pages" → "OrderStack pages", "Test Restaurant ID" → "Development Restaurant ID", added Configuration Required section (Stripe key, restaurant slug)
- **Model change**: added `slug: string` to `Restaurant` interface
- Build: Library + Elements compile with zero errors (773 kB main.js)
- Next: commit, push, redeploy; WordPress needs `restaurant-slug="taipa"` attribute on online-ordering page

**[February 12, 2026] (Session 11):**
- Implemented: Dining Option Workflows (Phases 6-8) + T1-08 Phase 5 (Control Panel UI for Printer Management)
- **Dining Options — Phase 7 (Online Portal):**
  - Updated `dining-option.model.ts` — DeliveryInfo.deliveryState from 4 states to 3 (`PREPARING | OUT_FOR_DELIVERY | DELIVERED`)
  - Modified `online-order-portal.ts` — added curbside type + vehicle signal, structured delivery signals (address2/city/state/zip/notes), order tracking with polling, `notifyArrival()`, `getDeliveryStateLabel()`
  - Modified `online-order-portal.html` — curbside button, structured address fields, vehicle description field, order tracking section on confirm step
  - Modified `online-order-portal.scss` — tracking styles
  - Fixed `checkout-modal.ts` — changed `deliveryState: 'PENDING'` → `'PREPARING'` (2 occurrences)
- **Dining Options — Phase 6 (OrderHistory):**
  - Modified `order-history.html` — added Dining Details section to modal (delivery address, state badge, curbside vehicle, catering event info)
  - Modified `order-history.ts` — added `getDeliveryStateLabel()` method
  - Modified `order-history.scss` — dining-details and delivery state badge styles
- **Dining Options — Phase 8 (ReceiptPrinter):**
  - Modified `receipt-printer.html` — added dining-specific info blocks (delivery, curbside, catering)
  - Modified `pending-orders.ts` — added diningRows to `printCheck()` inline HTML receipt
- **T1-08 Phase 5 — Control Panel UI for Printer Management (8 steps, all complete):**
  - Created `models/printer.model.ts` — `Printer`, `PrinterFormData`, `CloudPrntConfig`, `PrinterCreateResponse`, `TestPrintResponse` interfaces, `PrinterModel` and `ControlPanelTab` types
  - Created `services/printer.ts` — `PrinterService` following TableService pattern (5 methods: load, create, update, delete, testPrint)
  - Created `settings/printer-settings/` — 4 files (ts, html, scss, index.ts) — full printer CRUD UI with KPI strip, CloudPRNT config, MAC validation, online status dots, test print, delete confirmation modal
  - Created `settings/control-panel/` — 4 files (ts, html, scss, index.ts) — tab-based settings hub shell with "Printers" as first tab
  - Modified `models/index.ts` — added printer.model export
  - Modified `public-api.ts` — added PrinterService export + ControlPanel export (new Settings section)
  - Modified `elements/src/main.ts` — registered `get-order-stack-control-panel` (23 custom elements total)
- Build: 864.93 kB main.js + 231.15 kB styles.css, zero errors (SCSS budget warnings only)
- Custom elements: 23 total registered in main.ts
- WordPress: needs new page `orderstack-control-panel` + PHP template + slug in `$orderstack_pages` array
- Next: T1-08 backend phases (Prisma models, print service, CloudPRNT endpoints, printer CRUD API), then Dining Options backend phases

**[February 12, 2026] (Session 12):**
- Completed: Dining Options backend validation + query filtering (4 phases)
- Installed: Zod npm package for schema validation
- Created: `src/validators/dining.validator.ts` (Backend) — Zod schemas enforce dining requirements per order type
  - `DeliveryInfoSchema` — validates address, city, 2-letter state code, 5/9-digit ZIP
  - `CurbsideInfoSchema` — validates vehicleDescription
  - `CateringInfoSchema` — validates eventDate (ISO), eventTime, headcount (≥1)
  - `CustomerInfoSchema` — validates firstName, lastName, phone (≥10 digits), email (optional)
  - `validateDiningData()` — enforces requirements by order type, returns { valid, errors[] }
- Modified: `src/app/app.routes.ts` (Backend) — POST /:restaurantId/orders validates before Prisma create
  - Validation returns 400 with detailed error messages on failure
  - Example: "Delivery: state: State must be 2-letter code"
- Modified: `src/app/app.routes.ts` (Backend) — GET /:restaurantId/orders supports new query params
  - `?deliveryStatus=PREPARING|OUT_FOR_DELIVERY|DELIVERED` — filter delivery orders by state
  - `?approvalStatus=NEEDS_APPROVAL|APPROVED|NOT_APPROVED` — filter catering orders by approval
- Created: `DINING_OPTIONS_API.md` (Backend) — Complete API reference documentation
  - Overview of 5 dining types with required fields table
  - Order creation examples for each type
  - Validation rules and error messages reference
  - Query filtering documentation
  - State machines (delivery workflow, catering approval)
  - Testing checklist (15 tests)
- Status: ✅ Dining Options COMPLETE (frontend Session 11 + backend Session 12)
- Backend repo: `/Users/jam/development/Get-Order-Stack-Restaurant-Backend`
- Next: T1-08 Printer Integration backend phases 7-8 (order flow integration, WebSocket events)

**[February 12, 2026] (Session 17):**
- Implemented: Expo Station UI — local verification layer in KDS (10 files modified, 0 new files)
- **Design:** No new `GuestOrderStatus`. EXPO is a client-side split of `READY_FOR_PICKUP` orders into "unchecked" (expo queue) and "checked" (ready column). Print triggers on expo check instead of on status change.
- **settings.model.ts:** Added `expoStationEnabled: boolean` to `AISettings` interface, default `false`
- **ai-settings.ts:** Added `_expoStationEnabled` signal, readonly, `loadFromService()`, `onExpoStationToggle()` handler, save field
- **ai-settings.html:** Inserted Expo Station toggle panel between Catering Timeout and Course Pacing sections
- **order.ts (OrderService):** Added `options?: { skipPrint?: boolean }` param to `updateOrderStatus()`, gated print on `!options?.skipPrint`, added `triggerPrint(orderId)` public method
- **order-card.ts:** Added `isExpoQueue` input, `expoCheck` output, `bumpLabel` computed ("CHECKED" when expo), expo early-return in `onBump()`
- **order-card.html:** Added EXPO badge in header, footer guard expanded to `nextAction() || isExpoQueue()`, button uses `bumpLabel()` with conditional `btn-expo-check` class
- **order-card.scss:** Added `.btn-expo-check` (orange #e35d00), `.expo-badge` (flash animation), `.bg-expo`
- **kds-display.ts:** Added `_expoStationEnabled`, `_expoOverride`, `_expoCheckedOrders` signals; `expoQueueOrders`/`expoCheckedOrders` computed; `onExpoCheck()` (adds to checked set + triggers print), `toggleExpoStation()` with toggle-off safety (prints unchecked expo orders before disabling); `skipPrint` passed in `onStatusChange()` when expo enabled
- **kds-display.html:** Expo toggle in header, dynamic `kds-columns-4` class, EXPO column with `[isExpoQueue]="true"` + `(expoCheck)`, READY column uses `expoCheckedOrders()` (falls through to `readyOrders()` when expo off)
- **kds-display.scss:** `.kds-columns-4` (4-column responsive grid: 4@desktop, 2@1200px, 1@768px), `.expo` column header color
- Updated: `Get-Order-Stack-Workflow.md` v4.9 — KDS Workflow section, Dine-In Phase 4, AI Settings table, Expo Settings section, removed from Remaining items
- Updated: `plan.md` — T2-01 status, Domain Map, Implementation Priority table (EX row), Context paragraph
- Build: 929 kB main.js + 231 kB styles.css, zero errors (pre-existing SCSS budget warnings only)
- Committed: `14fefb5` (73 files — includes accumulated sessions 11-16 changes), pushed to origin
- Remote URL updated: `https://github.com/jmartinemployment/GetOrderStackRestaurantFrontendWorkspace.git`
- Next: deploy updated bundle to WordPress, or continue with remaining backend work

**[February 12, 2026] (Session 18):**
- Implemented: PayPal Zettle Payment Integration — provider-based payment abstraction
- Installed: `@paypal/paypal-js` npm package
- **Architecture:** Replaced Stripe-only PaymentService with processor-agnostic orchestrator using `PaymentProvider` interface. PayPal is recommended processor; Stripe retained as fallback. Restaurants choose processor via new "Payments" tab in Control Panel.
- **New files (4):**
  - `services/providers/stripe-provider.ts` — extracted Stripe logic into plain class implementing `PaymentProvider`
  - `services/providers/paypal-provider.ts` — PayPal Orders v2 integration (create → mount buttons → onApprove capture → confirm)
  - `services/providers/index.ts` — barrel export
  - `settings/payment-settings/` — 4 files (ts, html, scss, index.ts) — radio buttons for None/PayPal/Stripe, "Require payment before kitchen" checkbox, save/discard
- **Rewritten files:**
  - `models/payment.model.ts` — added `PaymentProcessorType`, `PaymentProvider` interface, `PaymentContext`, `PaymentCreateResult`; `PaymentStatusResponse.stripe` → `processorData`
  - `services/payment.ts` — processor-agnostic orchestrator, delegates to active provider; `setProcessorType()`, `isConfigured()`, `needsExplicitConfirm()`, `initiatePayment()`, `mountPaymentUI()`, `confirmPayment()`
- **Modified files:**
  - `environments/environment.ts` + `environment.prod.ts` — added `paypalClientId: 'sb'`
  - `models/settings.model.ts` — added `PaymentSettings` interface + `defaultPaymentSettings()` factory
  - `models/printer.model.ts` — added `'payments'` to `ControlPanelTab` union
  - `models/order.model.ts` — `Payment.stripePaymentIntentId` → `paymentProcessor` + `paymentProcessorId`
  - `services/order.ts` — `mapOrder` payments block handles both `stripePaymentIntentId` and `paypalOrderId`
  - `services/restaurant-settings.ts` — added `_paymentSettings` signal, `paymentSettings` readonly, `savePaymentSettings()`
  - `checkout-modal.ts` — reads processor from settings, conditional payment flow, auto-confirm for PayPal
  - `checkout-modal.html` — `stripe-container` → `payment-container`, Pay button wrapped in `@if (needsExplicitConfirm())`
  - `checkout-modal.scss` — `.stripe-container` → `.payment-container`
  - `control-panel.ts` — added PaymentSettingsComponent import + Payments tab
  - `control-panel.html` — added payments tab content
  - `public-api.ts` — added `StripePaymentProvider` and `PayPalPaymentProvider` exports
- **Key design decisions:**
  - Providers are plain classes (not Angular services) — they use `fetch()` for HTTP, receive `PaymentContext` for callback access
  - PayPal auto-confirms (buttons handle their own flow); Stripe requires explicit Pay button click
  - Race condition handled via `paypalApproved` flag + Promise resolve/reject pattern
  - Control Panel now has 5 tabs: Printers, AI Settings, Online Pricing, Catering Calendar, Payments
- Build: 944 kB main.js + 231 kB styles.css, zero errors
- Backend endpoints needed: `POST /paypal-create` and `POST /paypal-capture` (not yet built)
- Next: build PayPal backend endpoints, deploy updated bundle to WordPress

---

*Last Updated: February 12, 2026 (Session 18)*
