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

## Registered Web Components (9)

| Custom Element Tag | Source Component | Domain |
|---|---|---|
| `get-order-stack-login` | `Login` | Auth |
| `get-order-stack-restaurant-select` | `RestaurantSelect` | Auth |
| `get-order-stack-sos-terminal` | `SosTerminal` | SOS |
| `get-order-stack-kds-display` | `KdsDisplay` | KDS |
| `get-order-stack-menu-display` | `MenuDisplay` | SOS |
| `get-order-stack-menu-item-card` | `MenuItemCard` | SOS |
| `get-order-stack-checkout-modal` | `CheckoutModal` | SOS |
| `get-order-stack-category-management` | `CategoryManagement` | Menu Mgmt |
| `get-order-stack-item-management` | `ItemManagement` | Menu Mgmt |

Internal (not registered as custom elements):
- All `shared/` components — used internally by other components
- `CartDrawer`, `UpsellBar`, `OrderNotifications` — used internally by `SosTerminal`
- `OrderCard`, `StatusBadge` — used internally by `KdsDisplay`
- `PendingOrders`, `OrderHistory`, `ReceiptPrinter` — used internally by other components

## Core Services

| Service | Purpose | Key Pattern |
|---|---|---|
| `AuthService` | Authentication, session, restaurant selection | Signals, localStorage persistence |
| `MenuService` | Menu CRUD, language support (en/es) | `firstValueFrom()`, HttpClient |
| `CartService` | Shopping cart state, tax/tip calculation | Signals, 8.25% default tax |
| `OrderService` | Order management | `firstValueFrom()`, HttpClient |
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

### Session Notes

*(Add session notes here as work progresses)*

---

*Last Updated: February 5, 2026*
