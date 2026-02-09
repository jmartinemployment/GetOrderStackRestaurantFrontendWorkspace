export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'maintenance';

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  tableNumber: string;
  tableName: string | null;
  capacity: number;
  section: string | null;
  status: string;
  posX: number | null;
  posY: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableFormData {
  tableNumber: string;
  tableName?: string;
  capacity: number;
  section?: string;
  posX?: number;
  posY?: number;
}
