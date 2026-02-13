# Third-Party Delivery Integration — Plan Review & Strict Prompt

## Part 1: Plan Review — Issues Found

| # | Severity | Issue | Correction |
|---|----------|-------|------------|
| 1 | **CRITICAL** | Plan adds flat delivery fields (`deliveryProvider?`, `deliveryDriverName?`, etc.) to `Order` interface in `order.model.ts` | `Order` already uses `deliveryInfo?: DeliveryInfo` (from `dining-option.model.ts:38-48`). New third-party fields must extend `DeliveryInfo`, NOT add flat fields to Order |
| 2 | **CRITICAL** | 10-state `DeliveryDispatchStatus` replaces existing 3-state `deliveryState` | Existing `deliveryState: 'PREPARING' \| 'OUT_FOR_DELIVERY' \| 'DELIVERED'` is used in checkout-modal, online-order-portal, order-history, pending-orders, and backend `order-actions.routes.ts` DELIVERY_TRANSITIONS. Keep it. Add SEPARATE `dispatchStatus?: DeliveryDispatchStatus` to `DeliveryInfo` for granular DaaS state |
| 3 | **CRITICAL** | `DeliverySettings` placed in new `delivery.model.ts` | ALL settings live in `settings.model.ts` (AISettings, OnlinePricingSettings, CateringCapacitySettings, PaymentSettings, TipManagementSettings). `DeliverySettings` + `defaultDeliverySettings()` must go there too |
| 4 | **MAJOR** | Plan says ControlPanelTab has 5 values | Actually has 7: `'printers' \| 'ai-settings' \| 'online-pricing' \| 'catering-calendar' \| 'payments' \| 'tip-management' \| 'loyalty'` (printer.model.ts:3). Must add `'delivery'` as 8th |
| 5 | **MAJOR** | Plan says "Zero schema migration needed for Phase 1" | ALMOST true. Existing Prisma columns cover provider/trackingUrl/ETA/timestamps. But need ONE new column: `deliveryExternalId String?` to store DaaS dispatch ID (DoorDash delivery_id / Uber delivery_uuid). Required for webhook matching + status polling |
| 6 | **MAJOR** | Plan adds `delivery:status_updated` socket event | Delivery state changes already arrive via `order:updated` (backend `broadcastToSourceAndKDS` sends enriched order). Adding parallel event creates confusion. Keep `order:updated` for state changes. Only add `delivery:location_updated` for lightweight GPS pings |
| 7 | **MAJOR** | DeliveryService `pollDeliveryStatus` at 30s conflicts with existing polling | Online order portal already polls order status every 15s. Two competing polls is wasteful. Extend existing order polling via enriched response. Use WebSocket `delivery:location_updated` for real-time GPS (pushed by webhooks, not polled) |
| 8 | **MAJOR** | Delivery fee handling undefined | `OnlinePricingSettings.deliveryFee` (settings.model.ts:29) already stores a restaurant-configured flat delivery fee. Prisma has `deliveryFee Decimal` column. When DaaS provider gives a quote, the quote fee REPLACES the static deliveryFee. Self-delivery uses the static fee |
| 9 | **MAJOR** | No backend endpoint for API key config status | Plan Step 4 shows "API key status indicators" in settings UI, but no endpoint to check if DaaS keys are configured. Need: `GET /:restaurantId/delivery/config-status` |
| 10 | **MAJOR** | KDS "Dispatch Driver" button UX undefined | Dispatch requires a quote first. Flow must be: auto-quote when order reaches READY_FOR_PICKUP (or PREPARING if auto-dispatch) → show fee/ETA on card → "Dispatch" button accepts existing quote |
| 11 | **MINOR** | Phase 2 modified files list has frontend paths under "Backend (7)" | `lib/orders/pending-orders/pending-orders.ts` and `lib/orders/order-history/order-history.ts` are frontend files |
| 12 | **MINOR** | No error handling for DaaS failures | Need: quote expired flow, driver cancelled mid-delivery, provider API unavailable fallback |
| 13 | **MINOR** | Backend `order-enrichment.ts` not mentioned | This file (builds nested deliveryInfo from flat Prisma columns) must be updated to include new driver fields |
| 14 | **MINOR** | No mention of `order-actions.routes.ts` existing delivery-status endpoint | Backend already has `PATCH /:orderId/delivery-status` with 3-state DELIVERY_TRANSITIONS. DaaS webhooks must coexist with this |
| 15 | **INFO** | Grubhub marketplace API is invitation-only | Phase 2 Grubhub integration should be marked conditional |

---

## Part 2: Corrected Plan — Phase 1 (DaaS) — 10 Steps

All frontend paths relative to: `projects/get-order-stack-restaurant-frontend-library/src/`

### Step 1 — Frontend delivery models

**New file:** `lib/models/delivery.model.ts`

```typescript
// --- Provider type ---
export type DeliveryProviderType = 'doordash' | 'uber' | 'self' | 'none';

// --- DaaS dispatch status (granular, separate from DeliveryInfo.deliveryState) ---
export type DeliveryDispatchStatus =
  | 'QUOTED'
  | 'DISPATCH_REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE_TO_PICKUP'
  | 'DRIVER_AT_PICKUP'
  | 'PICKED_UP'
  | 'DRIVER_EN_ROUTE_TO_DROPOFF'
  | 'DRIVER_AT_DROPOFF'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

// --- Quote response from backend ---
export interface DeliveryQuote {
  provider: DeliveryProviderType;
  quoteId: string;
  fee: number;           // in dollars
  estimatedPickupAt: string;   // ISO datetime
  estimatedDeliveryAt: string; // ISO datetime
  expiresAt: string;           // ISO datetime
}

// --- Dispatch result from backend ---
export interface DeliveryDispatchResult {
  deliveryExternalId: string;  // DoorDash delivery_id or Uber delivery_uuid
  trackingUrl: string;
  estimatedDeliveryAt: string;
}

// --- Real-time driver info (ephemeral, from status endpoint) ---
export interface DeliveryDriverInfo {
  name?: string;
  phone?: string;
  photoUrl?: string;
  location?: { lat: number; lng: number };
  estimatedDeliveryAt?: string;
}

// --- Context passed to provider classes (mirrors PaymentContext) ---
export interface DeliveryContext {
  restaurantId: string;
  apiUrl: string;
}

// --- Provider interface (mirrors PaymentProvider) ---
export interface DeliveryProvider {
  readonly type: DeliveryProviderType;
  requestQuote(orderId: string, context: DeliveryContext): Promise<DeliveryQuote>;
  acceptQuote(orderId: string, quoteId: string, context: DeliveryContext): Promise<DeliveryDispatchResult>;
  cancelDelivery(orderId: string, deliveryExternalId: string, context: DeliveryContext): Promise<boolean>;
  getStatus(orderId: string, deliveryExternalId: string, context: DeliveryContext): Promise<DeliveryDriverInfo>;
  destroy(): void;
}
```

**Modify:** `lib/models/dining-option.model.ts` — Extend `DeliveryInfo` with DaaS fields:

```typescript
// ADD these optional fields to existing DeliveryInfo interface:
export interface DeliveryInfo {
  // ... existing fields stay unchanged ...
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  deliveryNotes?: string;
  deliveryState: 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';  // KEEP AS-IS
  dispatchedDate?: Date;
  deliveredDate?: Date;
  // NEW: DaaS fields (all optional — absent for self-delivery)
  deliveryProvider?: DeliveryProviderType;   // 'doordash' | 'uber' | 'self'
  deliveryExternalId?: string;               // DaaS dispatch ID
  deliveryTrackingUrl?: string;              // Public tracking URL
  dispatchStatus?: DeliveryDispatchStatus;   // Granular 11-state DaaS status
  estimatedDeliveryAt?: string;              // ISO datetime ETA
  deliveryFee?: number;                      // DaaS quote fee (overrides static fee)
}
```

Add import for `DeliveryProviderType` and `DeliveryDispatchStatus` from `delivery.model.ts`.

**Modify:** `lib/models/settings.model.ts` — Add DeliverySettings (alongside existing settings):

```typescript
import { DeliveryProviderType } from './delivery.model';

export interface DeliverySettings {
  provider: DeliveryProviderType;
  autoDispatch: boolean;
  showQuotesToCustomer: boolean;
  defaultTipPercent: number;
}

export function defaultDeliverySettings(): DeliverySettings {
  return {
    provider: 'none',
    autoDispatch: false,
    showQuotesToCustomer: true,
    defaultTipPercent: 15,
  };
}
```

**Modify:** `lib/models/printer.model.ts` — Add `'delivery'` to ControlPanelTab:
```typescript
export type ControlPanelTab = 'printers' | 'ai-settings' | 'online-pricing' | 'catering-calendar' | 'payments' | 'tip-management' | 'loyalty' | 'delivery';
```

**Modify:** `lib/models/index.ts` — Add delivery model re-export.

**DO NOT:** Add flat delivery fields to `Order` interface. `Order.deliveryInfo?: DeliveryInfo` already carries all delivery data.

### Step 2 — Frontend delivery providers (plain classes)

**New file:** `lib/services/providers/doordash-provider.ts`
**New file:** `lib/services/providers/uber-provider.ts`

Follow `stripe-provider.ts` pattern exactly:
- Plain class (NOT Angular `@Injectable`) implementing `DeliveryProvider`
- Uses `fetch()` for HTTP — no Angular `HttpClient`
- Receives `DeliveryContext` via method params (not constructor)
- All calls proxy through OUR backend (`/delivery/quote`, `/delivery/dispatch`, `/delivery/cancel`, `/delivery/status/:id`)
- Frontend NEVER touches DoorDash/Uber APIs directly
- `destroy()` clears any stored state

```typescript
// Example shape (doordash-provider.ts):
export class DoorDashDeliveryProvider implements DeliveryProvider {
  readonly type = 'doordash' as const;

  async requestQuote(orderId: string, context: DeliveryContext): Promise<DeliveryQuote> {
    const res = await fetch(`${context.apiUrl}/restaurant/${context.restaurantId}/delivery/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, provider: 'doordash' }),
    });
    if (!res.ok) throw new Error(`Quote failed: ${res.statusText}`);
    return res.json();
  }

  // acceptQuote, cancelDelivery, getStatus follow same pattern
  destroy(): void { /* no cleanup needed */ }
}
```

**Modify:** `lib/services/providers/index.ts` — Add delivery provider exports.

### Step 3 — Frontend DeliveryService orchestrator

**New file:** `lib/services/delivery.ts`

Mirror `payment.ts` structure:

```typescript
@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(RestaurantSettingsService);
  private provider: DeliveryProvider | null = null;

  // Signals
  private readonly _providerType = signal<DeliveryProviderType>('none');
  private readonly _isProcessing = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _currentQuote = signal<DeliveryQuote | null>(null);
  private readonly _driverInfo = signal<DeliveryDriverInfo | null>(null);

  readonly providerType = this._providerType.asReadonly();
  readonly isProcessing = this._isProcessing.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentQuote = this._currentQuote.asReadonly();
  readonly driverInfo = this._driverInfo.asReadonly();

  setProviderType(type: DeliveryProviderType): void {
    this.provider?.destroy();
    this.provider = null;
    this._providerType.set(type);
    switch (type) {
      case 'doordash': this.provider = new DoorDashDeliveryProvider(); break;
      case 'uber': this.provider = new UberDeliveryProvider(); break;
      case 'self': case 'none': break;
    }
  }

  isConfigured(): boolean {
    return this.provider !== null && this._providerType() !== 'none' && this._providerType() !== 'self';
  }

  // requestQuote, acceptQuote, cancelDelivery, getDeliveryStatus — all delegate to provider
  // Each wraps in _isProcessing + _error pattern from PaymentService
  reset(): void { ... }
}
```

**DO NOT** add `pollDeliveryStatus()` with a timer. Existing order polling in online-order-portal already fetches updated orders every 15s. Driver GPS updates come via WebSocket `delivery:location_updated` pushed by backend webhooks — not frontend polling.

### Step 4 — Frontend delivery settings UI

**New files:** `lib/settings/delivery-settings/` (4 files: ts, html, scss, index.ts)

Follow `payment-settings/payment-settings.ts` pattern exactly:
- Inject `RestaurantSettingsService`
- Local signals for form state (`_provider`, `_autoDispatch`, `_showQuotes`, `_defaultTip`)
- `isDirty` computed comparing local signals vs `settingsService.deliverySettings()`
- Template: radio buttons (None / DoorDash Drive / Uber Direct / Self), checkboxes, number input, Save/Discard
- API key config status: inject from a `deliveryConfigStatus` signal (populated from `GET /delivery/config-status`)

**Modify:** `lib/services/restaurant-settings.ts`:
- Add `private readonly _deliverySettings = signal<DeliverySettings>(defaultDeliverySettings());`
- Add `readonly deliverySettings = this._deliverySettings.asReadonly();`
- Add `async saveDeliverySettings(s: DeliverySettings): Promise<void>` — same pattern as `savePaymentSettings()` (try backend PATCH, fallback localStorage)
- Add to `loadSettings()`: merge defaults → localStorage → backend for delivery settings

**Modify:** `lib/settings/control-panel/control-panel.ts`:
- Import `DeliverySettingsComponent`
- Add `{ key: 'delivery', label: 'Delivery' }` to `tabs` array

**Modify:** `lib/settings/control-panel/control-panel.html`:
- Add `@if (activeTab() === 'delivery') { <get-order-stack-delivery-settings /> }`

### Step 5 — Frontend checkout + online portal integration

**Modify:** `lib/sos/checkout-modal/checkout-modal.ts`
- Inject `DeliveryService` and `RestaurantSettingsService`
- After order creation, if dining type is `'delivery'` AND `deliveryService.isConfigured()`:
  - Call `requestQuote(orderId)` → display fee + ETA
  - If `autoDispatch` setting is ON: auto-call `acceptQuote()`
  - If OFF: show "Dispatch Driver ($X.XX)" button
- If provider is `'self'` or `'none'`: existing flow unchanged (manual PREPARING → OUT → DELIVERED)
- Delivery fee from DaaS quote replaces the static `OnlinePricingSettings.deliveryFee`

**Modify:** `lib/online-ordering/online-order-portal/` (ts, html, scss)
- On delivery orders with DaaS configured:
  - After address entered on info step: call `requestQuote()` → show fee + ETA
  - If `showQuotesToCustomer` setting is ON: display "Delivery fee: $X.XX, ETA: ~30 min"
  - If OFF: show "Delivery fee: calculated at checkout"
  - On confirm step: show driver tracking section (name, phone, ETA, tracking URL link)
  - Use existing 15s order polling — no separate delivery poll

### Step 6 — Frontend KDS integration

**Modify:** `lib/kds/order-card/` (ts, html, scss)
- Add `deliveryProviderLabel` computed signal: derives from `order().deliveryInfo?.deliveryProvider`
- Add `dispatchStatusLabel` computed: maps `dispatchStatus` to human-readable text
- Show delivery provider badge (DoorDash red / Uber black) in card header
- Show ETA countdown when `dispatchStatus` is DRIVER_EN_ROUTE_TO_DROPOFF or similar
- Add `dispatchDriver` output event for KDS parent to handle

**Modify:** `lib/kds/kds-display/kds-display.ts`
- Inject `DeliveryService` and `RestaurantSettingsService`
- `dispatchDriver(orderId: string)` method: calls `deliveryService.requestQuote()` then `acceptQuote()`
- Auto-quote behavior: when order transitions to READY_FOR_PICKUP and DaaS configured + autoDispatch ON → auto-dispatch
- When autoDispatch OFF: order card shows "Dispatch ($X)" button → triggers `dispatchDriver`

**DO NOT** add a `delivery:status_updated` socket listener here. Delivery state updates arrive via existing `order:updated` events through the enriched order response.

### Step 7 — Frontend order mapping + exports

**Modify:** `lib/services/socket.ts`
- Add `delivery:location_updated` event listener ONLY (for real-time GPS pings, not full order updates)
- Signature: `{ orderId: string; lat: number; lng: number; estimatedDeliveryAt?: string }`
- Update `_driverInfo` signal in `DeliveryService` (or emit via a subject)

**Modify:** `lib/services/order.ts`
- Extend `mapOrder()` to map new delivery fields from backend enriched response:
  - `deliveryProvider` → `deliveryInfo.deliveryProvider`
  - `deliveryExternalId` → `deliveryInfo.deliveryExternalId`
  - `deliveryTrackingUrl` → `deliveryInfo.deliveryTrackingUrl`
  - `dispatchStatus` → `deliveryInfo.dispatchStatus`
  - `estimatedDeliveryAt` → `deliveryInfo.estimatedDeliveryAt`
  - `deliveryFee` → `deliveryInfo.deliveryFee`

**Modify:** `public-api.ts`
- Export: `DeliveryService`, `DoorDashDeliveryProvider`, `UberDeliveryProvider`
- Export: all types from `delivery.model.ts`
- Export: `DeliverySettings`, `defaultDeliverySettings` from `settings.model.ts`

### Step 8 — Backend delivery provider services

**Working directory:** `/Users/jam/development/Get-Order-Stack-Restaurant-Backend/`

**Prisma migration** (ONE nullable column):
```
npx prisma migrate dev --name add-delivery-external-id
```
Add to Order model in `prisma/schema.prisma`:
```prisma
deliveryExternalId    String?   @map("delivery_external_id")
```

**Modify:** `src/utils/order-enrichment.ts` — Extend `enrichOrderResponse()`:
```typescript
// Inside the deliveryInfo block, ADD:
deliveryProvider: order.deliveryProvider ?? undefined,
deliveryExternalId: order.deliveryExternalId ?? undefined,
deliveryTrackingUrl: order.deliveryTrackingUrl ?? undefined,
dispatchStatus: order.deliveryDispatchStatus ?? undefined,
estimatedDeliveryAt: order.deliveryEstimatedAt ?? undefined,
deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : undefined,
```

Wait — the Prisma schema doesn't have `deliveryDispatchStatus`. We need to decide: add another column, OR reuse the existing `deliveryStatus` String? column to hold both the 3-state and 11-state values.

**Decision:** Reuse `deliveryStatus` column. It's `String?` (not an enum), so it can hold any value. Backend `order-actions.routes.ts` DELIVERY_TRANSITIONS only applies to manual status updates. DaaS webhook updates bypass that endpoint and write directly. In enrichment, map `deliveryStatus` to both `deliveryState` (coerced to 3-state) and `dispatchStatus` (raw value).

Updated enrichment logic:
```typescript
// Map granular dispatchStatus → simplified deliveryState
function toDeliveryState(status: string | null): string {
  if (!status) return 'PREPARING';
  const delivered = ['DELIVERED'];
  const outForDelivery = ['PICKED_UP', 'DRIVER_EN_ROUTE_TO_DROPOFF', 'DRIVER_AT_DROPOFF', 'OUT_FOR_DELIVERY'];
  if (delivered.includes(status)) return 'DELIVERED';
  if (outForDelivery.includes(status)) return 'OUT_FOR_DELIVERY';
  return 'PREPARING';
}

// In enrichOrderResponse:
deliveryState: toDeliveryState(order.deliveryStatus),
dispatchStatus: order.deliveryStatus ?? undefined,
```

This means we need the Prisma migration to add ONLY `deliveryExternalId`. The `deliveryStatus` column already exists and can hold the granular states.

**New files:**
- `src/services/delivery/delivery-provider.interface.ts` — Backend provider interface
- `src/services/delivery/doordash-drive.service.ts` — DoorDash Drive API v2 (JWT auth via jsonwebtoken)
- `src/services/delivery/uber-direct.service.ts` — Uber Direct API (OAuth2 token management)
- `src/services/delivery/delivery.service.ts` — Orchestrator: selects provider by type, delegates

Env vars: `DOORDASH_DEVELOPER_ID`, `DOORDASH_KEY_ID`, `DOORDASH_SIGNING_SECRET`, `UBER_CLIENT_ID`, `UBER_CLIENT_SECRET`, `UBER_CUSTOMER_ID`

### Step 9 — Backend delivery routes + webhooks

**New file:** `src/app/delivery.routes.ts`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/:restaurantId/delivery/config-status` | Check which providers have API keys configured |
| POST | `/:restaurantId/delivery/quote` | Request delivery quote |
| POST | `/:restaurantId/delivery/dispatch` | Accept quote, dispatch driver |
| POST | `/:restaurantId/delivery/cancel` | Cancel active delivery |
| GET | `/:restaurantId/delivery/status/:deliveryExternalId` | Get driver/delivery status |

Each route: validate request (Zod) → read restaurant settings → call delivery orchestrator → update Order Prisma fields → call `enrichOrderResponse()` → `broadcastToSourceAndKDS()` with `order:updated`

**New file:** `src/validators/delivery.validator.ts` — Zod schemas for quote/dispatch/cancel requests

**Modify:** `src/app/app.ts`:
- Mount delivery routes: `app.use('/api/restaurant', deliveryRoutes);`
- Add webhook routes BEFORE `express.json()`:

```typescript
// DoorDash DaaS webhook
app.post('/api/webhooks/doordash', express.raw({ type: 'application/json' }), async (req, res) => {
  // HMAC-SHA256 verify → parse → find Order by deliveryExternalId → update deliveryStatus + related fields → enrichOrderResponse → broadcastToSourceAndKDS('order:updated') + emit 'delivery:location_updated' if lat/lng present
});

// Uber Direct webhook
app.post('/api/webhooks/uber', express.raw({ type: 'application/json' }), async (req, res) => {
  // Uber signature verify → same flow
});
```

**DO NOT** broadcast `delivery:status_updated`. Use `order:updated` for state changes. Only emit `delivery:location_updated` for GPS coordinate pings (lightweight, no full order re-broadcast).

**Coexistence with `order-actions.routes.ts`:** The existing `PATCH /:orderId/delivery-status` endpoint (order-actions.routes.ts:22) uses 3-state `DELIVERY_TRANSITIONS` for manual self-delivery status changes. This endpoint continues to work for `provider='self'` or `provider='none'` orders. DaaS webhook updates bypass this endpoint entirely — they write directly to Prisma via the webhook handler. The `toDeliveryState()` mapper in `order-enrichment.ts` ensures both paths produce valid `deliveryState` values for the frontend.

**DaaS error handling:** Each delivery route and webhook handler must handle:
- **Quote expired:** If `quoteId` is older than `expiresAt`, return 410 Gone with message "Delivery quote expired, please request a new quote." Frontend clears `_currentQuote` and shows retry button.
- **Driver cancelled mid-delivery:** Webhook receives `CANCELLED` status → update order `deliveryStatus` to `CANCELLED`, clear driver fields, broadcast `order:updated`. Frontend shows "Driver cancelled — re-dispatch?" with new quote button.
- **Provider API unavailable:** Catch fetch errors in provider services → return 503 with `{ error: 'DoorDash/Uber API unavailable', retryAfter: 30 }`. Frontend shows error banner with retry countdown.
- **Dispatch failed after quote accepted:** Provider returns error on dispatch → return 502 with reason. Order stays in `QUOTED` state, frontend shows retry or cancel options.

**Delivery fee override logic:** `OnlinePricingSettings.deliveryFee` (settings.model.ts:29) stores a static restaurant-configured fee. When a DaaS provider returns a quote, the quote `fee` is written to the order's `deliveryFee` Prisma column, replacing any static fee. Self-delivery orders (`provider='self'`) always use the static fee from settings. The `order-enrichment.ts` output includes `deliveryInfo.deliveryFee` so the frontend always shows the correct fee regardless of source.

### Step 10 — Build + verify

- Frontend: `ng build get-order-stack-restaurant-frontend-elements` — zero errors
- Backend: `npm run lint && npm run build` — zero errors
- Verify: Control Panel → Delivery tab renders, settings save/load/persist
- Verify: Config status endpoint returns correct provider availability
- Verify: Online Portal delivery → quote shown → dispatch after payment → tracking section shows driver info
- Verify: KDS shows delivery provider badge + dispatch button when auto-dispatch OFF
- Verify: Self-delivery (provider='self') → existing 3-state flow unchanged, `PATCH /delivery-status` still works
- Verify: Backend webhooks update order → enriched response includes new fields → frontend updates via order:updated
- Verify: Quote expiry → 410 response → frontend retry flow
- Verify: Driver cancellation → CANCELLED status → frontend re-dispatch option

---

## Part 3: Corrected Plan — Phase 2 (Marketplace Inbound) — 6 Steps

### Step 11 — Backend Prisma migration

Add to `prisma/schema.prisma`:

```prisma
model MarketplaceOrder {
  id              String   @id @default(uuid())
  restaurantId    String   @map("restaurant_id")
  orderId         String?  @map("order_id")
  platform        String   // 'doordash' | 'ubereats' | 'grubhub'
  externalOrderId String   @map("external_order_id")
  rawPayload      Json     @map("raw_payload")
  status          String   @default("received")
  syncedAt        DateTime? @map("synced_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  order      Order?     @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@unique([platform, externalOrderId])
  @@map("marketplace_orders")
}

model MenuSync {
  id             String @id @default(uuid())
  restaurantId   String @map("restaurant_id")
  platform       String // 'doordash' | 'ubereats' | 'grubhub'
  menuItemId     String @map("menu_item_id")
  externalItemId String @map("external_item_id")
  externalName   String? @map("external_name")
  lastSyncedAt   DateTime? @map("last_synced_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  menuItem   MenuItem   @relation(fields: [menuItemId], references: [id], onDelete: Cascade)

  @@unique([restaurantId, platform, menuItemId])
  @@map("menu_sync")
}
```

Add relations to Restaurant, Order, MenuItem. Run migration.

### Step 12 — Backend marketplace provider services

- `src/services/marketplace/marketplace-provider.interface.ts` — Interface + `MarketplaceInboundOrder` normalized type
- `src/services/marketplace/doordash-merchant.service.ts` — DoorDash Merchant API
- `src/services/marketplace/ubereats.service.ts` — Uber Eats Orders API
- `src/services/marketplace/grubhub.service.ts` — Grubhub API (**CONDITIONAL** — marketplace API is invitation-only; skip unless partnership secured)
- `src/services/marketplace/order-mapper.service.ts` — Maps inbound → Prisma Order.create() using MenuSync lookups

### Step 13 — Backend marketplace webhooks + routes

Webhook routes BEFORE `express.json()`:
- `POST /api/webhooks/doordash-marketplace`
- `POST /api/webhooks/ubereats`
- `POST /api/webhooks/grubhub` (**CONDITIONAL** — only if Grubhub partnership secured)

Handler: verify → parse → map to Order → create MarketplaceOrder record → broadcast `order:new`

New: `src/app/menu-sync.routes.ts` — CRUD + "Push Menu" per platform

Modify: order status update logic — after status change, check for linked MarketplaceOrder → push status back to platform API

### Step 14 — Frontend KDS + order management marketplace indicators

**Modify (Frontend):** `lib/kds/order-card/` (ts, html, scss)
- `marketplaceBadge` computed signal from `order().orderSource` (e.g. `'marketplace_doordash'`)
- DoorDash (#ff3008), Uber Eats (#06c167), Grubhub (#f63440)

**Modify (Frontend):** `lib/orders/pending-orders/pending-orders.ts` — platform filter + badge
**Modify (Frontend):** `lib/orders/order-history/order-history.ts` — platform column + filter

### Step 15 — Frontend menu sync management UI

New: `lib/settings/menu-sync/` (4 files) — sub-component within Delivery settings tab

### Step 16 — Build + verify Phase 2

Same as Step 10 plus: webhook → KDS badge, status push-back, menu sync mapping

---

## Part 4: Strict Execution Prompt — Phase 1 DaaS

```
TASK: Implement Third-Party Delivery Integration Phase 1 (DaaS) for GetOrderStack.

WORKSPACE: /Users/jam/development/Get-Order-Stack-Restaurant-Frontend-Workspace
BACKEND: /Users/jam/development/Get-Order-Stack-Restaurant-Backend
LIBRARY ROOT: projects/get-order-stack-restaurant-frontend-library/src/

CONTEXT: GetOrderStack has complete in-house delivery (3-state workflow: PREPARING →
OUT_FOR_DELIVERY → DELIVERED). This adds DoorDash Drive and Uber Direct as delivery-as-a-service
providers. The existing PaymentProvider strategy pattern is reused for delivery providers.

=== CRITICAL CONSTRAINTS ===

1. DO NOT add flat delivery fields to Order interface (order.model.ts). Order already uses
   deliveryInfo?: DeliveryInfo from dining-option.model.ts. Extend DeliveryInfo instead.

2. DO NOT replace the existing 3-state deliveryState. Keep 'PREPARING' | 'OUT_FOR_DELIVERY' |
   'DELIVERED' on DeliveryInfo.deliveryState. Add a SEPARATE optional dispatchStatus field for
   the granular DaaS state.

3. DeliverySettings MUST go in settings.model.ts (alongside AISettings, PaymentSettings, etc.),
   NOT in delivery.model.ts. All settings follow this convention.

4. ControlPanelTab type is in printer.model.ts:3. Current value:
   'printers' | 'ai-settings' | 'online-pricing' | 'catering-calendar' | 'payments' | 'tip-management' | 'loyalty'
   Add 'delivery' as the 8th value.

5. DO NOT add delivery:status_updated socket event. Delivery state changes arrive via the
   existing order:updated event through enriched order responses. ONLY add
   delivery:location_updated for lightweight real-time GPS pings.

6. DO NOT add pollDeliveryStatus() timer to DeliveryService. Online order portal already polls
   order status every 15s. GPS comes via WebSocket push, not frontend polling.

7. Frontend delivery providers are PLAIN CLASSES (not Angular services). They use fetch() for
   HTTP, NOT HttpClient. They receive DeliveryContext via method params. They proxy ALL calls
   through our backend — frontend NEVER touches DoorDash/Uber APIs directly.

8. Backend Prisma schema already has: deliveryProvider, deliveryTrackingUrl, deliveryLat,
   deliveryLng, deliveryStatus (String?), deliveryEstimatedAt, dispatchedAt, deliveredAt,
   deliveryFee. Need ONE migration: add deliveryExternalId String? column.

9. Backend deliveryStatus column is String? (not enum). It can hold both 3-state manual values
   AND 11-state DaaS values. In order-enrichment.ts, map the raw value to BOTH
   deliveryInfo.deliveryState (coerced to 3-state) and deliveryInfo.dispatchStatus (raw value).

10. OnlinePricingSettings.deliveryFee (settings.model.ts:29) stores a static restaurant delivery
    fee. When a DaaS provider returns a quote, the quote fee REPLACES the static fee for that
    order. Self-delivery uses the static fee.

11. Backend order-enrichment.ts (src/utils/order-enrichment.ts) builds nested deliveryInfo from
    flat Prisma columns. It MUST be updated to include new DaaS fields (deliveryProvider,
    deliveryExternalId, deliveryTrackingUrl, dispatchStatus, estimatedDeliveryAt, deliveryFee).

12. Backend order-actions.routes.ts has existing PATCH /:orderId/delivery-status with 3-state
    DELIVERY_TRANSITIONS. This endpoint continues to work for self-delivery. DaaS webhooks
    bypass it entirely and write directly to Prisma.

13. Handle DaaS failures: quote expired (410 Gone), driver cancelled (CANCELLED status +
    re-dispatch option), provider API unavailable (503 with retryAfter), dispatch failed
    after quote (502, stay in QUOTED state).

14. Grubhub marketplace API is invitation-only. Phase 2 Grubhub integration is CONDITIONAL —
    skip unless partnership secured.

=== STEP 1: Frontend delivery models ===

CREATE: lib/models/delivery.model.ts
- DeliveryProviderType = 'doordash' | 'uber' | 'self' | 'none'
- DeliveryDispatchStatus = 11-state union: QUOTED | DISPATCH_REQUESTED | DRIVER_ASSIGNED |
  DRIVER_EN_ROUTE_TO_PICKUP | DRIVER_AT_PICKUP | PICKED_UP | DRIVER_EN_ROUTE_TO_DROPOFF |
  DRIVER_AT_DROPOFF | DELIVERED | CANCELLED | FAILED
- DeliveryQuote { provider, quoteId, fee, estimatedPickupAt, estimatedDeliveryAt, expiresAt }
- DeliveryDispatchResult { deliveryExternalId, trackingUrl, estimatedDeliveryAt }
- DeliveryDriverInfo { name?, phone?, photoUrl?, location?: {lat, lng}, estimatedDeliveryAt? }
- DeliveryContext { restaurantId, apiUrl }
- DeliveryProvider interface { type, requestQuote(), acceptQuote(), cancelDelivery(),
  getStatus(), destroy() }

MODIFY: lib/models/dining-option.model.ts
- Import DeliveryProviderType, DeliveryDispatchStatus from delivery.model
- Add to DeliveryInfo interface (all optional):
  deliveryProvider?: DeliveryProviderType
  deliveryExternalId?: string
  deliveryTrackingUrl?: string
  dispatchStatus?: DeliveryDispatchStatus
  estimatedDeliveryAt?: string
  deliveryFee?: number

MODIFY: lib/models/settings.model.ts
- Import DeliveryProviderType from delivery.model
- Add DeliverySettings interface { provider: DeliveryProviderType, autoDispatch: boolean,
  showQuotesToCustomer: boolean, defaultTipPercent: number }
- Add defaultDeliverySettings() factory: provider='none', autoDispatch=false,
  showQuotesToCustomer=true, defaultTipPercent=15

MODIFY: lib/models/printer.model.ts — add 'delivery' as 8th value to ControlPanelTab union
  (current: 'printers' | 'ai-settings' | 'online-pricing' | 'catering-calendar' | 'payments' | 'tip-management' | 'loyalty')
MODIFY: lib/models/index.ts — add delivery.model re-export

=== STEP 2: Frontend delivery providers ===

CREATE: lib/services/providers/doordash-provider.ts
- Plain class implementing DeliveryProvider interface
- readonly type = 'doordash' as const
- All methods use fetch() proxying through backend:
  requestQuote → POST {apiUrl}/restaurant/{restaurantId}/delivery/quote
  acceptQuote → POST {apiUrl}/restaurant/{restaurantId}/delivery/dispatch
  cancelDelivery → POST {apiUrl}/restaurant/{restaurantId}/delivery/cancel
  getStatus → GET {apiUrl}/restaurant/{restaurantId}/delivery/status/{deliveryExternalId}
- destroy() clears any stored state

CREATE: lib/services/providers/uber-provider.ts — identical structure, type = 'uber'

MODIFY: lib/services/providers/index.ts — add DoorDashDeliveryProvider, UberDeliveryProvider exports

Follow stripe-provider.ts as template.

=== STEP 3: Frontend DeliveryService ===

CREATE: lib/services/delivery.ts
- @Injectable({ providedIn: 'root' })
- Inject AuthService (restaurantId), RestaurantSettingsService
- Private provider: DeliveryProvider | null
- Signals: _providerType, _isProcessing, _error, _currentQuote, _driverInfo
- setProviderType(type) — switch to instantiate correct provider class
- isConfigured() — provider not null and type not 'none'/'self'
- requestQuote(orderId), acceptQuote(orderId, quoteId), cancelDelivery(orderId, deliveryExternalId),
  getDeliveryStatus(orderId, deliveryExternalId)
- updateDriverInfo(info: DeliveryDriverInfo) — called by socket listener
- reset() — destroy provider, clear signals
- DO NOT add pollDeliveryStatus() — no frontend polling for delivery

Follow payment.ts as template.

=== STEP 4: Frontend delivery settings UI ===

CREATE: lib/settings/delivery-settings/ (ts, html, scss, index.ts)
- selector: 'get-order-stack-delivery-settings'
- Follow payment-settings/ as template
- Radio buttons: None / DoorDash Drive / Uber Direct / Self (in-house)
- When provider not 'none': show checkboxes + tip input
  - "Auto-dispatch when order is ready for pickup"
  - "Show delivery fee quotes to online customers"
  - "Default driver tip: [number]%"
- API key status: GET /delivery/config-status → show green/red dot per provider
- isDirty computed, Save/Discard buttons

MODIFY: lib/services/restaurant-settings.ts
- Import DeliverySettings, defaultDeliverySettings from settings.model
- Add _deliverySettings signal + deliverySettings readonly
- Add saveDeliverySettings() — same pattern as savePaymentSettings()
- Add delivery to loadSettings() merge chain

MODIFY: lib/settings/control-panel/control-panel.ts
- Import DeliverySettingsComponent
- Add { key: 'delivery', label: 'Delivery' } to tabs array

MODIFY: lib/settings/control-panel/control-panel.html
- Add @if (activeTab() === 'delivery') { <get-order-stack-delivery-settings /> }

=== STEP 5: Frontend checkout + online portal ===

MODIFY: lib/sos/checkout-modal/checkout-modal.ts
- Inject DeliveryService + RestaurantSettingsService
- After order creation, if diningType === 'delivery' && deliveryService.isConfigured():
  - requestQuote(orderId) → show fee + ETA in a delivery-quote section
  - If autoDispatch ON: auto-call acceptQuote()
  - If OFF: show "Dispatch Driver ($X.XX)" button
- If provider is 'self' or 'none': existing flow unchanged

MODIFY: lib/online-ordering/online-order-portal/ (ts, html, scss)
- Inject DeliveryService
- On delivery orders with DaaS configured:
  - After address entered: requestQuote() → show fee + ETA on info step
  - If showQuotesToCustomer ON: display "Delivery: $X.XX (est. ~30 min)"
  - If OFF: show "Delivery fee: calculated at checkout"
  - On confirm step: show driver tracking section with name/phone/ETA/tracking link
  - Existing 15s order polling picks up delivery state changes — no separate poll

=== STEP 6: Frontend KDS integration ===

MODIFY: lib/kds/order-card/ (ts, html, scss)
- deliveryProviderLabel computed from order().deliveryInfo?.deliveryProvider
- dispatchStatusLabel computed: maps dispatchStatus to human text
- Provider badge in header (DoorDash: bg #ff3008, Uber: bg #000)
- ETA countdown when driver en route
- "Dispatch ($X)" button — emits dispatchDriver output event

MODIFY: lib/kds/kds-display/kds-display.ts
- Inject DeliveryService + RestaurantSettingsService
- dispatchDriver(orderId) method: requestQuote → acceptQuote
- Auto-dispatch: when order hits READY_FOR_PICKUP and settings.autoDispatch is true
  → auto-call dispatchDriver()
- When autoDispatch OFF: order card shows Dispatch button

=== STEP 7: Frontend socket + order mapping ===

MODIFY: lib/services/socket.ts
- Add listener for 'delivery:location_updated' event ONLY
- On receive: update DeliveryService._driverInfo signal with { lat, lng, estimatedDeliveryAt }

MODIFY: lib/services/order.ts — extend mapOrder() delivery section:
- Map from enriched response: deliveryProvider, deliveryExternalId, deliveryTrackingUrl,
  dispatchStatus, estimatedDeliveryAt, deliveryFee → into deliveryInfo object

MODIFY: public-api.ts
- Export DeliveryService, DoorDashDeliveryProvider, UberDeliveryProvider
- Export all types from delivery.model.ts
- Export DeliverySettings, defaultDeliverySettings

=== STEP 8: Backend delivery services ===

MIGRATION: Add to prisma/schema.prisma Order model:
  deliveryExternalId String? @map("delivery_external_id")
Run: npx prisma migrate dev --name add-delivery-external-id

MODIFY: src/utils/order-enrichment.ts — CRITICAL (Issue #13)
- Add toDeliveryState() helper that maps granular status → 3-state:
  DELIVERED → 'DELIVERED'
  PICKED_UP, DRIVER_EN_ROUTE_TO_DROPOFF, DRIVER_AT_DROPOFF, OUT_FOR_DELIVERY → 'OUT_FOR_DELIVERY'
  Everything else → 'PREPARING'
- In deliveryInfo block add: deliveryProvider, deliveryExternalId, deliveryTrackingUrl,
  dispatchStatus (raw deliveryStatus), estimatedDeliveryAt, deliveryFee
- Change deliveryState to use toDeliveryState(order.deliveryStatus)
- Also add: deliveryLat/deliveryLng for GPS fields (already in Prisma schema)

NOTE: order-actions.routes.ts PATCH /:orderId/delivery-status (Issue #14) continues to work
for self-delivery with its 3-state DELIVERY_TRANSITIONS. DaaS webhooks bypass that endpoint
and write directly to Prisma. Both paths produce valid enriched responses.

CREATE: src/services/delivery/delivery-provider.interface.ts
CREATE: src/services/delivery/doordash-drive.service.ts — DoorDash Drive v2: JWT auth, quote,
  dispatch, cancel, status, webhook signature verify
CREATE: src/services/delivery/uber-direct.service.ts — Uber Direct: OAuth2, same methods
CREATE: src/services/delivery/delivery.service.ts — Orchestrator, selects provider by type

Env vars: DOORDASH_DEVELOPER_ID, DOORDASH_KEY_ID, DOORDASH_SIGNING_SECRET,
UBER_CLIENT_ID, UBER_CLIENT_SECRET, UBER_CUSTOMER_ID

=== STEP 9: Backend delivery routes + webhooks ===

CREATE: src/app/delivery.routes.ts
  GET  /:restaurantId/delivery/config-status — returns { doordash: boolean, uber: boolean }
  POST /:restaurantId/delivery/quote — { orderId, provider } → DeliveryQuote
  POST /:restaurantId/delivery/dispatch — { orderId, quoteId } → DeliveryDispatchResult
  POST /:restaurantId/delivery/cancel — { orderId, deliveryExternalId } → { success }
  GET  /:restaurantId/delivery/status/:deliveryExternalId → DeliveryDriverInfo

Each route: Zod validate → call delivery orchestrator → update Order Prisma fields
→ enrichOrderResponse → broadcastToSourceAndKDS('order:updated')

Error responses (Issue #12):
- Quote expired: 410 Gone { error: 'Delivery quote expired', retryable: true }
- Provider API down: 503 { error: 'Provider unavailable', retryAfter: 30 }
- Dispatch failed: 502 { error: reason, state: 'QUOTED' }
- Driver cancelled: webhook writes CANCELLED → order:updated broadcast

CREATE: src/validators/delivery.validator.ts — Zod schemas

MODIFY: src/app/app.ts
- Mount: app.use('/api/restaurant', deliveryRoutes)
- Add BEFORE express.json():
  POST /api/webhooks/doordash — express.raw, HMAC-SHA256 verify, find Order by
    deliveryExternalId, update Prisma, enrich, broadcast order:updated, emit
    delivery:location_updated if lat/lng present
  POST /api/webhooks/uber — same pattern, Uber signature verify

=== STEP 10: Build + verify ===

Frontend: ng build get-order-stack-restaurant-frontend-elements — zero errors
Backend: npm run lint && npm run build — zero errors

Verify checklist:
- Control Panel → Delivery tab renders with all controls
- Settings save to localStorage + backend, survive page reload
- Config status shows green/red per provider key availability
- Online Portal delivery order → quote fee/ETA displayed → dispatch after payment → tracking shows
- KDS shows provider badge, ETA, dispatch button (when auto-dispatch OFF)
- Auto-dispatch: toggle ON → READY_FOR_PICKUP triggers auto-dispatch
- Self-delivery: provider='self' → existing 3-state flow unchanged, no DaaS involvement
- Backend webhooks update order → enriched response includes driver fields → frontend updates

=== FILES SUMMARY ===

NEW (frontend — 10 files):
  lib/models/delivery.model.ts
  lib/services/delivery.ts
  lib/services/providers/doordash-provider.ts
  lib/services/providers/uber-provider.ts
  lib/settings/delivery-settings/delivery-settings.ts
  lib/settings/delivery-settings/delivery-settings.html
  lib/settings/delivery-settings/delivery-settings.scss
  lib/settings/delivery-settings/index.ts

NEW (backend — 6 files):
  src/services/delivery/delivery-provider.interface.ts
  src/services/delivery/doordash-drive.service.ts
  src/services/delivery/uber-direct.service.ts
  src/services/delivery/delivery.service.ts
  src/app/delivery.routes.ts
  src/validators/delivery.validator.ts

MODIFIED (frontend — 14 files):
  lib/models/dining-option.model.ts (extend DeliveryInfo with DaaS fields)
  lib/models/settings.model.ts (add DeliverySettings + defaultDeliverySettings)
  lib/models/printer.model.ts (add 'delivery' as 8th ControlPanelTab value)
  lib/models/index.ts (add delivery.model re-export)
  lib/services/order.ts (extend mapOrder with delivery fields)
  lib/services/socket.ts (add delivery:location_updated listener)
  lib/services/restaurant-settings.ts (add _deliverySettings signal + save)
  lib/services/providers/index.ts (add delivery provider exports)
  lib/settings/control-panel/control-panel.ts (add Delivery tab)
  lib/settings/control-panel/control-panel.html (add @if block)
  lib/sos/checkout-modal/checkout-modal.ts (add DaaS dispatch flow)
  lib/online-ordering/online-order-portal/ (ts, html, scss — quote + tracking)
  lib/kds/order-card/ (ts, html, scss — provider badge + dispatch)
  lib/kds/kds-display/kds-display.ts (dispatchDriver method)
  public-api.ts (exports)

MODIFIED (backend — 3 files):
  prisma/schema.prisma (add deliveryExternalId column)
  src/utils/order-enrichment.ts (add DaaS fields + toDeliveryState mapper + GPS fields)
  src/app/app.ts (mount delivery routes + webhook endpoints)
```

---

## Verification

1. Control Panel → Delivery tab saves/loads settings correctly
2. DaaS flow: Online Portal → delivery order → quote shown with fee/ETA → payment → driver dispatched → KDS shows driver badge → tracking on confirm step
3. Auto-dispatch: Toggle on → order hits READY_FOR_PICKUP → driver auto-dispatched
4. Self-delivery: Provider = "Self" → existing manual 3-state flow unchanged
5. Backend webhooks → order:updated broadcast → frontend reflects driver status
6. GPS location updates arrive via delivery:location_updated WebSocket event
7. Build: Frontend `ng build` + Backend `npm run build && npm run lint` — zero errors
