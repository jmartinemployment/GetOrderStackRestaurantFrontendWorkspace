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
export { PrinterService } from './lib/services/printer';
export { RestaurantSettingsService } from './lib/services/restaurant-settings';
export { SocketService } from './lib/services/socket';
export type { SocketConnectionStatus, OrderEvent } from './lib/services/socket';

// Shared components
export { LoadingSpinner } from './lib/shared/loading-spinner/loading-spinner';
export { ErrorDisplay } from './lib/shared/error-display/error-display';
export { ConnectionStatus } from './lib/shared/connection-status/connection-status';

// Auth components
export { Login } from './lib/auth/login/login';
export { RestaurantSelect } from './lib/auth/restaurant-select/restaurant-select';

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

// Table Management components
export { FloorPlan } from './lib/table-mgmt/floor-plan/floor-plan';

// Settings components
export { ControlPanel } from './lib/settings/control-panel';

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

// Additional services
export { ChatService } from './lib/services/chat';
export { CustomerService } from './lib/services/customer';
export { MonitoringService } from './lib/services/monitoring';
export { ReservationService } from './lib/services/reservation';
