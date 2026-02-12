# GetOrderStack Product Workflow Documentation
## Complete Business Logic & Competitive Analysis

**Implementation Status Legend:**
- ✅ **IMPLEMENTED** — Feature complete and deployed
- 🚧 **PARTIALLY IMPLEMENTED** — Core functionality exists, enhancements pending
- 📋 **PLANNED** — Defined but not yet implemented
- 🔬 **RESEARCH** — Requirements gathering phase

---

## DINING OPTIONS & BEHAVIORS — ✅ COMPLETE (Sessions 11-12)

**Status:** All 5 dining options fully implemented with frontend workflows (Session 11) and backend validation + query filtering (Session 12).

| Dining Option | Behavior | Required Data | Identifier | Approval |
|---------------|----------|---------------|------------|----------|
| **Dine-In** | DINE_IN | table.guid, server.guid | Table number | Auto |
| **Takeout** | TAKE_OUT | customer (name, phone, email) | Customer name | Auto |
| **Curbside** | TAKE_OUT (curbside=true) | customer + vehicleDescription | Customer name + vehicle | Auto |
| **Delivery** | DELIVERY | customer + deliveryInfo (address) | Customer name + address | Auto |
| **Catering** | CATERING | customer + event details, deposit | Customer name + event | **AI/Manual** |

---

## DATA MODELS — ✅ IMPLEMENTED

**Status:** Complete TypeScript interfaces defined in library models (order.model.ts, table.model.ts, dining-option.model.ts, menu.model.ts, cart.model.ts, customer.model.ts, reservation.model.ts, etc.)

### Service Area
```
ServiceArea
├── guid
├── name (e.g., "Dining Room", "Patio", "Bar")
└── tables[]
```

### Table
```
Table
├── guid
├── name (e.g., "Table 12", "Booth 3") ← HUMAN-READABLE
├── serviceArea.guid
├── seats (number of seats)
└── status: AVAILABLE | OCCUPIED
```

### Order Object (All Types)
```
Order
├── guid
├── businessDate (yyyymmdd)
├── diningOption
│   ├── guid
│   ├── name ("Dine In", "Takeout", "Delivery")
│   └── behavior: DINE_IN | TAKE_OUT | DELIVERY
├── server (ALL order types)
│   ├── guid
│   ├── name ← HUMAN-READABLE
│   └── entityType: "RestaurantUser"
├── table (dine-in only)
│   ├── guid
│   ├── name ← HUMAN-READABLE
│   └── entityType: "Table"
├── customer (required for takeout/delivery)
│   ├── firstName
│   ├── lastName
│   ├── phone
│   └── email
├── deliveryInfo (delivery only)
│   ├── address (street, city, state, zip)
│   ├── deliveryState: PREPARING | OUT_FOR_DELIVERY | DELIVERED
│   ├── dispatchedDate
│   └── deliveredDate
├── curbsidePickupInfo (curbside only)
│   └── vehicleDescription
├── checks[]
│   ├── guid
│   ├── displayNumber ← HUMAN-READABLE check number
│   ├── tabName ("Jeff's Tab")
│   ├── selections[]
│   │   ├── seatNumber
│   │   ├── course.guid
│   │   └── fulfillmentStatus: NEW | HOLD | SENT | READY
│   ├── payments[]
│   ├── amount (before tax)
│   ├── taxAmount
│   ├── totalAmount
│   └── paymentStatus: OPEN | PAID | CLOSED
├── approvalStatus: NEEDS_APPROVAL | APPROVED | NOT_APPROVED
├── promisedDate (scheduled orders)
└── timestamps (created, opened, modified, paid, closed, void)
```

---

## BACKEND VALIDATION & QUERY FILTERING — ✅ COMPLETE (Session 12)

**Status:** Production-ready Zod validation enforces dining requirements per order type. Query filtering supports delivery status and catering approval workflows.

### Validation Rules

| Order Type | Required Fields | Validation |
|------------|----------------|------------|
| **Dine-In** | `tableId` or `tableNumber` | Must provide table assignment |
| **Takeout** | `customerInfo` | firstName, lastName, phone (≥10 digits), email (optional) |
| **Curbside** | `customerInfo` + `curbsideInfo` | All takeout rules + vehicleDescription |
| **Delivery** | `customerInfo` + `deliveryInfo` | All takeout rules + address, city, state (2-letter), zip (5/9 digits) |
| **Catering** | `customerInfo` + `cateringInfo` | All takeout rules + eventDate (ISO), eventTime, headcount (≥1) |

### Validation Response Format
```json
{
  "error": "Invalid dining option data",
  "details": [
    "Delivery: state: State must be 2-letter code",
    "Delivery: zip: ZIP code must be 5 or 9 digits (e.g., 12345 or 12345-6789)"
  ]
}
```

### Query Filtering Support

**Endpoint:** `GET /api/restaurant/:id/orders`

| Query Parameter | Values | Example |
|----------------|--------|---------|
| `deliveryStatus` | `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED` | `?deliveryStatus=OUT_FOR_DELIVERY` |
| `approvalStatus` | `NEEDS_APPROVAL`, `APPROVED`, `NOT_APPROVED` | `?approvalStatus=NEEDS_APPROVAL` |

**Combined Filters:** `?orderType=delivery&deliveryStatus=PREPARING`

**Backend Files:**
- `src/validators/dining.validator.ts` — Zod schemas (180 lines)
- `src/app/app.routes.ts` — Validation integration + query param support
- `DINING_OPTIONS_API.md` — Complete API reference (350+ lines)

---

## ORDER STATES (6 Separate Systems) — ✅ IMPLEMENTED

**Status:** All order state workflows implemented in frontend models and components. Backend AI approval logic exists. Control Panel UI settings surfaced (AI Settings tab — Session 13).

### 1. SCHEDULED ORDER APPROVAL (approvalStatus)
*Tracks: Has this order been approved to fire?*

**[GETORDERSTACK: AI-Powered Approval]**

**Control Panel Setting:** `Enable AI Order Approval` (On/Off)

```
Scheduled Order Received
           ↓
┌──────────────────────────────┐
│ Is this a CATERING order?    │
└──────────────────────────────┘
      ↓ Yes              ↓ No
 Always AI Review    Check Thresholds
      ↓                   ↓
      ↓         ┌─────────────────────────┐
      ↓         │ Any threshold crossed?  │
      ↓         │ • Fire time > 12 hours  │
      ↓         │   OR after closing      │
      ↓         │ • Order value > $X      │
      ↓         │ • Item count > X        │
      ↓         └─────────────────────────┘
      ↓              ↓ Yes        ↓ No
      ↓          AI Review    Auto-Approve
      ↓              ↓            ↓
      └──────────────┴────────────┘
                     ↓
            ┌───────────────┐
            │  AI Evaluates │
            └───────────────┘
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
   AUTO-APPROVE    FLAG      AUTO-REJECT
        ↓            ↓            ↓
    APPROVED    NEEDS_       NOT_APPROVED
                APPROVAL
```

**Auto-Approve Conditions (ALL must be true):**
- Fire time < 12 hours out AND before today's closing
- Order value < configured threshold
- Item count < configured threshold
- All AI evaluation factors pass

| Status | Description |
|--------|-------------|
| **NEEDS_APPROVAL** | AI flagged for human review |
| **APPROVED** | Will fire to kitchen at prep time |
| **NOT_APPROVED** | Rejected (with reason) |

**AI Evaluation Factors:**
- Inventory availability
- Item 86'd frequency at this day/time
- Kitchen capacity / other orders
- Staffing levels (if integrated)
- Customer history (no-shows, disputes)
- Restaurant status (closed, events)

**Configurable Thresholds (Control Panel):**
| Setting | Default | Description |
|---------|---------|-------------|
| Time threshold | 12 hours | Orders beyond this require AI review |
| Value threshold | $200 | Orders over this require AI review |
| Quantity threshold | 20 items | Orders over this require AI review |

**Immediate orders:** Skip AI, auto-APPROVED, fire immediately.

---

### 2. CATERING ORDERS

**[GETORDERSTACK: Catering Calendar + AI Evaluation]**

**Catering Calendar:**
- Shared calendar in Control Panel → Settings
- Role-based access:
  | Role | Access |
  |------|--------|
  | Manager | Full edit (add, modify, delete events) |
  | Server | View only |
  | Cashier | View only |
- Shows scheduled catering events, capacity blocks, conflicts

**Catering orders ALWAYS go through AI review (never auto-approved).**

AI provides evaluation data WITH the order for human decision:

```
┌─────────────────────────────────────────────┐
│ CATERING ORDER #1234                        │
│ Customer: Acme Corp                         │
│ Event: Friday 2/14, 12:00pm                 │
│ Headcount: 50                               │
├─────────────────────────────────────────────┤
│ AI EVALUATION                               │
├─────────────────────────────────────────────┤
│ Inventory:    ✅ All items available        │
│ 86'd History: ⚠️ Salmon 86'd 3x this month │
│ Capacity:     ✅ No other large orders      │
│ Staffing:     ⚠️ 2 staff scheduled (usual 4)│
│ Customer:     ✅ 3 prior orders, paid       │
│ Restaurant:   ✅ Open, no conflicts         │
├─────────────────────────────────────────────┤
│ AI Recommendation: FLAG - Review staffing   │
└─────────────────────────────────────────────┘
```

**Manager reviews AI data and decides:**
- Approve (add staff for that day)
- Approve with substitution (swap flagged items)
- Reject (can't accommodate)

| Status | Description |
|--------|-------------|
| **NEEDS_APPROVAL** | Awaiting manager review (always) |
| **APPROVED** | Manager accepted |
| **NOT_APPROVED** | Manager rejected |

**Note:** AI informs, human decides. Catering is never auto-approved.

---

### 3. GUEST ORDER FULFILLMENT (guestOrderStatus)
*Used by: Orders Hub, webhooks*

| Status | Orders Hub Tab |
|--------|----------------|
| **RECEIVED** | Needs Approval / Scheduled |
| **IN_PREPARATION** | Active |
| **READY_FOR_PICKUP** | Order Ready |
| **CLOSED** | Completed |
| **VOIDED** | (removed) |

---

### 4. ITEM FULFILLMENT (selection.fulfillmentStatus)
*Used by: KDS*

| Status | KDS Display |
|--------|-------------|
| **NEW** | Not visible (not sent) |
| **HOLD** | Held / not fired |
| **SENT** | Visible on prep station |
| **READY** | Green checkmark, disappears |

---

### 5. CHECK PAYMENT (check.paymentStatus)

| Status | Description |
|--------|-------------|
| **OPEN** | Not paid |
| **PAID** | Card authorized, tip pending |
| **CLOSED** | Fully settled |

```
Cash:   OPEN → CLOSED
Credit: OPEN → PAID → CLOSED
```

---

### 6. DELIVERY STATUS (deliveryInfo.deliveryState)

**Note:** Changed from 4 states to 3 states in Session 11 (PENDING removed, PICKED_UP renamed to OUT_FOR_DELIVERY).

| Status | Description |
|--------|-------------|
| **PREPARING** | Order in kitchen |
| **OUT_FOR_DELIVERY** | Driver has order and is en route |
| **DELIVERED** | Complete |

---

## COURSE SYSTEM — 🚧 PARTIALLY IMPLEMENTED (UI Complete, AI Auto-Fire Pending)

**Status:** All frontend course features complete. Course data model (Course, CourseFireStatus, CoursePacingMode, Selection.course in order.model.ts). Course display and manual fire controls in PendingOrders — grouped items by course, fire status badges (PENDING/FIRED/READY), Fire button for PENDING courses, held-item dimming. Course-ready audio chime + desktop alerts in OrderNotifications (single notification with course-specific message, sound respects mute toggle). Course Pacing Mode Selector — 3-way `CoursePacingMode` dropdown (`disabled` / `server_fires` / `auto_fire_timed`) in AI Settings, with persistence flowing from AI Settings → KDS (with operator override) → PendingOrders. KDS Recall Ticket — backward status transitions with print status cleanup. Only AI-Powered Course Pacing (auto-fire timing based on prep times, kitchen load, table pace) remains as a backend-dependent feature.

### Course Pacing Options

| Setting | Behavior |
|---------|----------|
| **Disabled** | All items fire immediately |
| **Send all, wait for fire** | All sent, prep waits for signal |
| **Server fires** | Server manually fires each course |
| **Auto-fire on previous bump** | Next fires when Expo bumps previous |
| **Auto-fire timed** | Next fires after X seconds |
| **Expo fires** | Expo manually fires next course |

**[GETORDERSTACK: AI-Powered Course Pacing]**

**Control Panel Setting:** `Course Pacing Mode` (Dropdown: Disabled / Server Fires / Auto-Fire Timed, default: Disabled)

When set to Server Fires or Auto-Fire Timed, the course system activates. AI-powered auto-fire timing dynamically calculates optimal fire time based on:
- Prep times per item
- Current kitchen load
- Table eating pace
- Party size
- Historical patterns

Example:
```
Table 12 - Party of 4
Apps finish: ~2 min
Avg eating time: 12 min
Longest entree: 12 min (Katsudon)
Kitchen load: moderate (+2 min)

AI fires entrees in 8 min, staggered:
- Katsudon T+0 (12 min prep)
- Teriyaki T+2 (10 min)
- Ramen T+4 (8 min)
- Udon T+5 (7 min)

All 4 entrees land together as guests finish apps.
```

---

## ITEM PREP TIME FIRING

For items with different prep times in same order:

| Item | Prep Time | Fire Delay |
|------|-----------|------------|
| Turkey Burger | 240 sec | Fires immediately |
| Mozz Sticks | 60 sec | Fires +180 sec |
| Side Salad | 30 sec | Fires +210 sec |

All items finish simultaneously.

---

## KDS WORKFLOW — ✅ IMPLEMENTED (T2-01)

**Status:** KDS Display component complete with prep time tracking (color escalation green/amber/red), rush priority toggle, overdue alerts, average wait time stats, recall ticket (backward status transitions with print status cleanup), and course pacing mode synced from AI Settings (with operator override for per-session changes). Expo Station toggle exists in data model but UI not yet surfaced in Control Panel.

**Control Panel Setting:** `Enable Expo Station` (On/Off, default: Off) — 📋 PLANNED (UI pending)

### Prep Station Flow
1. Order SENT → Ticket appears on KDS
2. Cook prepares all items
3. **Cook taps "Done"** → fulfillmentStatus → READY
4. **Notification sent to device that placed order**
5. Ticket disappears from KDS

### [FUTURE] Expo Station
*For larger operations - not in initial release*
- Control Panel toggle: `Enable Expo Station`
- Adds verification step between kitchen and server notification
- Two-level expediter option for high-volume restaurants

---

## DINE-IN WORKFLOW — ✅ IMPLEMENTED

**Status:** Complete workflow in SOS Terminal with table selection (T2-06 Floor Plan), order entry, kitchen fulfillment, and payment (T1-07 Stripe).

**Rule: Server role MUST select table before order can be sent to kitchen**

### Phase 1: Table Selection (REQUIRED for Server role)
- Server selects table → Table status: OCCUPIED
- Cover count entered (optional)
- Check created (paymentStatus = OPEN)

### Phase 2: Order Entry
- Items added to order
- Seat numbers (optional)
- Course assignments (optional)
- fulfillmentStatus = NEW

### Phase 3: Order Sent
- Server taps Send
- **Validation: Table must be assigned** (blocks send if missing)
- fulfillmentStatus → SENT
- Ticket appears on KDS

### Phase 4: Kitchen
- Cook prepares order
- Cook taps "Done" → fulfillmentStatus → READY
- **If Expo DISABLED (default):** Notification sent to server's device
- **If Expo ENABLED [FUTURE]:** Ticket routes to Expo → Expo bumps → Notification sent to server's device

### Phase 5: Food Delivery
- Server retrieves food
- Delivers to table

### Phase 6: Check & Payment
- Additional items/rounds as needed
- Check printed/split
- Payment processed
- Table → AVAILABLE

---

## TAKEOUT WORKFLOW — ✅ IMPLEMENTED

**Status:** Complete workflow in SOS Terminal and Online Portal (T3-04) with customer data capture, CRM integration, kitchen fulfillment, and SMS notifications.

### Phase 1: Order Placed
- Customer data required (name, phone, email)
- **Update CRM** (create or update customer record)
- Server = who entered order
- **Device = which device placed order** (for notifications)
- Optional: promisedDate for scheduled

### Phase 2: Kitchen
- Ticket shows TAKEOUT, customer name, phone
- Cook prepares order, packaged in to-go containers
- Cook taps "Done" → Notification to device that placed order

### Phase 3: Order Ready
- fulfillmentStatus → READY_FOR_PICKUP
- SMS sent to customer: "Your order is ready"

### Phase 4: Pickup
- Customer verified
- Order marked Complete

---

## CURBSIDE WORKFLOW — ✅ IMPLEMENTED (Session 11)

**Status:** Complete workflow with vehicle description capture, customer notifications, and curbside-specific display in Online Portal, OrderHistory, and ReceiptPrinter.

### Phase 1: Order Placed
- Customer data required (name, phone, email)
- **Update CRM** (create or update customer record)
- **vehicleDescription captured** (make, model, color)
- Server = who entered order
- **Device = which device placed order** (for notifications)
- Optional: promisedDate for scheduled

### Phase 2-3: Same as Takeout

### Phase 4: Curbside Delivery
- Customer notified order ready
- Customer arrives, texts/calls
- Staff brings order to vehicle

---

## DELIVERY WORKFLOW — ✅ IMPLEMENTED (Session 11)

**Status:** Complete workflow with structured address capture (address2/city/state/zip/notes), delivery state tracking (PREPARING → OUT_FOR_DELIVERY → DELIVERED), and order tracking display in Online Portal.

### Phase 1: Order Placed
- Customer data required (name, phone, email, full address: street, city, state, zip)
- **Update CRM** (create or update customer record)
- Server = who entered order
- **Device = which device placed order** (for notifications)
- deliveryState = PREPARING

### Phase 2: Kitchen
- Ticket shows DELIVERY, customer name, address, notes
- Delivery-appropriate packaging
- Cook taps "Done" → Notification to device that placed order

### Phase 3: Order Ready
- fulfillmentStatus → READY_FOR_PICKUP
- Webhook to delivery service (if integrated)

### Phase 4: Delivery
- PREPARING → OUT_FOR_DELIVERY → DELIVERED
- Timestamps tracked

---

## CATERING WORKFLOW — ✅ IMPLEMENTED

**Status:** Complete workflow with event details, deposit tracking, AI approval evaluation (backend-ready), and catering-specific display in receipts. Catering Calendar UI implemented in Control Panel (Session 13).

### Phase 1: Order Placed
- Customer data required (name, phone, email, address)
- **Update CRM** (create or update customer record)
- Event details + headcount
- Deposit if required
- Server = who entered order
- **Device = which device placed order** (for notifications)
- approvalStatus = NEEDS_APPROVAL

### Phase 2: Review
- **If AI Order Approval ENABLED (Control Panel):** AI evaluates (inventory, capacity, customer history) → Manager reviews AI recommendation
- **If AI Order Approval DISABLED:** Manager reviews manually
- APPROVED or NOT_APPROVED

### Phase 3: Scheduled Fire
- Fires at eventDate - prepTime
- Large orders may fire days ahead

### Phase 4: Kitchen → Delivery
- Cook prepares order
- Cook taps "Done" → Notification to device that placed order
- Packaged for transport
- Delivered or picked up

---

## PAYMENT FLOWS — ✅ IMPLEMENTED (T1-07)

**Status:** Stripe payment integration complete in CheckoutModal with credit card flow. Cash flow supported (backend). Pre-paid online orders complete in Online Portal with tip capture at checkout.

### Credit Card
```
OPEN → authorize → PAID → tip adjust → CLOSED
```
- Card presented (swipe/insert/tap/keyed)
- Authorization
- **Tip entry** (customer enters on device or paper receipt)
- Signature (optional based on amount)
- Receipt (digital/printed)

### Cash
```
OPEN → CLOSED
```
- Amount tendered
- Change calculated
- Drawer opens
- **Tip entry** (optional - server enters cash tip manually)

### Pre-Paid (Online)
```
OPEN → PAID → CLOSED
```
- **Online Price Adjustment applied** (if enabled in Control Panel)
- **Delivery Fee added** (for delivery orders, if configured)
- Payment at checkout
- **Tip entry** (customer selects tip during online checkout)
- check.paymentStatus = CLOSED on order creation

---

## SETTINGS TO IMPLEMENT — ✅ IMPLEMENTED (Sessions 11-13)

**Status:** Control Panel component complete with 4 tabs: Printers (T1-08 Session 11-12), AI Settings (Session 13), Online Pricing (Session 13), Catering Calendar (Session 13). Backend CloudPRNT integration ✅ COMPLETE. All settings tabs fully implemented with role-based access (owner/manager/super_admin = edit, staff = view only), local form signals with save/discard pattern, localStorage + backend PATCH persistence.

### Control Panel - AI Settings — ✅ IMPLEMENTED (Session 13)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable AI Order Approval | Toggle | On | Master switch for AI approval system |
| **Course Pacing Mode** | Dropdown | Disabled | 3-way selector: Disabled (all items fire immediately), Server Fires (manual per-course fire), Auto-Fire Timed (auto-fire after delay when previous course completes) |
| **Catering Approval Timeout** | Hours | 24 | Auto-reject catering orders awaiting approval after this many hours |
| Time threshold | Hours | 12 | Orders scheduled beyond this require AI review |
| Value threshold | Currency | $200 | Orders over this value require AI review |
| Quantity threshold | Number | 20 | Orders over this item count require AI review |

**Frontend:** `AiSettings` component in `settings/ai-settings/`. Three panels (AI Order Approval with 3 threshold inputs, Catering Approval Timeout with hours input, Course Pacing Mode dropdown with dynamic description). Computed threshold and timeout descriptions. Save/Discard action bar. Role-based view-only for staff.

### Control Panel - Online Order Pricing — ✅ IMPLEMENTED (Session 13)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable Online Price Adjustment | Toggle | Off | Apply price adjustments to online orders |
| Price Adjustment Type | Dropdown | Percentage | Percentage / Flat fee per item |
| Price Adjustment Amount | Number | 0 | Percentage (e.g., 5%) or flat amount (e.g., $0.50) added to each item |
| Delivery Fee | Currency | $0.00 | Flat delivery fee added to delivery orders |
| Show Adjustment to Customer | Toggle | On | Display "Online ordering fee" or bake into item prices |

**Use Cases:**
- Offset higher online payment processing fees (2.9% vs 2.29% in-person)
- Cover third-party delivery costs without eating margin
- Transparent pricing vs hidden in menu prices

**Frontend:** `OnlinePricing` component in `settings/online-pricing/`. Enable toggle, adjustment type dropdown, amount input, delivery fee, customer visibility toggle. Price Preview panel with 4 computed KPI cards ($10 base → online price → delivery fee → customer total). Save/Discard. Role-based view-only.

### Control Panel - Catering Calendar — ✅ IMPLEMENTED (Session 13)

| Setting | Type | Description |
|---------|------|-------------|
| Calendar Access | Role-based | Manager/Owner: edit, Staff: view |
| Max Events Per Day | Number | Default 3 — capacity threshold |
| Max Headcount Per Day | Number | Default 200 — capacity threshold |
| Capacity Blocks | CRUD | Block dates/times for private events |
| Catering Events | Calendar view | Scheduled catering orders from backend |
| Conflict Alerts | Toggle | Warn when new order conflicts with existing |

**Frontend:** `CateringCalendar` component in `settings/catering-calendar/`. KPI strip (upcoming events, total headcount, conflict days, pending approvals). Capacity settings panel with save/discard. 7-column CSS Grid month calendar with color-coded cells (today, past, over-capacity red border, has-block orange border). Day detail panel with event cards (customer, time, headcount, event type, approval badge, deposit status, special instructions) and capacity block management (add/remove). Role-based access.

### Bartender Settings
| Setting | Options |
|---------|---------|
| Food delivery method | Server delivers / Bartender delivers / Expo calls |
| Tip allocation | Bar only / Split with server / Pool |

### [FUTURE] Expo Settings
*Not in initial release - for larger operations*

### KDS Actions
- **Bump ticket** → fulfillmentStatus = READY → Notification to device that placed order
- **86 item** → Flag unavailable → Blocks ordering → Notifies all server devices → **AI uses this data for future order evaluations**
- **Un-86 item** → Item available again
- **Recall ticket** → ✅ IMPLEMENTED (Session 15) — Bring back bumped ticket (mistake correction). Moves order backward one status (READY→COOKING, COOKING→NEW). Clears print status and timeout on recall. Backend PATCH endpoint must accept backward transitions.

---

## APPLICATION ARCHITECTURE — ✅ IMPLEMENTED

**Status:** All 23 frontend components registered as Web Components and deployed to WordPress. Backend API complete with Claude AI integration (Sonnet 4), PostgreSQL via Supabase/Prisma.

**Stack:** Angular 21 (latest), Angular Elements packaged as Web Components, Bootstrap SCSS 5.3.8

```
GetOrderStack Applications
├── Restaurant Frontend (Angular Elements - Web Components)
│   ├── get-order-stack-sos-terminal      # Self-Order System (Server/Cashier/Bartender)
│   ├── get-order-stack-kds-display       # Kitchen Display System
│   ├── get-order-stack-login             # Authentication
│   ├── get-order-stack-restaurant-select # Restaurant selector
│   ├── get-order-stack-command-center    # AI Analytics Dashboard
│   ├── get-order-stack-menu-engineering  # Menu Engineering Quadrants
│   ├── get-order-stack-sales-dashboard   # Sales Insights
│   ├── get-order-stack-inventory-dashboard # Inventory Management
│   ├── get-order-stack-category-management # Menu Category CRUD
│   ├── get-order-stack-item-management   # Menu Item CRUD
│   ├── get-order-stack-floor-plan        # Table Management
│   ├── get-order-stack-crm               # Customer CRM
│   ├── get-order-stack-reservations      # Reservation Manager
│   ├── get-order-stack-ai-chat           # AI Chat Assistant
│   ├── get-order-stack-online-ordering   # Customer-Facing Online Orders
│   ├── get-order-stack-monitoring-agent  # Autonomous Monitoring
│   ├── get-order-stack-voice-order       # Voice AI Ordering
│   ├── get-order-stack-dynamic-pricing   # Dynamic Menu Pricing
│   ├── get-order-stack-waste-tracker     # AI Waste Reduction
│   ├── get-order-stack-sentiment         # Sentiment Analysis
│   ├── get-order-stack-pending-orders   # Pending Order Management
│   ├── get-order-stack-order-history    # Order History
│   └── get-order-stack-control-panel    # Settings (Printers, AI, Pricing, Catering)
│
├── Restaurant Backend (Express.js + TypeScript)
│   ├── REST API endpoints
│   ├── WebSocket real-time updates
│   ├── Claude AI integration (Sonnet 4)
│   └── PostgreSQL via Supabase/Prisma
│
└── Restaurant Mobile [FUTURE] (React Native)
    └── Server/Cashier BYOD app
```

**Angular Elements Pattern:**
- Multi-project workspace: Library + Elements app
- `createApplication()` + `provideZonelessChangeDetection()` (no Zone.js)
- `createCustomElement()` + `customElements.define()` for Web Component registration
- Loaded via `wp_enqueue_script_module()` for scope isolation
- BYOD: Works on any device with a browser (tablets, phones, laptops)

**Shared Components:**
- Order data models
- Ticket rendering
- Menu item display
- Real-time sync (Socket.io)
- Auth/role system
- Notification system

---

## TIMESTAMPS — ✅ IMPLEMENTED

**Status:** All timestamp fields defined in Order model and tracked throughout order lifecycle in KDS, SOS Terminal, and Order History components.

| Field | Set When |
|-------|----------|
| createdDate | Order/check/item created |
| openedDate | Order opened |
| promisedDate | Scheduled time |
| modifiedDate | Any change |
| **sentDate** | Order sent to kitchen (fulfillmentStatus → SENT) |
| **prepStartDate** | Kitchen starts preparing (first item touched) |
| **readyDate** | Cook taps "Done" (fulfillmentStatus → READY) |
| **pickedUpDate** | Order picked up by customer (Takeout/Curbside) |
| paidDate | Payment applied |
| closedDate | Fully settled |
| dispatchedDate | Delivery dispatched (driver has order) |
| deliveredDate | Delivered to customer |
| voidDate | Voided |

**Calculated Metrics:**
| Metric | Calculation |
|--------|-------------|
| **Ticket Time** | readyDate - sentDate (kitchen speed) |
| **Wait Time** | pickedUpDate - readyDate (customer wait after ready) |
| **Total Time** | pickedUpDate - createdDate (end-to-end) |

---

## ERROR/EDGE CASES — 🚧 PARTIALLY IMPLEMENTED

**Status:** Core error handling and resilience features implemented: card declined (Stripe), item 86'd (T2-02), payment errors (Stripe flow), offline order queuing (localStorage queue with auto-sync on reconnect), catering approval timeout (configurable auto-reject with countdown UI). Order throttling not yet implemented.

| Scenario | Behavior | Status |
|----------|----------|--------|
| Network offline | Offline mode — orders queued in localStorage, auto-synced on reconnect | ✅ IMPLEMENTED |
| Card declined | Display error, retry/alternate | ✅ IMPLEMENTED |
| Item 86'd | Block from selection | ✅ IMPLEMENTED |
| Order throttled | Delay firing | 📋 PLANNED |
| Approval timeout | Auto-reject after configurable hours (default 24h) | ✅ IMPLEMENTED |
| Void after payment | Refund initiated | ✅ IMPLEMENTED |

### Offline Mode (Session 16)
- `SocketService.isOnline` computed: requires BOTH `navigator.onLine` AND socket connected
- `OrderService.createOrder()` checks `isOnline()` before HTTP POST — queues locally when offline
- Queued orders saved to localStorage (restaurant-scoped), auto-synced sequentially on reconnect
- Placeholder orders shown in PendingOrders with "Queued" badge and disabled action buttons
- Replaced by real orders after sync; retry on failure with count tracking
- `CheckoutModal` now routes through `OrderService.createOrder()` instead of direct `HttpClient.post()`

### Catering Approval Timeout (Session 16)
- Configurable `approvalTimeoutHours` in AI Settings (default: 24 hours)
- 60-second interval checks pending approval orders against timeout
- Countdown display in PendingOrders ("Xh Xm remaining") with urgent pulse animation (< 1h)
- Auto-reject fires when elapsed time exceeds timeout — with deduplication guard

---

## INTEGRATION POINTS — 🚧 PARTIALLY IMPLEMENTED

**Status:** KDS real-time sync (WebSocket) ✅, kitchen printers (T1-08 CloudPRNT ✅ COMPLETE — frontend PrinterSettings + Control Panel, backend all 8 phases), payment processor (Stripe ✅, PayPal Zettle 📋 PLANNED), online ordering (T3-04) ✅, dining options (frontend + backend validation) ✅, offline mode (localStorage queue + auto-sync) ✅. Third-party delivery, loyalty, accounting, and payroll integrations not yet implemented.

| System | Method |
|--------|--------|
| KDS | Real-time sync |
| Kitchen printers | Print on fire |
| Payment processor | PayPal Zettle |
| Online ordering | GetOrderStack Online |
| Third-party delivery | DoorDash, Uber, Grubhub APIs |
| Loyalty | API integration |
| Reporting | Dashboard |
| Accounting | See below |
| Payroll | See below |

---

## ACCOUNTING & PAYROLL INTEGRATIONS — 🔬 RESEARCH

**⚠️ THIS SECTION IS FLUID — NEEDS MORE RESEARCH**

**Status:** Requirements defined, no implementation yet. QuickBooks Online, Xero, Gusto integrations pending partnership/API access.

### Accounting Systems

| System | Integration Method | Priority | Notes |
|--------|-------------------|----------|-------|
| **QuickBooks Online** | REST API | HIGH | Most common for small business |
| **Xero** | REST API | MEDIUM | Popular alternative to QBO |
| **FreshBooks** | REST API | LOW | Simpler, freelancer-focused |
| **Wave** | Limited API | LOW | Free option, limited integration |

**Data to Sync:**
- Daily sales summary (revenue, tax collected, tips)
- Payment method breakdown (cash, card, online)
- Refunds and voids
- Cost of goods sold (if inventory tracked)
- Category-level sales (food, beverage, merchandise)

**Sync Frequency Options:**
- Real-time (each transaction)
- End of day (daily summary)
- Manual export (CSV/Excel)

### Payroll Systems

| System | Integration Method | Priority | Notes |
|--------|-------------------|----------|-------|
| **Gusto** | REST API | HIGH | Popular for small business, tip reporting |
| **ADP Run** | API | MEDIUM | Enterprise-grade |
| **Paychex** | API | MEDIUM | Common in restaurant industry |
| **Square Payroll** | N/A | LOW | Competitor - unlikely to integrate |
| **Toast Payroll** | N/A | LOW | Competitor - won't integrate |

**Data to Sync:**
- Hours worked (if time clock integrated)
- Tips by employee (credit card tips)
- Cash tips declared
- Tip pooling/tip-out calculations
- Overtime calculations

### Tier-Based Integration Features

| Feature | Starter | Growth | Pro |
|---------|---------|--------|-----|
| Manual CSV export | ✓ | ✓ | ✓ |
| QuickBooks Online sync | — | ✓ | ✓ |
| Xero sync | — | ✓ | ✓ |
| Payroll tip export | — | — | ✓ |
| Gusto integration | — | — | ✓ |
| Custom API access | — | — | ✓ |

### Control Panel - Integrations Settings

| Setting | Type | Description |
|---------|------|-------------|
| QuickBooks Connected | Toggle + OAuth | Connect/disconnect QBO account |
| QBO Sync Frequency | Dropdown | Real-time / Daily / Manual |
| QBO Sales Account | Dropdown | Which QBO account for sales |
| QBO Tax Account | Dropdown | Which QBO account for tax collected |
| Xero Connected | Toggle + OAuth | Connect/disconnect Xero account |
| Gusto Connected | Toggle + OAuth | Connect/disconnect Gusto account |
| Tip Export Format | Dropdown | CSV / Gusto API / ADP format |

### Research TODO

- [ ] QuickBooks Online API requirements and costs
- [ ] Xero API partnership program
- [ ] Gusto API access (partner program?)
- [ ] What data format do payroll systems expect for tips?
- [ ] PCI compliance implications of storing employee data
- [ ] Competitor integrations (what does Toast/Square offer?)

---

## PAYMENT PROCESSING - PAYPAL ZETTLE — 📋 PLANNED (Using Stripe Instead)

**Status:** Current implementation uses Stripe (T1-07 complete). PayPal Zettle integration not implemented. Cost analysis and comparison below remains valid for future consideration.

**Why PayPal Zettle?**
- Lowest flat-rate processing fees of any major processor
- No monthly fees
- Third-party POS integration via API (unlike Square/Toast which lock you in)
- Trusted brand customers recognize

**Processing Fees:**

| Transaction Type | PayPal Zettle | vs Stripe | vs Square |
|------------------|---------------|-----------|-----------|
| In-person (card present) | **2.29% + $0.09** | 2.7% + $0.05 | 2.6% + $0.10 |
| Manual entry (keyed) | 3.49% + $0.09 | 3.4% + $0.30 | 3.5% + $0.15 |
| Monthly fee | **$0** | $0 | $0 |

**Monthly Cost Comparison ($80K/month volume, 2,000 transactions):**

| Processor | Percentage Fee | Per-Txn Fee | Total Monthly |
|-----------|----------------|-------------|---------------|
| **PayPal Zettle** | $1,832 | $180 | **$2,012** |
| Square | $2,080 | $200 | $2,280 |
| Stripe Terminal | $2,160 | $100 | $2,260 |

**Annual Savings vs Stripe: $2,976** | **Annual Savings vs Square: $3,216**

**PayPal Zettle Hardware:**

| Device | Price | Notes |
|--------|-------|-------|
| Zettle Reader 2 | **$29** (first) | Bluetooth card reader - loss leader pricing |
| Additional readers | $79 each | Still cheaper than Stripe M2 ($59) at 1-2 units |
| Zettle Terminal | $199 | All-in-one with built-in POS app |
| Terminal + Barcode | $239 | Terminal with scanner |
| Store Kit Mini | $229 | Reader + dock + tablet stand |

**Integration:**
- Zettle SDK available for third-party POS integration
- REST API for payment processing
- Works with GetOrderStack mobile and frontend apps

---

## HARDWARE COMPARISON: GETORDERSTACK vs COMPETITORS — 🔬 RESEARCH

**⚠️ THIS SECTION IS FLUID — NEEDS MORE RESEARCH**

**Status:** BYOD architecture proven with deployed Web Components. Printer management UI complete (T1-08). Hardware recommendations and cost comparisons need verification with current market prices.

**TODO:**
- [ ] Finalize tier pricing (Starter/Growth/Pro) and what's included
- [ ] Research current competitor hardware prices (verify Toast/Square/Clover)
- [ ] Research compatible receipt printers (ESC/POS, Bluetooth vs USB vs Ethernet)
- [ ] Research compatible cash drawers (RJ11/RJ12 trigger)
- [ ] Investigate tablet recommendations (iPad vs Android, min specs)
- [ ] PayPal Zettle hardware bundles and bulk pricing
- [ ] Verify Star mPOP current pricing and availability

---

### Proprietary Hardware Costs (NEEDS VERIFICATION)

| Competitor | Terminal | Handheld | KDS | Total Startup |
|------------|----------|----------|-----|---------------|
| **Toast** | $799-$1,034 | $627+ (Toast Go) | $449 | $1,800+ |
| **Square** | $799 (Register) | $399 (Terminal) | $449 | $1,200+ |
| **Clover** | $799-$1,349 | $499+ (Flex) | Custom | $1,500+ |
| **SkyTab** | Included* | Included* | Custom | "Free" w/ contract |
| **SpotOn** | Included* | Included* | Custom | "Free" w/ contract |

*"Included" = locked into processing contract, hardware reclaimed if you leave

### GetOrderStack BYOD + Off-the-Shelf Hardware (DRAFT)

| Component | Option | Price | Notes |
|-----------|--------|-------|-------|
| **POS Terminal** | Customer's iPad/Android tablet | $0-$400 | BYOD - use what you have |
| | Refurbished iPad | $150-$250 | Works great |
| **Card Reader** | PayPal Zettle Reader 2 | **$29** | First reader - best deal |
| | Additional Zettle readers | $79 each | Still competitive |
| | Zettle Terminal | $199 | All-in-one option |
| **Printer + Drawer** | Star mPOP combo | $460-$640 | Printer + drawer + tablet stand |
| | Separate printer | $150-$200 | Epson TM-M30, Star TSP143 |
| | Separate cash drawer | $50-$100 | Standard RJ11 drawer |
| **KDS Display** | Any tablet | $100-$300 | Wall-mounted Android/iPad |
| | Fire HD 10 | $150 | Budget option |

### Total Startup Cost Comparison (DRAFT)

| Setup | Toast | Square | GetOrderStack |
|-------|-------|--------|---------------|
| **Basic** (1 terminal, card reader, printer, drawer) | $1,500+ | $1,000+ | $460-$710 |
| **Standard** (+ handheld + KDS) | $2,500+ | $1,850+ | $700-$1,100 |
| **Full** (2 terminals, 2 handhelds, 2 KDS) | $4,500+ | $3,500+ | $1,200-$1,800 |

### Savings Example (DRAFT)

**Restaurant needs: 1 POS terminal, 1 handheld for servers, 1 KDS, card reader**

| | Toast | GetOrderStack | Savings |
|---|-------|---------------|---------|
| POS Terminal | $799 | $0 (use existing iPad) | $799 |
| Handheld | $627 | $0 (server's phone) | $627 |
| KDS | $449 | $150 (Fire tablet) | $299 |
| Card Reader | Included | $29 (Zettle Reader) | -$29 |
| Printer | $350 | $460 (Star mPOP w/drawer) | -$110 |
| Cash Drawer | $120 | Included in mPOP | $120 |
| **TOTAL** | **$2,345** | **$639** | **$1,706 saved** |

**Plus annual processing savings:**
- PayPal Zettle vs Toast Payments: ~$3,600/year (Toast charges 2.99%+)
- **Total Year 1 Savings: $5,300+**

---

## TIP MANAGEMENT — 🚧 PARTIALLY IMPLEMENTED

**Status:** Basic tip capture implemented in Stripe payment flow (T1-07) and online checkout (T3-04). Tip pooling, tip-out rules, compliance reports, and payroll export not yet implemented (defined as Pro tier features).

### Tier-Based Features

| Feature | Starter | Growth | Pro |
|---------|---------|--------|-----|
| Tip capture (PayPal Zettle) | — | ✓ | ✓ |
| Tip report by server | — | ✓ | ✓ |
| Tip pooling | — | — | ✓ |
| Tip-out rules | — | — | ✓ |
| Tip compliance reports | — | — | ✓ |
| Payroll export | — | — | ✓ |

### Tip Scenarios

| Scenario | How It Works |
|----------|--------------|
| Digital tip (tablet/handheld) | Captured at payment via PayPal Zettle |
| Paper receipt tip | Server enters later via Tip Adjust |
| Cash tip | Manual entry (optional) |
| No tip ($0) | Tracked separately from "not entered" |

### Bartender Tip Settings

| Setting | Options |
|---------|---------|
| Tip allocation | Bar only / Split with server / Pool |
| Food delivery | Server delivers / Bartender delivers / Expo calls |

### Premium Tip Features (Pro Tier)

| Feature | Description |
|---------|-------------|
| Tip pooling | Combine tips, split evenly or by hours worked |
| Tip-out rules | "Bar gets 10% of drink sales tips" |
| Tip compliance | Track minimum wage + tips for labor law |
| Tip reports | By server, shift, pay period |
| Payroll export | Send tip data to payroll system |

---

*Document Version: 4.8*
*Last Updated: 2026-02-12 (Status refresh — all statuses verified against codebase)*
*Location: Get-Order-Stack-Restaurant-Frontend-Workspace/Get-Order-Stack-Workflow.md*

## IMPLEMENTATION SUMMARY

**Completed (All 4 Tiers):**
- ✅ **T1 (8/8):** AI Upsell, Menu Engineering, Sales Dashboard, Order Profit Insights, Inventory Dashboard, AI Cost Estimation, Stripe Payments, Receipt Printing (T1-08 ✅ COMPLETE)
- ✅ **T2 (5/6):** Smart KDS, Auto-86, AI Menu Badges, Priority Notifications, Table Floor Plan (Multi-Device Routing deferred — no backend)
- ✅ **T3 (6/6):** AI Command Center, Customer CRM, Online Ordering Portal, Reservation Manager, AI Chat Assistant
- ✅ **T4 (5/5):** Autonomous Monitoring, Voice AI, Dynamic Pricing, Waste Reduction, Sentiment Analysis
- ✅ **T1-08 Receipt Printing (CloudPRNT) — COMPLETE (Session 12):**
  - ✅ Frontend: Control Panel + PrinterSettings UI (CRUD, CloudPRNT config, MAC validation, test print, status indicators)
  - ✅ Backend: All 8 phases complete (schema, DTOs, Star Line Mode, services, routes, order flow integration, WebSocket events, cleanup job)
- ✅ **Dining Options:** COMPLETE (frontend + backend)
  - ✅ Frontend (Session 11): 5 dining types in Online Portal, OrderHistory, Checkout, ReceiptPrinter
  - ✅ Backend (Session 12): Zod validation, query filtering (deliveryStatus, approvalStatus), API documentation

**Frontend:** 23 Web Components registered and deployed to WordPress (geekatyourspot.com)
**Backend:** Claude AI services (Sonnet 4), PostgreSQL/Prisma, WebSocket + polling, Stripe integration

**Remaining:**
- 🚧 AI auto-fire course pacing — backend execution pending (frontend UI complete: mode selector, manual fire, course notifications, recall ticket)
- 📋 Order throttling — not yet implemented
- 📋 Expo Station UI — toggle exists in data model, UI not yet surfaced in Control Panel
- 🔬 Third-party delivery, loyalty, accounting/payroll integrations (research phase)
- 📋 PayPal Zettle switch (currently Stripe)
- 📋 Tip pooling, tip-out rules, compliance reporting (Pro tier)
- ⏭️ T2-04 Multi-Device KDS Routing — deferred (no backend station-category mapping)
- ⏭️ T3-03 Labor Intelligence / Staff Scheduling — deferred (no backend schema)
