# Get-Order-Stack AI Feature Roadmap — Toast POS Competitor

> **This is the production roadmap for getorderstack.com.**

## Context

Get-Order-Stack is a restaurant operating system built to compete with Toast, Square, Clover POS. The **backend already has significant AI features built with Claude Sonnet 4** (cost estimation, menu engineering, sales insights, inventory predictions, order profit analysis). The frontend now surfaces all four tiers of features (T1–T4 complete). The system is deployed via WordPress at geekatyourspot.com with 18 feature pages.

**Foundational Capabilities:** Dining Options (dine-in, takeout, curbside, delivery, catering) fully implemented with frontend workflows (Session 11) and production-ready backend validation via Zod (Session 12). Query filtering supports delivery status tracking and catering approval workflows. Control Panel fully implemented with 8 tabs: Printers, AI Settings, Online Pricing, Catering Calendar, Payments, Tip Management, Loyalty, Delivery (Sessions 13, 18, 19, 20, 22). Course System UI implemented in PendingOrders (grouped items, fire status badges, manual fire controls) and OrderNotifications (course-ready audio chime + desktop alerts) (Session 13). Duplicate notification bug fixed (Session 14). Course Pacing Mode Selector complete (Session 15) — replaced boolean toggle with 3-way `CoursePacingMode` dropdown (disabled/server_fires/auto_fire_timed) that persists from AI Settings → KDS → PendingOrders with operator override. KDS Recall Ticket complete (Session 15) — backward status transitions with print status cleanup. Course pacing backend execution complete (Session 24) — backend now persists per-item course state and exposes `/:restaurantId/orders/:orderId/fire-course` + `/:restaurantId/orders/:orderId/fire-item`; deployment on Render verified with live JSON responses. Course pacing target gap configuration is now full-stack (Session 25) — `aiSettings.targetCourseServeGapSeconds` is editable in Control Panel AI Settings, validated on backend (300-3600), and persisted in deployed backend (`ae9b232`). Advanced AI timing optimization remains pending. Catering Approval Timeout complete (Session 16) — configurable auto-reject timer with countdown UI in PendingOrders and AI Settings panel. Offline Mode complete (Session 16) — localStorage order queue with auto-sync on reconnect, CheckoutModal routes through OrderService, PendingOrders shows "Queued" badge with disabled actions for offline orders. Expo Station complete (Session 17) — local verification layer in KDS with 4-column layout, AI Settings toggle + KDS header override, expo check triggers print, toggle-off safety prints unchecked orders. PayPal Zettle integration complete (Session 18 frontend, Session 19 backend) — provider-based payment abstraction (`PaymentProvider` interface), PayPal recommended + Stripe fallback, restaurant selects processor via Payments tab in Control Panel. Backend PayPal endpoints complete: `/paypal-create`, `/paypal-capture`, PayPal webhook handler, and shared routes (`/payment-status`, `/cancel-payment`, `/refund`) made processor-agnostic (Session 19). Tip Pooling & Tip-Out Rules complete (Session 19) — TipService reactive computation engine, TipManagement 4-tab dashboard (reports, pool rules, tip-out rules, compliance) in Control Panel 6th tab, CSV payroll export, minimum wage compliance checking. Loyalty Program complete (Session 20) — full-stack: backend Prisma models (LoyaltyTransaction, LoyaltyReward, RestaurantLoyaltyConfig) + 10 REST endpoints + Zod validators; frontend LoyaltyService + LoyaltySettings/RewardsManagement in Control Panel 7th tab + loyalty integration in Checkout, Online Portal, CRM, and Order History. Third-Party Delivery Phase 1 (DaaS) complete (Session 22) — DoorDash Drive + Uber Direct via `DeliveryProvider` interface (mirrors PaymentProvider pattern), `DeliveryService` orchestrator, delivery settings in Control Panel 8th tab, KDS auto-dispatch on READY_FOR_PICKUP, backend delivery.service.ts with quote/accept/cancel/status/webhook handler, DoorDash + Uber webhook handlers with HMAC signature verification. Backend deployment verified on Render in Session 23 (`/delivery/config-status` live; provider keys pending).

This plan maps every AI integration opportunity across all restaurant operations domains, organized by implementation effort.

---

## Competitive Analysis: Technology Stacks

### Why Angular Elements / Web Components — Not React Native

Research into what the 8 major restaurant POS competitors actually use confirms that **React Native is unnecessary** for Get-Order-Stack's use case. The system is a web-based ordering platform embedded in WordPress via Angular Elements — exactly the scenario where web technologies excel.

### Competitor Tech Stacks (February 2026)

| Competitor | Core Platform | Mobile Tech | KDS | Customer Ordering |
|---|---|---|---|---|
| **Toast** | Android-native (custom OS) | Native Android | Android tablets | Web-based |
| **Square** | Hybrid iOS/Android | Native apps | Android + iPad | Web + native apps |
| **Clover** | Android-native (custom OS) | Native Android + REST API | Android | Web apps via REST |
| **SpotOn** | Cloud-based | Native iOS/Android ("GoTo Place") | Included in plan | Web + app |
| **TouchBistro** | iOS-native (iPad only) | **Migrating to React Native** | iPad | Web-based |
| **Lightspeed** | iPad + cloud | Native iOS | **Any web browser** | Web-based |
| **ChowNow** | Web (**React**) | Branded native apps | N/A | React web |
| **Olo** | Enterprise SaaS | React-based | N/A | Web-based |

### Key Findings

1. **No major competitor uses Web Components** — this is a differentiation opportunity, not a weakness
2. **React Native is only used by TouchBistro** (migrating from native iOS) — and only for their staff-facing iPad POS, not customer ordering
3. **Customer-facing ordering is universally web-based** — Toast, Lightspeed, ChowNow, and Olo all use web technologies for customer ordering
4. **KDS splits between native (Toast, Square) and web (Lightspeed)** — Lightspeed proves browser-based KDS is viable
5. **React Native's advantage is hardware integration** — receipt printers (StarXpand SDK), NFC readers, Bluetooth peripherals, cash drawers — none of which apply to a web-first SaaS product

### When React Native Would Make Sense (Future, Not Now)

React Native becomes relevant only if Get-Order-Stack builds a **dedicated staff-facing POS app** requiring:
- **Bluetooth portable printer integration** for delivery drivers (StarXpand SDK for React Native with Star SM-L200) — in-restaurant receipt stations are fully handled by Star CloudPRNT from the backend, no React Native needed
- NFC card reader support
- Cash drawer triggers
- Offline-first with SQLite (no network = still processing orders)
- App Store distribution for branded restaurant apps

That's a separate product from the web-based Angular Elements platform and would be a Tier 5+ consideration. Note: receipt printing for in-restaurant use does **not** require React Native — see the Receipt Printing Architecture section below.

### Get-Order-Stack's Web Components Advantage

| Strength | Why It Matters |
|---|---|
| No app download required | Lower friction for customers vs. Toast's branded app |
| SEO-discoverable ordering pages | Web-based menus index in Google; native apps don't |
| Instant updates (no App Store review) | Deploy bug fixes in minutes, not days |
| Runs on any device with a browser | No Android/iOS lock-in like Toast (Android-only) or TouchBistro (iPad-only) |
| WordPress integration via `wp_enqueue_script_module()` | Proven multi-bundle scope isolation on production site |
| Single codebase for all platforms | vs. Toast maintaining separate Android codebases per product |

### Trade-off Matrix

| Approach | Dev Cost | Performance | Hardware Access | Offline | Maintenance |
|---|---|---|---|---|---|
| **Native (iOS/Android)** | Highest | Best | Full | Excellent | 2 codebases |
| **React Native** | Medium-High | Near-native | Excellent | Excellent | 1 codebase |
| **PWA / Web Components** | Lowest | Good | Limited | Good | 1 codebase |

**Verdict:** Angular Elements / Web Components is the correct architecture for a web-embedded restaurant ordering platform. The competitors that use React Native or native apps do so for hardware-integrated staff POS — a different product category entirely.

### Receipt Printing Architecture

A critical staff workflow — **Order Ready → Receipt Print → Deliver to Customer** — requires receipt printer integration. Research into browser-based printing APIs reveals that **the solution is entirely backend-driven**, reinforcing the Angular Elements architecture.

#### Browser Printing API Support Matrix

| Technology | Chrome | Safari/iPad | Firefox | How It Works | Verdict |
|---|---|---|---|---|---|
| **Web Serial API** | Yes | No | No | Direct USB/serial connection | Chromium-only — unusable |
| **Web USB API** | Yes | No | No | USB device access from browser | Chromium-only — unusable |
| **Web Bluetooth API** | Yes | No | No | Bluetooth device access | Chromium-only — unusable |
| **Star CloudPRNT** | N/A | N/A | N/A | Printer polls cloud server | **Works on all devices** |
| **Epson ePOS SDK** | Yes | Yes | Yes | Network printer via WebSocket | Works on LAN only |
| **QZ Tray** | Yes | Yes | Yes | Desktop middleware agent | Requires local install |

#### Key Finding: Browser Hardware APIs Are Chromium-Only

Web Serial, Web USB, and Web Bluetooth **do not work on Safari/iPad** — the primary tablet used in restaurants. Any solution relying on browser-to-hardware communication breaks on the most common restaurant device. This eliminates all client-side printing approaches for production use.

#### Recommended: Star CloudPRNT (Backend-Triggered)

**Star CloudPRNT** is the correct architecture for Get-Order-Stack:

1. **How it works:** The Star printer polls a cloud endpoint (our backend) every few seconds. When an order is marked "Ready," the backend queues a print job. The printer picks it up on its next poll — no browser involvement at all.
2. **Why it's ideal:**
   - Works with **any browser on any device** — the frontend just changes order status
   - No hardware APIs, no drivers, no browser compatibility issues
   - The frontend only needs a "Printing..." status indicator
   - Supported by Star's entire CloudPRNT-compatible lineup
3. **CloudPRNT Next (2025):** Uses MQTT instead of HTTP polling for sub-second print delivery. Same backend integration pattern, faster response.

**Supported Star Printers:**
- **mC-Print3** (80mm, recommended — CloudPRNT built-in, ethernet + USB + Bluetooth)
- **mC-Print2** (58mm, compact receipt)
- **TSP654II** (CloudPRNT via ethernet)
- **TSP743II** (wide format, kitchen use)
- **TSP847II** (extra-wide, detailed receipts)

#### Secondary: Epson ePOS SDK (On-Premise Network)

For restaurants that want on-premise printing without cloud dependency:
- Epson ePOS SDK connects to network printers via WebSocket from the browser
- Works on all browsers (including Safari/iPad) when printer is on the same LAN
- No cloud polling — direct browser-to-printer over local network
- Requires Epson TM-series printers with ePOS support

#### Order Ready → Receipt Print Workflow

```
Staff clicks "Ready" in KDS/PendingOrders
        │
        ▼
Frontend: PATCH /orders/:id/status { status: 'ready' }
        │
        ▼
Backend: Update order status + queue print job
        │
        ├──► Star CloudPRNT: Printer polls backend, picks up job
        │    (works everywhere, 2-5 second delay, sub-second with MQTT)
        │
        └──► Epson ePOS: Backend sends to printer via LAN WebSocket
             (on-premise only, instant)
        │
        ▼
Frontend: WebSocket event → show "Printing..." badge on order card
        │
        ▼
Staff picks up printed receipt + food → delivers to customer
```

#### When React Native IS Actually Needed for Printing

React Native is **only** needed for one specific scenario: **mobile delivery drivers using Bluetooth portable printers** (e.g., Star SM-L200 via StarXpand SDK). This is a Tier 5+ consideration for a dedicated delivery driver app — completely separate from in-restaurant receipt stations, which are fully handled by CloudPRNT from the backend.

---

## WordPress Multi-Page Distribution

> **STATUS: COMPLETE** — Deployed in Session 9. All 18 feature pages are live.

The original expansion plan (taipa-*-demo slugs) was superseded by the production deployment using `orderstack-*` slugs. See `CLAUDE.md` Session 9 notes for the full page template table. 23 custom elements are registered in `main.ts`, with `functions.php` loading the bundle conditionally on all 18 OrderStack pages.

### Build & Deploy Workflow

```bash
# 1. Build in this workspace
ng build get-order-stack-restaurant-frontend-elements

# 2. Copy to Geek dist
cp dist/get-order-stack-restaurant-frontend-elements/browser/{main.js,styles.css} \
   /Users/jam/development/geek-at-your-spot-workspace/dist/geek-at-your-spot-elements/browser/get-order-stack-elements/

# 3. FTP upload
```

One bundle serves all OrderStack pages. New custom elements are available on any page that includes the `<script type="module">` tag.

---

## Domain Map

| Domain | Current State | AI Priority |
|--------|--------------|-------------|
| Self-Order System (SOS) | ✅ Built (menu, cart, checkout, upsell, voice) | Complete |
| Kitchen Display (KDS) | ✅ Built (prep times, rush, recall, course pacing UI + backend fire execution, expo station) | Complete |
| Order Management | ✅ Built (pending, history, receipt, profit, offline queue) | Complete |
| Menu Management | ✅ Built (CRUD, AI cost estimation, AI descriptions) | Complete |
| Inventory | ✅ Built (dashboard, alerts, predictions, stock actions) | Complete |
| Analytics/Reporting | ✅ Built (menu engineering, sales, command center) | Complete |
| Payments | ✅ Built (PayPal Zettle + Stripe provider pattern, refunds, payment badges) | Complete |
| Table Management | ✅ Built (floor plan, drag-and-drop, status management) | Complete |
| Customer/CRM | ✅ Built (dashboard, segments, search, detail panel) | Complete |
| Staff/Scheduling | PIN auth only | 📋 PLANNED (T3-03 deferred) |
| Third-Party Delivery | ✅ DaaS Phase 1 complete (DoorDash Drive + Uber Direct, KDS dispatch, webhooks, deployed backend routes) | 🚧 Marketplace inbound (Phase 2) in progress (backend ingestion foundation complete) |
| Reservations | ✅ Built (manager, booking, status workflow) | Complete |
| Online Ordering | ✅ Built (customer portal, 4-step flow, order tracking) | Complete |
| Marketing/Loyalty | ✅ Built (loyalty config, tiers, rewards CRUD, points earn/redeem, phone lookup) | Complete |
| Settings | ✅ Built (Control Panel: printers, AI settings, online pricing, catering calendar, payments, tip management, loyalty, delivery) | Complete |
| Monitoring | ✅ Built (autonomous agent, anomaly rules, alert feed) | Complete |
| Voice Ordering | ✅ Built (Web Speech API, bilingual EN/ES, fuzzy match) | Complete |
| Dynamic Pricing | ✅ Built (rules engine, time-based, price preview) | Complete |
| Waste Reduction | ✅ Built (waste log, analysis, AI recommendations) | Complete |
| Sentiment Analysis | ✅ Built (NLP, keyword scoring, flag categories) | Complete |

---

## TIER 1: Surface What's Already Built — ✅ COMPLETE (8/8)

> All 8 features fully implemented (Sessions 2-5, 11-13). T1-01 through T1-07: backend ready, zero backend work needed. T1-08: complete (frontend Session 11, backend phases 1-6 Session 12, phases 7-8 Session 12). Control Panel expanded with AI Settings, Online Pricing, and Catering Calendar tabs (Session 13).

### T1-01. AI-Powered Cart-Aware Upsell Bar
**Domain:** SOS / Menu Engineering
**What:** Replace static `popularItems` with the live `GET /analytics/upsell-suggestions?cartItems=id1,id2` endpoint that returns high-margin items with `reason` and `suggestedScript` based on what's in the cart.
**Backend:** READY
**Frontend:** Create `AnalyticsService`, modify `SosTerminal` line 50 to call it reactively on cart changes (debounced), update `UpsellBar` to show reason text.
**Impact:** Cart-aware suggestions are 3-5x more effective than static lists. Each upsell adds $2-5 profit.

### T1-02. Menu Engineering Dashboard (Stars/Cash Cows/Puzzles/Dogs)
**Domain:** Analytics
**What:** New `menu-engineering-dashboard` component showing quadrant scatter plot, sortable item table with classification badges, AI insights panel (4-6 actionable recommendations), and upsell staff scripts.
**Backend:** READY — `GET /analytics/menu-engineering?days=30`
**Frontend:** New component in `lib/analytics/menu-engineering-dashboard/`, add "Analytics" nav to SOS Terminal drawer, register as custom element.
**Impact:** Core Toast IQ competitor. A single price adjustment on a Puzzle item can add thousands in annual profit.

### T1-03. Sales Insights Dashboard (Daily/Weekly AI Reports)
**Domain:** Analytics
**What:** New `sales-dashboard` with daily/weekly toggle, KPI tiles with comparison arrows, color-coded insight cards, AI recommendations panel, peak hours bar chart, top sellers lists.
**Backend:** READY — `GET /analytics/sales/daily`, `/weekly`, `/summary`
**Frontend:** New component in `lib/analytics/sales-dashboard/`, date picker for custom range.
**Impact:** Daily actionable intelligence. Catches revenue drops same-day. This is the "For You" feed for Toast IQ.

### T1-04. Order Profit Insights (Staff-Facing)
**Domain:** Orders
**What:** Show profit margin, star item, insightText, and quickTip after each order is placed. Add profit badges to order history. Running averages dashboard.
**Backend:** READY — `OrderService.getProfitInsight()` already exists in frontend (line 187) but is **never called**.
**Frontend:** Call it in `CheckoutModal` after submit, add profit badge to `PendingOrders`/`OrderHistory` cards.
**Impact:** Staff awareness of margins improves upselling behavior. 5-15% margin improvement documented.

### T1-05. Inventory Management Dashboard
**Domain:** Inventory
**What:** Full inventory UI — item list with stock levels, stock adjustment modal, AI-powered alerts (low/out/overstock), days-until-empty predictions, reorder recommendations.
**Backend:** READY — Full CRUD + `GET /inventory/alerts`, `/predictions`, `/report`
**Frontend:** New `InventoryService`, new `lib/inventory/` directory with 4-5 components, add to SOS Terminal nav.
**Impact:** Eliminates out-of-stock surprises. Reduces food waste from over-ordering. Saves 30-60 min per ordering session.

### T1-06. AI Cost Estimation in Menu Item Management
**Domain:** Menu Management
**What:** Add "AI Estimate Cost" and "Generate English Description" buttons to item management. Show `aiEstimatedCost`, `aiSuggestedPrice`, `aiProfitMargin`, `aiConfidence` inline. Batch estimation for all items.
**Backend:** READY — `POST /menu/items/:id/estimate-cost`, `/generate-description`, `/estimate-all-costs`, `/generate-all-descriptions`
**Frontend:** Add methods to `MenuService`, add buttons and AI data display to `ItemManagement` form.
**Impact:** Most restaurants have no idea what their food cost is. Instant visibility into margins per item.

### T1-07. Payment Integration (PayPal Zettle + Stripe)
**Domain:** Payments
**Status:** ✅ COMPLETE (Session 5 Stripe, Session 18 PayPal frontend, Session 19 PayPal backend)
**What:** Processor-agnostic payment system with `PaymentProvider` interface. PayPal Zettle (recommended, lowest fees) and Stripe (fallback) as provider implementations. Restaurants select their processor in Control Panel → Payments tab. Card input, payment confirmation, refund capability in order management.
**Backend:** ✅ COMPLETE — Stripe endpoints + PayPal endpoints (`/paypal-create`, `/paypal-capture`, webhook). Shared routes (`/payment-status`, `/cancel-payment`, `/refund`) are processor-agnostic, detecting Stripe vs PayPal automatically. `paypal.service.ts` mirrors `stripe.service.ts` pattern with token caching, idempotent order creation, and capture ID extraction for refunds.
**Frontend:** `PaymentService` orchestrator delegates to `StripePaymentProvider` or `PayPalPaymentProvider` plain classes. PayPal buttons auto-confirm; Stripe requires explicit Pay button. `PaymentSettingsComponent` in Control Panel for processor selection.
**Impact:** Without this, the system cannot process real transactions. PayPal Zettle saves ~$3K/year vs Stripe on $80K/month volume.

#### Backend Endpoints

| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| POST | `/restaurant/:id/orders/:orderId/payment-intent` | None | `{ clientSecret, paymentIntentId }` | ✅ READY |
| GET | `/restaurant/:id/orders/:orderId/payment-status` | None | `{ orderId, orderNumber, paymentStatus, paymentMethod, total, processorData }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/cancel-payment` | None | `{ success, message }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/refund` | `{ amount?: number }` | `{ success, refundId, amount, status }` | ✅ READY |
| POST | `/api/webhooks/stripe` | Stripe webhook payload | `{ received: true }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/paypal-create` | `{}` | `{ paypalOrderId }` | ✅ READY |
| POST | `/restaurant/:id/orders/:orderId/paypal-capture` | `{}` | `{ success }` | ✅ READY |
| POST | `/api/webhooks/paypal` | PayPal webhook payload | `{ received: true }` | ✅ READY |

Payment statuses: `pending`, `paid`, `failed`, `cancelled`, `partial_refund`, `refunded`

### T1-08. Receipt Printing via Star CloudPRNT
**Domain:** Orders / KDS
**Status:** ✅ COMPLETE (Sessions 11-12)
**What:** When staff marks an order "Ready" in KDS or PendingOrders, the backend queues a print job via Star CloudPRNT API. The CloudPRNT-compatible printer polls the backend and picks up the job — no browser hardware APIs needed, works on any device including iPad/Safari.
**Backend:** ✅ COMPLETE (8/8 phases) — Prisma schema, DTOs, Star Line Mode utility, CloudPrntService + PrinterService (singleton pattern), CloudPRNT protocol routes, order status integration, WebSocket print events (`order:printed`, `order:print_failed`), background stale job cleanup (every 10 min).
**Frontend:** ✅ COMPLETE — PrinterSettings UI with CRUD, CloudPRNT config display, MAC validation, test print. ControlPanel shell with Printers tab. PrinterService with 5 methods. Registered `get-order-stack-control-panel` custom element (23 total).
**Hardware:** Star CloudPRNT-compatible printer (mC-Print3 recommended — 80mm thermal, ethernet + USB + Bluetooth, CloudPRNT built-in). CloudPRNT Next (MQTT) supported for sub-second delivery.
**Impact:** Completes the staff order fulfillment workflow. Without receipt printing, "Order Ready" is a dead end — staff has no physical ticket to deliver with the food. Pairs naturally with T1-07 (Stripe) since payment + receipt go together.

---

## TIER 2: Enhance Existing Features with AI — COMPLETE (5/6)

> T2-01, T2-02, T2-03, T2-05, T2-06 complete (Sessions 6-7). T2-04 deferred (no backend endpoints).

### T2-01. Smart KDS with Prep Time Predictions & Station Routing
**Domain:** KDS
**Status:** ✅ COMPLETE (prep time + rush + recall ticket + course pacing + expo station)
**What:** Show estimated prep time countdown on order cards, color escalation (green/amber/red by time), route items to kitchen stations, add station filter to KDS header, "Rush" button. Expo Station adds a 4th KDS column for expediter verification before printing/serving.
**Backend:** PARTIAL — `prepTimeMinutes` and `Station` model exist. Course pacing execution endpoints are live (`PATCH /:restaurantId/orders/:orderId/fire-course`, `PATCH /:restaurantId/orders/:orderId/fire-item`, Session 24). Course pacing target gap is now persisted/validated in `aiSettings.targetCourseServeGapSeconds` (Session 25, deployed). Prep estimate endpoint and station-category mapping remain pending.
**Frontend:** Prep time countdown with color escalation from MenuItem.prepTimeMinutes. Rush priority toggle. KDS stats header (active/overdue/avg wait). Recall ticket (backward status transitions). Course pacing mode from AI Settings with operator override. Auto-fire timing now consumes AI Settings target gap (`targetCourseServeGapSeconds`) with adaptive delay heuristics. Expo Station: local verification layer on READY_FOR_PICKUP orders — 4-column grid (NEW/COOKING/EXPO/READY), expo check triggers print, toggle-off safety prints unchecked orders, AI Settings + KDS header toggles with override pattern. Station routing deferred until backend station-category mapping is built.
**Impact:** Station routing cuts ticket times 15-20%. Expo verification prevents incorrect plates reaching customers.

### T2-02. Intelligent 86 System (Auto-86 from Inventory)
**Domain:** Menu / Inventory
**Status:** ✅ COMPLETE
**What:** When inventory drops below threshold (via `RecipeIngredient` links), auto-86 the menu item and notify SOS terminals in real-time via WebSocket.
**Backend:** PARTIAL — `RecipeIngredient` model, `eightySixed` field, `PATCH /86` endpoint exist. Need automated trigger.
**Impact:** Prevents selling items you're out of. Eliminates customer disappointment.

### T2-03. AI-Enhanced Menu Item Cards
**Domain:** SOS
**Status:** ✅ COMPLETE
**What:** Replace manual "Popular" checkbox with data-driven badges: "Best Seller" (top 10% by volume), "Chef's Pick" (high margin), "New" (< 14 days). Staff mode shows profit overlay.
**Backend:** Uses existing menu engineering classification endpoint — no new endpoint needed.
**Frontend:** MenuItemCard now shows data-driven badges from AnalyticsService menu engineering data: Best Seller (stars), Chef's Pick (cash-cows), Popular (puzzles), New (< 14 days). SosTerminal loads engineering data on init.
**Impact:** Guided choices toward profitable items. "Popular" badges increase selection 20-30%.

### T2-04. Smart Order Routing (Multi-Device)
**Domain:** KDS
**Status:** ⏭️ DEFERRED (no backend station-category mapping endpoints)
**What:** Route order items to correct KDS station by category. Expo mode shows all items across stations with completion tracking.
**Backend:** PARTIAL — `Station` model exists. Need station-category mapping.
**Impact:** Critical for multi-station kitchens.

### T2-05. Real-Time Priority Notifications
**Domain:** Orders
**Status:** ✅ COMPLETE
**What:** Color-code notifications by wait time, escalate overdue orders, VIP customer flagging, differentiated sound alerts, desktop notification API.
**Frontend:** Web Audio API (4 distinct tones), Desktop Notification API, urgency classification, elapsed time display, sound/desktop toggle controls, pulse animation for urgent alerts. Course-ready audio chime + desktop alerts. Duplicate notification fix (single course-specific message).
**Impact:** No more lost orders. Catches bottlenecks before customer complaints.

### T2-06. Table Management Floor Plan
**Domain:** Tables
**Status:** ✅ COMPLETE
**What:** Visual drag-and-drop floor plan using `posX`/`posY`, color-coded status, click-to-view current order.
**Backend:** READY — Full CRUD endpoints exist.
**Frontend:** `FloorPlan` component with drag-and-drop canvas, list view, KPI strip, section filtering, add/edit/delete tables, status management, active order display. `TableService` with full CRUD. Registered as `get-order-stack-floor-plan`.
**Impact:** Standard for dine-in POS. Hosts need instant table visibility.

---

## TIER 3: New AI-Powered Modules (Compete with Toast) — COMPLETE

### T3-01. AI Command Center / Restaurant IQ
**Domain:** All
**Status:** ✅ COMPLETE
**What:** Central dashboard: real-time KPIs, "For You" AI recommendations feed, active alerts, quick actions. Single screen for all restaurant intelligence.
**Frontend:** 3 tabs: Overview (6 KPIs + insights + top sellers + stock watch), AI Insights (unified feed), Alerts (inventory alerts + predictions). Composes AnalyticsService, InventoryService, OrderService via `Promise.all()`.
**Impact:** Flagship Toast IQ competitor. Reduces manager screens from 5+ to 1.

### T3-02. Customer Intelligence / CRM
**Domain:** CRM
**Status:** ✅ COMPLETE
**What:** Customer profiles, order history, spend analysis, AI-generated segments (VIP, At-Risk, New, Dormant), personalized outreach recommendations.
**Frontend:** Search, segment filtering (VIP/Regular/New/At-Risk/Dormant), sortable table, detail side panel. CustomerService with segment calculation.
**Impact:** Retention is 5x cheaper than acquisition. AI segmentation catches churn risk.

### T3-03. Labor Intelligence / Staff Scheduling
**Domain:** Staff
**Status:** ⏭️ DEFERRED (no backend schema or service)
**What:** AI staffing recommendations from historical sales patterns, demand forecasting by hour/day, schedule management, labor cost tracking vs targets.
**Backend:** NEEDS NEW — Need `Shift`/`StaffSchedule` models, `LaborIntelligenceService`.
**Impact:** Labor is 25-35% of costs. AI scheduling saves $500-2000/month.

### T3-04. Online Ordering Portal (Customer-Facing)
**Domain:** Online Ordering
**Status:** ✅ COMPLETE
**What:** Mobile-optimized customer ordering: menu browsing, cart, Stripe checkout, real-time order tracking. Separate theme from staff UI.
**Frontend:** 4-step mobile-optimized flow (menu → cart → info → confirm). Category pills, search, qty controls, floating cart bar, order type toggle (pickup/delivery/dine-in/curbside/catering), customer form, order summary, order tracking with polling. Slug-based restaurant resolution.
**Impact:** 30-40% of restaurant revenue is digital. Table stakes for modern POS.

### T3-05. Reservation System with AI Capacity Planning
**Domain:** Reservations
**Status:** ✅ COMPLETE
**What:** Reservation management with AI-predicted table turn times, auto-table assignment, waitlist with estimated wait, overbooking recommendations.
**Frontend:** Today/upcoming/past tabs, booking form, status actions, KPI strip. ReservationService with CRUD + status workflow.
**Impact:** AI turn time prediction increases covers 10-15%.

### T3-06. Conversational AI Assistant (Restaurant IQ Chat)
**Domain:** All
**Status:** ✅ COMPLETE
**What:** Chat interface for natural language queries: "How did we do last Tuesday?", "Which items should I cut?", "When will we run out of chicken?" Routes queries to backend services via Claude function-calling.
**Frontend:** Message bubbles, typing indicator, suggested queries, auto-scroll. ChatService with conversation management.
**Impact:** Direct Toast IQ competitor. Natural language access to all restaurant data.

---

## TIER 4: Differentiators (Beyond Toast) — COMPLETE

### T4-01. Autonomous AI Monitoring Agent
**Status:** ✅ COMPLETE
**What:** Background agent runs every 60s (configurable), detects anomalies (revenue drops, inventory discrepancies, fraud patterns, kitchen bottlenecks), pushes proactive alerts.
**Frontend:** 3 tabs: Live Feed (filtered alerts with severity/category), Alert History, Rules (8 built-in anomaly rules, toggle on/off). MonitoringService with configurable polling, deduplication, acknowledge/clear, snapshot timeline. Polls AnalyticsService + InventoryService — no new backend needed.
**Impact:** Catches problems before crises. Fraud detection saves $5K-20K/year.

### T4-02. Voice AI Ordering
**Status:** ✅ COMPLETE
**What:** Voice-activated ordering at kiosk or phone using browser Web Speech API + Claude NLP for entity extraction. Bilingual (English/Spanish).
**Frontend:** Web Speech API integration, bilingual (EN/ES), fuzzy menu matching with quantity extraction ("two chicken tacos"), SpeechSynthesis voice feedback, animated waveform, confidence badges.
**Impact:** $2.5B market by 2027. Accessibility improvement. Differentiator over all major POS competitors.

### T4-03. Dynamic Menu Pricing
**Status:** ✅ COMPLETE
**What:** Time-based and demand-based price adjustments (happy hour, surge pricing, off-peak discounts). AI recommends pricing strategies.
**Frontend:** 3 tabs: Rules (CRUD form with type/multiplier/time/days), Price Preview (live table with strikethrough base prices), AI Suggestions. Time-based rule engine checks current time/day against rules. Rule types: happy_hour, surge, off_peak, seasonal, custom. localStorage persistence per restaurant.
**Impact:** Dynamic pricing increases revenue 5-15%.

### T4-04. AI-Powered Waste Reduction
**Status:** ✅ COMPLETE
**What:** Track food waste by category (prep, expired, returns). AI analyzes patterns, suggests prep quantity adjustments.
**Frontend:** 3 tabs: Waste Log (entry form + filtered list), Analysis (category breakdown bars + top wasted items), AI Tips (computed recommendations from actual waste data). 5 waste categories: prep_loss, spoilage, customer_return, damaged, overproduction. Integrates with InventoryService.recordUsage() to deduct stock.
**Impact:** Cuts waste 30-50%, saving $500-2000/month.

### T4-05. Sentiment Analysis from Order Data
**Status:** ✅ COMPLETE
**What:** NLP analysis of `specialInstructions` text and order patterns to gauge satisfaction. Detects complaint keywords, tracks return rates.
**Frontend:** 3 tabs: Overview (sentiment bars + keyword cloud + flag grid), Entries (filtered list with score/keywords/flags), Flags (detail view by flag type). Client-side NLP: keyword matching for positive/negative scoring, 6 flag categories (complaint, allergy, rush, compliment, dietary, modification).
**Impact:** Early detection of quality issues before negative reviews.

---

## Implementation Priority

| # | Feature | Effort | Sprint | Backend Work | Status |
|---|---------|--------|--------|-------------|--------|
| T1-01 | AI Upsell Bar | 1-2 days | 1 | None | ✅ COMPLETE |
| T1-06 | AI Cost in Menu Mgmt | 1-2 days | 1 | None | ✅ COMPLETE |
| T1-04 | Order Profit Insights | 1 day | 1 | None | ✅ COMPLETE |
| T1-07 | Payment Integration (PayPal + Stripe) | 3-4 days | 2 | ✅ All endpoints ready | ✅ COMPLETE |
| T1-08 | Receipt Printing (CloudPRNT) | 2-3 days | 2 | CloudPRNT API | ✅ COMPLETE |
| CP | Control Panel Tabs (AI Settings, Online Pricing, Catering Calendar) | 1 day | — | PATCH settings | ✅ COMPLETE |
| CS | Course System UI (PendingOrders display + fire, OrderNotifications chime, duplicate notification bugfix, Course Pacing Mode Selector, KDS Recall Ticket) | 1 day | — | None | ✅ COMPLETE |
| EX | Expo Station (KDS 4-column layout, AI Settings toggle, expo check → print trigger, toggle-off safety) | 0.5 day | — | None | ✅ COMPLETE |
| EC | Edge Cases (Catering Approval Timeout, Offline Mode order queue) | 1 day | — | None | ✅ COMPLETE |
| T1-02 | Menu Engineering Dashboard | 3-4 days | 2 | None | ✅ COMPLETE |
| T1-03 | Sales Dashboard | 3-4 days | 3 | None | ✅ COMPLETE |
| T1-05 | Inventory Dashboard | 5-7 days | 3-4 | None | ✅ COMPLETE |
| T2-06 | Table Floor Plan | 3-4 days | 4 | None | ✅ COMPLETE |
| T2-01 | Smart KDS | 3-4 days | 4-5 | New endpoint | ✅ COMPLETE |
| T2-02 | Auto-86 System | 2-3 days | 5 | WebSocket event | ✅ COMPLETE |
| T2-03 | Enhanced Menu Cards | 1-2 days | 5 | New endpoint | ✅ COMPLETE |
| T3-01 | AI Command Center | 5-7 days | 6-7 | Aggregation endpoint | ✅ COMPLETE |
| T3-02 | Customer CRM | 5-7 days | 7-8 | Search/segment endpoints | ✅ COMPLETE |
| T3-06 | AI Chat Assistant | 7-10 days | 8-9 | ChatService + tool-use | ✅ COMPLETE |
| T3-04 | Online Ordering | 10+ days | 9-11 | Minor additions | ✅ COMPLETE |
| T3-03 | Labor Intelligence | 7-10 days | 10-12 | New schema + service | ⏭️ DEFERRED |
| T3-05 | Reservations AI | 5-7 days | 12-13 | AI prediction endpoint | ✅ COMPLETE |
| T4-01 | Autonomous Agent | 7-10 days | 14+ | Background job system | ✅ COMPLETE |
| T4-02 | Voice Ordering | 7-10 days | 15+ | NLP endpoint | ✅ COMPLETE |
| T4-03 | Dynamic Pricing | 5-7 days | 16+ | New schema | ✅ COMPLETE |
| T4-04 | Waste Reduction | 5-7 days | 17+ | New schema + service | ✅ COMPLETE |
| T4-05 | Sentiment Analysis | 3-5 days | 18+ | NLP pipeline | ✅ COMPLETE |
| LY | Loyalty Program (config, tiers, rewards, points, redemption) | 2-3 days | — | ✅ Prisma + routes + validators | ✅ COMPLETE |

---

## Next Task (Current Focus)

✅ **Completed (Session 26):** AI auto-fire course pacing optimization v1
- Adaptive delay now combines next-course prep time + kitchen load + observed/historical table pace.
- KDS order cards now show a delay rationale breakdown for operator trust/debugging.
- Backend metrics endpoint is live: `GET /api/restaurant/:restaurantId/course-pacing/metrics`.

✅ **Completed (Session 27):** Order throttling v1
- Added AI settings contract for throttling thresholds and hysteresis.
- Added backend throttling engine + endpoints (`/throttling/status`, manual hold/release routes) with hold/release item state transitions.
- Added KDS throttled queue column, gate status indicator, and operator hold/release controls.

✅ **Completed (Session 28):** Per-restaurant delivery credential management (admin-only)
- Added encrypted backend credential storage linked by `restaurantId`.
- Added admin endpoints for credential save/update/delete and status summary (`/delivery/credentials/*`).
- Added Control Panel Delivery credential forms with manager/owner/super_admin-only edit access (staff view-only).
- Delivery runtime now resolves provider credentials per restaurant at dispatch time.

✅ **Completed (Session 29):** Marketplace Phase 2 inbound ingestion foundation (backend)
- Added Prisma models for marketplace integrations, external order linking, and webhook event idempotency/audit.
- Added admin integration endpoints (`/api/restaurant/:restaurantId/marketplace/integrations`).
- Added inbound webhook routes (`/api/webhooks/doordash-marketplace`, `/api/webhooks/ubereats`, `/api/webhooks/grubhub`).
- Implemented normalized webhook ingestion path that can create internal delivery orders from marketplace payloads and broadcast `order:new`.

✅ **Completed (Session 30):** Marketplace Control Panel integration (frontend Phase 1)
- Added Delivery settings marketplace cards for DoorDash Marketplace, Uber Eats, and Grubhub.
- Added role-gated CRUD wiring for integration enable/store ID/webhook secret using backend marketplace integration endpoints.
- Added read-only status visibility and per-provider secret clear actions.

✅ **Completed (Session 31):** Marketplace menu mapping + inbound hardening (Phase 2)
- Added backend `marketplace_menu_mappings` schema + CRUD endpoints under `/api/restaurant/:restaurantId/marketplace/menu-mappings`.
- Added Delivery settings UI for per-provider external-item -> internal-menu mapping management.
- Updated inbound ingestion to prioritize explicit mappings and place unmapped payloads into `HOLD_FOR_REVIEW` instead of silent auto-accept.

**New Current Focus:** Marketplace Phase 2 completion (outbound provider status sync and pilot rollout hardening).

### Detailed Plan (Current Focus): Marketplace Phase 2 Completion

**Goal:** Finish Phase 2 from inbound-only foundation to production-ready two-way marketplace operations.

**Progress:** Phases 1-2 are complete (Sessions 30-31). Phases 3-5 remain.

**Phase 1 — Control Panel Marketplace Integration (Frontend + Existing Backend APIs)**
1. Add frontend marketplace models/service methods for integration summary/update/secret-clear.
2. Extend Delivery settings UI with Marketplace provider cards (`doordash_marketplace`, `ubereats`, `grubhub`) including enable toggle, external store ID, webhook secret update, and last-updated status.
3. Enforce existing role policy (manager/owner/super_admin edit; staff view-only) and form validation.
4. Add integration test for config CRUD flow against backend endpoints.

**Phase 2 — Menu Mapping + Inbound Quality Hardening**
1. Add `marketplace_menu_mappings` schema (restaurantId + provider + externalItemId -> menuItemId, unique constraints).
2. Add backend CRUD/search endpoints for menu mappings and include dry-run mapping preview.
3. Update marketplace ingestion to resolve line items by explicit mapping first; keep name fallback only as temporary compatibility path.
4. Add unknown-item handling policy (`hold_for_review` with reason) instead of silent best-effort mapping.

**Phase 3 — Outbound Marketplace Status Sync**
1. Add provider status adapter interface (`pushOrderStatus`) for DoorDash Marketplace and Uber Eats.
2. Trigger outbound sync on internal order lifecycle transitions (`confirmed`, `preparing`, `ready`, `cancelled`, `completed`) with provider-specific mapping.
3. Add resilient retry/outbox mechanism for provider sync failures (retry count, nextAttemptAt, dead-letter state).
4. Surface last sync outcome on marketplace order records for support/debugging.

**Phase 4 — Operator UX in KDS/Orders**
1. Add marketplace source badges and filters in Pending Orders, KDS order cards, and Order History.
2. Add marketplace sync status indicator and failure warning in order detail.
3. Add quick action for re-attempt sync when an order is in outbound-sync failed state.

**Phase 5 — Verification + Pilot Rollout**
1. Add webhook contract fixture tests per provider (valid, invalid signature, duplicates, out-of-order events).
2. Add end-to-end flow test: inbound webhook -> order created -> KDS visible -> status changes -> outbound sync success.
3. Roll out in sequence: DoorDash pilot restaurant(s) -> Uber Eats pilot -> broader cohort expansion.
4. Keep Grubhub feature-gated and disabled unless partnership/API access is confirmed.

**Exit Criteria**
1. Inbound marketplace orders are idempotent, auditable, and consistently mapped to internal menu items.
2. Outbound status updates succeed with retries and observable failure states.
3. Operators can identify and triage marketplace orders in normal KDS workflow without ambiguity.
4. Pilot restaurants complete live validation with no critical ingestion/sync regressions.

### Deferred Detailed Plan (Out Of Scope): Strict Tenant-Isolated Credential Encryption

**Why Deferred:** Current rollout solved per-restaurant credential CRUD and runtime usage. This next hardening step is intentionally deferred because it requires KMS infra, migration jobs, and operational runbooks.

**Security Context:** Render environment variables are shared at service scope, not tenant scope. Therefore any service-level symmetric key is weaker than desired for multi-tenant isolation.

**Target State:** Envelope encryption per restaurant:
- One unique DEK per restaurant credential record.
- DEK wrapped by KMS-managed KEK.
- No long-lived tenant secrets in Render env.
- Cryptographic binding to `restaurantId` (AAD) to prevent cross-tenant ciphertext reuse.

**Phase 0 — Threat Model + Decision Record**
1. Document threat model (`docs/security/delivery-credentials-threat-model.md`) covering shared-env risk, insider risk, backup exposure, and key compromise blast radius.
2. Publish ADR selecting KMS provider and key hierarchy (`docs/adr/ADR-00x-tenant-kms-encryption.md`).
3. Define SLO/SLA impact and failure mode (fail-closed for write/decrypt vs fail-open disallowed).

**Phase 1 — Schema and Metadata**
1. Extend `restaurant_delivery_credentials` with: `dek_wrapped`, `dek_version`, `kek_alias`, `crypto_provider`, `aad_hash`, `rotation_due_at`, `migrated_at`.
2. Keep current encrypted columns for migration compatibility window only.
3. Add `credential_key_audit` table: actor, restaurantId, provider, action, keyVersion, outcome, correlationId, timestamp.

**Phase 2 — Crypto/KMS Layer**
1. Add `KeyManagementService` abstraction with strict methods: `generateDek()`, `wrapDek()`, `unwrapDek()`, `scheduleRotation()`.
2. Implement provider adapter (AWS KMS or GCP KMS) plus local dev stub.
3. Use AES-256-GCM with AAD = stable tenant context (`restaurantId`, provider, field name).
4. Remove business-logic direct access to raw key bytes outside crypto boundary.

**Phase 3 — Runtime Integration**
1. On save/update credentials: generate DEK, encrypt fields with AAD, wrap DEK via KMS, persist metadata.
2. On read/dispatch/webhook verify: unwrap DEK on demand, decrypt fields, zeroize buffers after use where feasible.
3. Add in-memory short TTL cache for unwrapped DEKs (optional) with strict bounds and eviction telemetry.

**Phase 4 — Migration (Dual Read / Single Write)**
1. Switch writes to KMS path first (new records only).
2. Read path: attempt KMS metadata path, then legacy path if not migrated.
3. Run batched migration job per restaurant with resumable cursor and idempotent checkpoints.
4. Emit migration dashboard metrics: total, migrated, failed, retried.

**Phase 5 — Rotation, Revocation, IR**
1. Add per-restaurant key rotation job and admin trigger endpoint.
2. Add emergency revoke action (disable provider dispatch for impacted tenant until re-provisioned).
3. Add incident playbook for tenant key compromise and restore.

**Phase 6 — Enforcement + Cleanup**
1. Remove legacy shared-key decrypt fallback after 100% migration and soak window.
2. Block startup if KMS is required but unhealthy for credential operations.
3. Add CI/security tests asserting no plaintext credential leakage in logs/responses.

**Acceptance Criteria**
1. Compromise of one restaurant DEK cannot decrypt any other restaurant credentials.
2. Render env secret leakage alone is insufficient to decrypt tenant credentials.
3. Rotation/revoke events are auditable and reproducible.
4. Dispatch degradation is tenant-scoped during key incidents (no global outage).

---

## Services & Models Inventory — ✅ ALL IMPLEMENTED

**Services (18 total):** `AnalyticsService`, `AuthService`, `CartService`, `ChatService`, `CustomerService`, `DeliveryService`, `InventoryService`, `LoyaltyService`, `MenuService`, `MonitoringService`, `OrderService`, `PaymentService`, `PrinterService`, `ReservationService`, `RestaurantSettingsService`, `SocketService`, `TableService`, `TipService`

**Payment Providers (2):** `StripePaymentProvider`, `PayPalPaymentProvider` — plain classes (not Angular services) implementing `PaymentProvider` interface, used by `PaymentService` orchestrator

**Delivery Providers (2):** `DoorDashDeliveryProvider`, `UberDeliveryProvider` — plain classes implementing `DeliveryProvider` interface, used by `DeliveryService` orchestrator

**Models (23 files):** `analytics.model.ts`, `auth.model.ts`, `cart.model.ts`, `chat.model.ts`, `customer.model.ts`, `delivery.model.ts`, `dining-option.model.ts`, `inventory.model.ts`, `loyalty.model.ts`, `menu.model.ts`, `monitoring.model.ts`, `order.model.ts`, `payment.model.ts`, `pricing.model.ts`, `printer.model.ts`, `reservation.model.ts`, `restaurant.model.ts`, `sentiment.model.ts`, `settings.model.ts`, `table.model.ts`, `tip.model.ts`, `voice.model.ts`, `waste.model.ts`

**Custom Elements (23 registered in main.ts):** `get-order-stack-login`, `get-order-stack-restaurant-select`, `get-order-stack-sos-terminal`, `get-order-stack-kds-display`, `get-order-stack-command-center`, `get-order-stack-menu-engineering`, `get-order-stack-sales-dashboard`, `get-order-stack-inventory-dashboard`, `get-order-stack-category-management`, `get-order-stack-item-management`, `get-order-stack-floor-plan`, `get-order-stack-crm`, `get-order-stack-reservations`, `get-order-stack-ai-chat`, `get-order-stack-online-ordering`, `get-order-stack-monitoring-agent`, `get-order-stack-voice-order`, `get-order-stack-dynamic-pricing`, `get-order-stack-waste-tracker`, `get-order-stack-sentiment`, `get-order-stack-pending-orders`, `get-order-stack-order-history`, `get-order-stack-control-panel`

---

## Key Files

| File | Role |
|------|------|
| `library/src/lib/services/menu.ts` | Pattern reference for new services; extend with AI cost methods |
| `library/src/lib/sos/sos-terminal/sos-terminal.ts` | Main container — add nav items, AI upsell |
| `library/src/lib/sos/upsell-bar/upsell-bar.ts` | Replace static input with AI-driven data |
| `library/src/lib/services/order.ts:187` | `getProfitInsight()` — already built, never called |
| `elements/src/main.ts` | Register all new custom elements |
| Backend: `src/app/analytics.routes.ts` | All analytics endpoints (defines response shapes) |
| Backend: `src/services/menu-engineering.service.ts` | Defines interfaces frontend models must mirror |
| Backend: `src/services/sales-insights.service.ts` | Defines sales report interfaces |
| Backend: `src/services/inventory.service.ts` | Full inventory + predictions |
| Backend: `src/services/stripe.service.ts` | Stripe payment processing |
| Backend: `src/services/paypal.service.ts` | PayPal Orders v2 payment processing |
| `library/src/lib/services/providers/` | PayPal + Stripe payment provider implementations |
| `library/src/lib/settings/payment-settings/` | Payment processor selection UI |
| `library/src/lib/services/tip.ts` | TipService — reactive tip pooling/compliance computation engine |
| `library/src/lib/tip-mgmt/tip-management/` | Tip Management 4-tab dashboard (reports, pool rules, tip-out, compliance) |
| `library/src/lib/services/loyalty.ts` | LoyaltyService — config, rewards CRUD, points, phone lookup |
| `library/src/lib/settings/loyalty-settings/` | Loyalty config UI (enable, points/dollar, tiers, redemption) |
| `library/src/lib/settings/rewards-management/` | Rewards CRUD table with tier badges |

---

## Verification

For each tier, verify by:
1. **T1 features:** Call the backend endpoint directly (`curl` or Playwright) to confirm response shape, then build frontend component, `ng serve` the elements app, and verify data renders
2. **T2 features:** Test backend additions with Postman/curl first, then verify frontend integration
3. **T3/T4 features:** Create backend service with unit tests, verify endpoints, then build frontend
4. **All features:** Check WebSocket events in browser DevTools Network tab, verify signals update reactively
