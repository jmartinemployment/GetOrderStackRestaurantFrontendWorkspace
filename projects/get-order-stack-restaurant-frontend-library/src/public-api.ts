/*
 * Public API Surface of get-order-stack-restaurant-frontend-library
 */

// Environment
export * from './lib/environments/environment';

// Models
export * from './lib/models';

// Services
export { AnalyticsService } from './lib/services/analytics';
export { AuthService } from './lib/services/auth';
export { InventoryService } from './lib/services/inventory';
export { PaymentService } from './lib/services/payment';
export { MenuService } from './lib/services/menu';
export { CartService } from './lib/services/cart';
export { OrderService } from './lib/services/order';
export type { MappedOrderEvent } from './lib/services/order';
export { TableService } from './lib/services/table';
export { TipService } from './lib/services/tip';
export { PrinterService } from './lib/services/printer';
export { RestaurantSettingsService } from './lib/services/restaurant-settings';
export { SocketService } from './lib/services/socket';
export type { SocketConnectionStatus, OrderEvent, DeliveryLocationEvent } from './lib/services/socket';
export { StripePaymentProvider } from './lib/services/providers/stripe-provider';
export { PayPalPaymentProvider } from './lib/services/providers/paypal-provider';
export { DoorDashDeliveryProvider } from './lib/services/providers/doordash-provider';
export { UberDeliveryProvider } from './lib/services/providers/uber-provider';
export { DeliveryService } from './lib/services/delivery';
export type { DeliveryConfigStatus } from './lib/services/delivery';

// Shared components
export { LoadingSpinner } from './lib/shared/loading-spinner/loading-spinner';
export { ErrorDisplay } from './lib/shared/error-display/error-display';
export { ConnectionStatus } from './lib/shared/connection-status/connection-status';

// Shared utilities
export { exportToCsv } from './lib/shared/utils/csv-export';

// Auth components
export { Login } from './lib/auth/login/login';
export { RestaurantSelect } from './lib/auth/restaurant-select/restaurant-select';
export { PosLogin } from './lib/auth/pos-login';
export type { PosLoginEvent } from './lib/auth/pos-login';

// SOS components
export { MenuDisplay } from './lib/sos/menu-display/menu-display';
export { MenuItemCard } from './lib/sos/menu-item-card/menu-item-card';
export { SosTerminal } from './lib/sos/sos-terminal/sos-terminal';
export { CartDrawer } from './lib/sos/cart-drawer/cart-drawer';
export { CheckoutModal } from './lib/sos/checkout-modal/checkout-modal';
export { UpsellBar } from './lib/sos/upsell-bar/upsell-bar';
export { OrderNotifications } from './lib/sos/order-notifications/order-notifications';

// KDS components
export { KdsDisplay } from './lib/kds/kds-display/kds-display';
export { OrderCard } from './lib/kds/order-card/order-card';
export { StatusBadge } from './lib/kds/status-badge/status-badge';

// Orders components
export { PendingOrders } from './lib/orders/pending-orders/pending-orders';
export { OrderHistory } from './lib/orders/order-history/order-history';
export { ReceiptPrinter } from './lib/orders/receipt-printer/receipt-printer';

// Analytics components
export { CommandCenter } from './lib/analytics/command-center/command-center';
export { MenuEngineeringDashboard } from './lib/analytics/menu-engineering-dashboard/menu-engineering-dashboard';
export { SalesDashboard } from './lib/analytics/sales-dashboard/sales-dashboard';

// Inventory components
export { InventoryDashboard } from './lib/inventory/inventory-dashboard/inventory-dashboard';

// Menu Management components
export { CategoryManagement } from './lib/menu-mgmt/category-management/category-management';
export { ItemManagement } from './lib/menu-mgmt/item-management/item-management';
export { ModifierManagement } from './lib/menu-mgmt/modifier-management';
export { ModifierService } from './lib/services/modifier';

// Table Management components
export { FloorPlan } from './lib/table-mgmt/floor-plan/floor-plan';

// Settings components
export { ControlPanel } from './lib/settings/control-panel';

// Tip Management components
export { TipManagement } from './lib/tip-mgmt/tip-management';

// CRM components
export { CustomerDashboard } from './lib/crm/customer-dashboard/customer-dashboard';

// Reservation components
export { ReservationManager } from './lib/reservations/reservation-manager/reservation-manager';

// Online Ordering components
export { OnlineOrderPortal } from './lib/online-ordering/online-order-portal';

// AI Chat components
export { ChatAssistant } from './lib/ai-chat/chat-assistant/chat-assistant';

// Monitoring components
export { MonitoringAgent } from './lib/monitoring/monitoring-agent';

// Voice Ordering components
export { VoiceOrder } from './lib/voice-ordering/voice-order';

// Dynamic Pricing components
export { DynamicPricing } from './lib/pricing/dynamic-pricing';

// Waste Reduction components
export { WasteTracker } from './lib/waste/waste-tracker';

// Sentiment Analysis components
export { SentimentDashboard } from './lib/sentiment/sentiment-dashboard';

// Station service
export { StationService } from './lib/services/station';

// Check service (POS)
export { CheckService } from './lib/services/check';
export type {
  AddItemRequest,
  SplitByItemRequest,
  SplitByEqualRequest,
  TransferCheckRequest,
  DiscountRequest,
  VoidItemRequest,
  CompItemRequest,
  OpenTabRequest,
} from './lib/services/check';

// POS components
export { ServerPosTerminal } from './lib/pos/server-pos-terminal';
export { OrderPad } from './lib/pos/order-pad';
export { ModifierPrompt } from './lib/pos/modifier-prompt';
export type { ModifierPromptResult } from './lib/pos/modifier-prompt';
export { DiscountModal } from './lib/pos/discount-modal';
export type { DiscountResult } from './lib/pos/discount-modal';
export { VoidModal } from './lib/pos/void-modal';
export type { VoidResult, CompResult } from './lib/pos/void-modal';
export { ManagerPinPrompt } from './lib/pos/manager-pin-prompt';

// Floor plan event types
export type { TableSelectedEvent } from './lib/table-mgmt/floor-plan/floor-plan';

// Reports components
export { CloseOfDay } from './lib/reports/close-of-day';

// Cash Drawer
export { CashDrawerService } from './lib/services/cash-drawer';
export { CashDrawer } from './lib/pos/cash-drawer';

// Kiosk
export { KioskTerminal } from './lib/kiosk/kiosk-terminal';

// Labor components
export { StaffScheduling } from './lib/labor/staff-scheduling';
export { LaborService } from './lib/services/labor';

// Gift Card
export { GiftCardService } from './lib/services/gift-card';
export { GiftCardManagement } from './lib/settings/gift-card-management';

// Marketing components
export { MarketingService } from './lib/services/marketing';
export { CampaignBuilder } from './lib/marketing/campaign-builder';

// Invoicing components
export { InvoiceService } from './lib/services/invoice';
export { InvoiceManager } from './lib/invoicing/invoice-manager';

// Combo Management components
export { ComboService } from './lib/services/combo';
export { ComboManagement } from './lib/menu-mgmt/combo-management';

// Staff Portal
export { StaffPortal } from './lib/staff/staff-portal';

// Multi-Location Management
export { MultiLocationService } from './lib/services/multi-location';
export { MultiLocationDashboard } from './lib/multi-location/multi-location-dashboard';

// Food Cost / AP Automation
export { VendorService } from './lib/services/vendor';
export { RecipeCostingService } from './lib/services/recipe-costing';
export { FoodCostDashboard } from './lib/food-cost/food-cost-dashboard';

// Staff Management
export { StaffManagementService } from './lib/services/staff-management';
export { StaffManagement } from './lib/settings/staff-management';

// Device Management
export { DeviceManagement } from './lib/settings/device-management';

// Break / Time Clock Configuration
export { BreakConfig } from './lib/settings/break-config';

// Permission Guard
export { createPermissionGuard, createManagerOverride } from './lib/shared/utils/permission-guard';
export type { PermissionGuard, ManagerOverrideState } from './lib/shared/utils/permission-guard';

// Onboarding
export { SetupWizard } from './lib/onboarding/setup-wizard';

// Platform service
export { PlatformService } from './lib/services/platform';
export type { OnboardingPayload, OnboardingResult } from './lib/services/platform';

// Additional services
export { ChatService } from './lib/services/chat';
export { CustomerService } from './lib/services/customer';
export { LoyaltyService } from './lib/services/loyalty';
export { MonitoringService } from './lib/services/monitoring';
export { ReservationService } from './lib/services/reservation';
