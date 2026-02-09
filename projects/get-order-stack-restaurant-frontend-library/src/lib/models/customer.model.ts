export interface Customer {
  id: string;
  restaurantId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number | null;
  lastOrderDate: string | null;
  loyaltyPoints: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CustomerSegment = 'vip' | 'regular' | 'new' | 'at-risk' | 'dormant';

export interface CustomerSegmentInfo {
  segment: CustomerSegment;
  label: string;
  cssClass: string;
  description: string;
}

export type CrmTab = 'customers' | 'segments' | 'insights';
export type CrmSortField = 'name' | 'totalSpent' | 'totalOrders' | 'lastOrderDate' | 'loyaltyPoints';
