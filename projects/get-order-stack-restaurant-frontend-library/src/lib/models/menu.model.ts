export interface MenuCategory {
  id: string;
  restaurantId?: string;
  slug?: string;
  name: string;
  nameEs?: string;
  nameEn?: string;
  description?: string;        // Spanish (default)
  descriptionEn?: string;      // English
  description_en?: string;     // API may use snake_case
  icon?: string;
  displayOrder: number;
  parentId?: string;
  subcategories?: MenuCategory[];
  items?: MenuItem[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  categoryId?: string;
  name: string;
  nameEs?: string;
  nameEn?: string;
  description?: string;        // Default description
  descriptionEs?: string;      // Spanish
  descriptionEn?: string;      // English
  description_es?: string;     // API may use snake_case
  description_en?: string;     // API may use snake_case
  price: number | string;
  cost?: number;
  image?: string;
  displayOrder?: number;
  modifierGroups?: ModifierGroup[];
  dietary?: DietaryInfo[];
  popular?: boolean;
  isPopular?: boolean;
  isActive?: boolean;
  prepTimeMinutes?: number;
  aiEstimatedCost?: number;
  aiSuggestedPrice?: number;
  aiProfitMargin?: number;
  aiConfidence?: 'high' | 'medium' | 'low';
  aiLastUpdated?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
}

export type DietaryInfo = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'spicy' | 'halal' | 'kosher';

export interface AICostEstimation {
  estimatedCost: number;
  suggestedPrice: number;
  profitMargin: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface AICostEstimationResponse {
  item: MenuItem;
  estimation: AICostEstimation;
}

export interface AIBatchResponse {
  message: string;
  itemsProcessed: number;
  itemsEstimated?: number;
  itemsGenerated?: number;
}

export interface GroupedMenu {
  categories: MenuCategory[];
}
