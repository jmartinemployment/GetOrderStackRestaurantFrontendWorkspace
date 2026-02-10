# Get-Order-Stack AI Feature Roadmap — Toast POS Competitor

> **This is the production roadmap for getorderstack.com.**

## Context

Get-Order-Stack is a restaurant operating system built to compete with Toast POS. The **backend already has significant AI features built with Claude Sonnet 4** (cost estimation, menu engineering, sales insights, inventory predictions, order profit analysis). The frontend now surfaces all four tiers of features (T1–T4 complete). The system is deployed via WordPress at geekatyourspot.com with 18 feature pages.

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

The original expansion plan (taipa-*-demo slugs) was superseded by the production deployment using `orderstack-*` slugs. See `CLAUDE.md` Session 9 notes for the full page template table. 20 custom elements are registered in `main.ts`, with `functions.php` loading the bundle conditionally on all 18 OrderStack pages.

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
| Self-Order System (SOS) | Built (menu, cart, checkout) | HIGH — upsell, voice |
| Kitchen Display (KDS) | Built (3-column) | HIGH — smart routing, prep times |
| Order Management | Built (pending, history, receipt) | MEDIUM — profit insights |
| Menu Management | Built (CRUD) | HIGH — cost estimation, quadrants |
| Inventory | Backend ready, **no frontend** | HIGH — surface backend AI |
| Analytics/Reporting | Backend ready, **no frontend** | CRITICAL — surface backend AI |
| Payments | Stripe backend ready, **no frontend** | CRITICAL — enable transactions |
| Table Management | Backend ready, **no frontend** | MEDIUM — floor plan UI |
| Customer/CRM | Schema exists, minimal API | HIGH — personalization |
| Staff/Scheduling | PIN auth only | HIGH — labor intelligence |
| Reservations | Backend CRUD ready | MEDIUM — AI capacity |
| Online Ordering | Schema supports it | HIGH — customer-facing portal |
| Marketing/Loyalty | loyaltyPoints field only | MEDIUM — AI campaigns |

---

## TIER 1: Surface What's Already Built — COMPLETE

> All 7 features implemented (Sessions 2-5). Backend ready, zero backend work needed.

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

### T1-07. Stripe Payment Integration in Checkout
**Domain:** Payments
**Status:** IN PROGRESS
**What:** Connect Stripe checkout to the existing backend. Card input via Stripe Elements, payment confirmation flow, refund capability in order management.
**Backend:** READY — `POST /orders/:id/payment-intent`, `/payment-status`, `/refund`, `/cancel-payment`, webhook handler
**Frontend:** Install `@stripe/stripe-js`, create `PaymentService`, embed Stripe Elements in `CheckoutModal`, add payment status badges.
**Impact:** Without this, the system cannot process real transactions. Table stakes for POS.

#### Backend Endpoints (All READY)

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| POST | `/restaurant/:id/orders/:orderId/payment-intent` | None | `{ clientSecret, paymentIntentId }` |
| GET | `/restaurant/:id/orders/:orderId/payment-status` | None | `{ orderId, orderNumber, paymentStatus, paymentMethod, total, stripe: { status, amount, currency } \| null }` |
| POST | `/restaurant/:id/orders/:orderId/cancel-payment` | None | `{ success, message }` |
| POST | `/restaurant/:id/orders/:orderId/refund` | `{ amount?: number }` | `{ success, refundId, amount, status }` |
| POST | `/api/webhooks/stripe` | Stripe webhook payload | `{ received: true }` |

Payment statuses: `pending`, `paid`, `failed`, `cancelled`, `partial_refund`, `refunded`

#### Implementation Plan

| # | File | Action |
|---|------|--------|
| 1 | `package.json` | Install `@stripe/stripe-js` |
| 2 | `models/payment.model.ts` | Create interfaces: `PaymentIntentResponse`, `PaymentStatusResponse`, `RefundResponse`, `PaymentStep` |
| 3 | `services/payment.ts` | Create `PaymentService` — signal-based, Stripe.js loader, 4 HTTP methods |
| 4 | `models/order.model.ts` | Add `stripePaymentIntentId` to `Order` |
| 5 | `checkout-modal.ts` | Add 2-step flow: order → payment via Stripe Payment Element |
| 6 | `checkout-modal.html` | Payment step UI with Stripe mount, totals, pay/cancel buttons |
| 7 | `checkout-modal.scss` | Stripe element container styles, payment status badges |
| 8 | `pending-orders.ts/html` | Payment status badge per order |
| 9 | `order-history.ts/html` | Payment badge in list + refund button in detail view |
| 10 | `public-api.ts`, `models/index.ts` | Export PaymentService + payment models |
| 11 | Build & verify | Zero errors on library + elements |

### T1-08. Receipt Printing via Star CloudPRNT
**Domain:** Orders / KDS
**What:** When staff marks an order "Ready" in KDS or PendingOrders, the backend queues a print job via Star CloudPRNT API. The CloudPRNT-compatible printer polls the backend and picks up the job — no browser hardware APIs needed, works on any device including iPad/Safari.
**Backend:** NEW — Add Star CloudPRNT API integration to the order status change handler (`PATCH /orders/:id/status`). Queue print job when status transitions to `ready`. Expose `/print/status/:orderId` for polling print confirmation.
**Frontend:** Add "Printing..." status badge to order cards when order is marked ready. Listen for WebSocket `order:printed` event to confirm print completion. Add print status indicator to `PendingOrders` and KDS `OrderCard`.
**Hardware:** Star CloudPRNT-compatible printer (mC-Print3 recommended — 80mm thermal, ethernet + USB + Bluetooth, CloudPRNT built-in). CloudPRNT Next (MQTT) supported for sub-second delivery.
**Impact:** Completes the staff order fulfillment workflow. Without receipt printing, "Order Ready" is a dead end — staff has no physical ticket to deliver with the food. Pairs naturally with T1-07 (Stripe) since payment + receipt go together.

---

## TIER 2: Enhance Existing Features with AI — COMPLETE (5/6)

> T2-01, T2-02, T2-03, T2-05, T2-06 complete (Sessions 6-7). T2-04 deferred (no backend endpoints).

### T2-01. Smart KDS with Prep Time Predictions & Station Routing
**Domain:** KDS
**Status:** COMPLETE (prep time + rush; station routing deferred to backend work)
**What:** Show estimated prep time countdown on order cards, color escalation (green/amber/red by time), route items to kitchen stations, add station filter to KDS header, "Rush" button.
**Backend:** PARTIAL — `prepTimeMinutes` and `Station` model exist. Need prep estimate endpoint.
**Frontend:** Prep time countdown with color escalation from MenuItem.prepTimeMinutes. Rush priority toggle. KDS stats header (active/overdue/avg wait). Station routing deferred until backend station-category mapping is built.
**Impact:** Station routing cuts ticket times 15-20%.

### T2-02. Intelligent 86 System (Auto-86 from Inventory)
**Domain:** Menu / Inventory
**What:** When inventory drops below threshold (via `RecipeIngredient` links), auto-86 the menu item and notify SOS terminals in real-time via WebSocket.
**Backend:** PARTIAL — `RecipeIngredient` model, `eightySixed` field, `PATCH /86` endpoint exist. Need automated trigger.
**Impact:** Prevents selling items you're out of. Eliminates customer disappointment.

### T2-03. AI-Enhanced Menu Item Cards
**Domain:** SOS
**Status:** COMPLETE
**What:** Replace manual "Popular" checkbox with data-driven badges: "Best Seller" (top 10% by volume), "Chef's Pick" (high margin), "New" (< 14 days). Staff mode shows profit overlay.
**Backend:** Uses existing menu engineering classification endpoint — no new endpoint needed.
**Frontend:** MenuItemCard now shows data-driven badges from AnalyticsService menu engineering data: Best Seller (stars), Chef's Pick (cash-cows), Popular (puzzles), New (< 14 days). SosTerminal loads engineering data on init.
**Impact:** Guided choices toward profitable items. "Popular" badges increase selection 20-30%.

### T2-04. Smart Order Routing (Multi-Device)
**Domain:** KDS
**What:** Route order items to correct KDS station by category. Expo mode shows all items across stations with completion tracking.
**Backend:** PARTIAL — `Station` model exists. Need station-category mapping.
**Impact:** Critical for multi-station kitchens.

### T2-05. Real-Time Priority Notifications
**Domain:** Orders
**What:** Color-code notifications by wait time, escalate overdue orders, VIP customer flagging, differentiated sound alerts, desktop notification API.
**Backend:** PARTIAL — timing data exists. Need VIP threshold config.
**Impact:** No more lost orders. Catches bottlenecks before customer complaints.

### T2-06. Table Management Floor Plan
**Domain:** Tables
**Status:** COMPLETE
**What:** Visual drag-and-drop floor plan using `posX`/`posY`, color-coded status, click-to-view current order.
**Backend:** READY — Full CRUD endpoints exist.
**Frontend:** `FloorPlan` component with drag-and-drop canvas, list view, KPI strip, section filtering, add/edit/delete tables, status management, active order display. `TableService` with full CRUD. Registered as `get-order-stack-floor-plan`.
**Impact:** Standard for dine-in POS. Hosts need instant table visibility.

---

## TIER 3: New AI-Powered Modules (Compete with Toast) — COMPLETE

### T3-01. AI Command Center / Restaurant IQ
**Domain:** All
**What:** Central dashboard: real-time KPIs, "For You" AI recommendations feed, active alerts, quick actions. Single screen for all restaurant intelligence.
**Backend:** NEEDS NEW — Aggregation endpoint combining all AI services.
**Impact:** Flagship Toast IQ competitor. Reduces manager screens from 5+ to 1.

### T3-02. Customer Intelligence / CRM
**Domain:** CRM
**What:** Customer profiles, order history, spend analysis, AI-generated segments (VIP, At-Risk, New, Dormant), personalized outreach recommendations.
**Backend:** PARTIAL — `Customer` model with loyalty fields. Need search/segmentation endpoints.
**Impact:** Retention is 5x cheaper than acquisition. AI segmentation catches churn risk.

### T3-03. Labor Intelligence / Staff Scheduling
**Domain:** Staff
**What:** AI staffing recommendations from historical sales patterns, demand forecasting by hour/day, schedule management, labor cost tracking vs targets.
**Backend:** NEEDS NEW — Need `Shift`/`StaffSchedule` models, `LaborIntelligenceService`.
**Impact:** Labor is 25-35% of costs. AI scheduling saves $500-2000/month.

### T3-04. Online Ordering Portal (Customer-Facing)
**Domain:** Online Ordering
**What:** Mobile-optimized customer ordering: menu browsing, cart, Stripe checkout, real-time order tracking. Separate theme from staff UI.
**Backend:** PARTIAL — Order creation with `orderSource: 'online'` supported.
**Impact:** 30-40% of restaurant revenue is digital. Table stakes for modern POS.

### T3-05. Reservation System with AI Capacity Planning
**Domain:** Reservations
**What:** Reservation management with AI-predicted table turn times, auto-table assignment, waitlist with estimated wait, overbooking recommendations.
**Backend:** PARTIAL — CRUD endpoints exist. Need AI availability prediction.
**Impact:** AI turn time prediction increases covers 10-15%.

### T3-06. Conversational AI Assistant (Restaurant IQ Chat)
**Domain:** All
**What:** Chat interface for natural language queries: "How did we do last Tuesday?", "Which items should I cut?", "When will we run out of chicken?" Routes queries to backend services via Claude function-calling.
**Backend:** NEEDS NEW — `ChatService` with Claude tool-use routing.
**Impact:** Direct Toast IQ competitor. Natural language access to all restaurant data.

---

## TIER 4: Differentiators (Beyond Toast) — COMPLETE

### T4-01. Autonomous AI Monitoring Agent
**What:** Background agent runs every 15 min, detects anomalies (revenue drops, inventory discrepancies, fraud patterns, kitchen bottlenecks), pushes proactive alerts via WebSocket.
**AI:** Claude for anomaly interpretation + algorithmic thresholds.
**Impact:** Catches problems before crises. Fraud detection saves $5K-20K/year.

### T4-02. Voice AI Ordering
**What:** Voice-activated ordering at kiosk or phone using browser Web Speech API + Claude NLP for entity extraction. Bilingual (English/Spanish).
**AI:** Web Speech API + Claude for menu item extraction.
**Impact:** $2.5B market by 2027. Accessibility improvement. Differentiator over all major POS competitors.

### T4-03. Dynamic Menu Pricing
**What:** Time-based and demand-based price adjustments (happy hour, surge pricing, off-peak discounts). AI recommends pricing strategies.
**AI:** Claude for strategy recommendations; rule-based execution.
**Impact:** Dynamic pricing increases revenue 5-15%.

### T4-04. AI-Powered Waste Reduction
**What:** Track food waste by category (prep, expired, returns). AI analyzes patterns, suggests prep quantity adjustments.
**AI:** Claude for pattern analysis.
**Impact:** Cuts waste 30-50%, saving $500-2000/month.

### T4-05. Sentiment Analysis from Order Data
**What:** NLP analysis of `specialInstructions` text and order patterns to gauge satisfaction. Detects complaint keywords, tracks return rates.
**AI:** Claude NLP for sentiment extraction.
**Impact:** Early detection of quality issues before negative reviews.

---

## Implementation Priority

| # | Feature | Effort | Sprint | Backend Work |
|---|---------|--------|--------|-------------|
| T1-01 | AI Upsell Bar | 1-2 days | 1 | None |
| T1-06 | AI Cost in Menu Mgmt | 1-2 days | 1 | None |
| T1-04 | Order Profit Insights | 1 day | 1 | None |
| T1-07 | Stripe Checkout | 3-4 days | 2 | None |
| T1-08 | Receipt Printing (CloudPRNT) | 2-3 days | 2 | CloudPRNT API |
| T1-02 | Menu Engineering Dashboard | 3-4 days | 2 | None |
| T1-03 | Sales Dashboard | 3-4 days | 3 | None |
| T1-05 | Inventory Dashboard | 5-7 days | 3-4 | None |
| T2-06 | Table Floor Plan | 3-4 days | 4 | None |
| T2-01 | Smart KDS | 3-4 days | 4-5 | New endpoint |
| T2-02 | Auto-86 System | 2-3 days | 5 | WebSocket event |
| T2-03 | Enhanced Menu Cards | 1-2 days | 5 | New endpoint |
| T3-01 | AI Command Center | 5-7 days | 6-7 | Aggregation endpoint |
| T3-02 | Customer CRM | 5-7 days | 7-8 | Search/segment endpoints |
| T3-06 | AI Chat Assistant | 7-10 days | 8-9 | ChatService + tool-use |
| T3-04 | Online Ordering | 10+ days | 9-11 | Minor additions |
| T3-03 | Labor Intelligence | 7-10 days | 10-12 | New schema + service |
| T3-05 | Reservations AI | 5-7 days | 12-13 | AI prediction endpoint |
| T4-01 | Autonomous Agent | 7-10 days | 14+ | Background job system |
| T4-02 | Voice Ordering | 7-10 days | 15+ | NLP endpoint |
| T4-03 | Dynamic Pricing | 5-7 days | 16+ | New schema |
| T4-04 | Waste Reduction | 5-7 days | 17+ | New schema + service |
| T4-05 | Sentiment Analysis | 3-5 days | 18+ | NLP pipeline |

---

## New Services & Models Required

**Services:** `AnalyticsService`, `InventoryService`, `PaymentService`, `PrintService`, `TableService`, `CustomerService`, `ChatService`

**Models:** `analytics.model.ts`, `inventory.model.ts`, `payment.model.ts`, `table.model.ts` (expand existing `customer.model.ts`)

**New Custom Elements:** `get-order-stack-menu-engineering`, `get-order-stack-sales-dashboard`, `get-order-stack-inventory-dashboard`, `get-order-stack-floor-plan`, `get-order-stack-command-center`, `get-order-stack-crm`, `get-order-stack-ai-chat`, `get-order-stack-online-ordering`

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
| Backend: `src/services/stripe.service.ts` | Payment processing |

---

## Verification

For each tier, verify by:
1. **T1 features:** Call the backend endpoint directly (`curl` or Playwright) to confirm response shape, then build frontend component, `ng serve` the elements app, and verify data renders
2. **T2 features:** Test backend additions with Postman/curl first, then verify frontend integration
3. **T3/T4 features:** Create backend service with unit tests, verify endpoints, then build frontend
4. **All features:** Check WebSocket events in browser DevTools Network tab, verify signals update reactively
