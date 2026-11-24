import api from './api';

export type ProductCategory = 'sunscreen' | 'serum' | 'cleanser' | 'moisturizer' | 'accessory' | 'other';
export type MovementType = 'in' | 'out';
export type MovementReason = 'initial' | 'purchase' | 'sale' | 'internal_use' | 'loss' | 'adjustment';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  sunscreen: 'Protector solar',
  serum: 'Sérum',
  cleanser: 'Limpieza',
  moisturizer: 'Hidratación / reparación',
  accessory: 'Accesorios',
  other: 'Otros',
};

export const REASON_LABELS: Record<MovementReason, string> = {
  initial: 'Inventario inicial',
  purchase: 'Compra / reposición',
  sale: 'Venta',
  internal_use: 'Muestra o uso interno',
  loss: 'Merma (dañado / vencido)',
  adjustment: 'Ajuste por conteo',
};

// Mismo criterio que el backend: "initial" sólo se registra al crear el producto.
export const REASONS_BY_TYPE: Record<MovementType, MovementReason[]> = {
  in: ['purchase', 'adjustment'],
  out: ['sale', 'internal_use', 'loss', 'adjustment'],
};

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory;
  presentation: string | null;
  salePrice: string | number;
  stock: number;
  minStock: number;
  photoUrl: string | null;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: UserSummary;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  stockAfter: number;
  note: string | null;
  createdAt: string;
  createdBy: UserSummary;
}

export interface ProductFormData {
  name: string;
  brand?: string | null;
  category: ProductCategory;
  presentation?: string | null;
  salePrice: number;
  minStock: number;
  barcode?: string | null;
  isActive?: boolean;
  initialStock?: number;
}

export interface MovementFormData {
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  note?: string;
}

export interface BatchMovementRow {
  productId: string;
  /** Stock que mostraba la pantalla: si cambió, la API rechaza todo el registro. */
  expectedStock: number;
  in?: { quantity: number; reason: MovementReason };
  out?: { quantity: number; reason: MovementReason };
  note?: string;
}

export interface BatchMovementResult {
  movements: number;
  stocks: { productId: string; stock: number }[];
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  lowStock?: boolean;
  includeInactive?: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export { apiErrorMessage } from '../utils/apiError';

export const canManageInventory = (roleName: string) => roleName === 'admin' || roleName === 'inventory';

export const isLowStock = (p: Pick<Product, 'stock' | 'minStock'>) => p.stock <= p.minStock;

export const formatPrice = (value: string | number) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const inventoryService = {
  async getProducts(filters: ProductFilters = {}): Promise<Paginated<Product> & { lowStockCount: number }> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== '' && v !== false)
    );
    const response = await api.get('/inventory/products', { params });
    return response.data;
  },

  async getBrands(): Promise<string[]> {
    const response = await api.get<{ data: string[] }>('/inventory/products/brands');
    return response.data.data;
  },

  async getProduct(id: string): Promise<Product> {
    const response = await api.get<{ data: Product }>(`/inventory/products/${id}`);
    return response.data.data;
  },

  async createProduct(data: ProductFormData): Promise<Product> {
    const response = await api.post<{ data: Product }>('/inventory/products', data);
    return response.data.data;
  },

  async updateProduct(id: string, data: Partial<ProductFormData>): Promise<Product> {
    const response = await api.put<{ data: Product }>(`/inventory/products/${id}`, data);
    return response.data.data;
  },

  async uploadPhoto(id: string, file: File): Promise<Product> {
    const form = new FormData();
    form.append('photo', file);
    const response = await api.post<{ data: Product }>(`/inventory/products/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async getMovements(id: string, page = 1, limit = 20): Promise<Paginated<InventoryMovement>> {
    const response = await api.get(`/inventory/products/${id}/movements`, { params: { page, limit } });
    return response.data;
  },

  /** Todos los productos activos (la API pagina de 100 en 100). */
  async getAllActiveProducts(): Promise<Product[]> {
    const all: Product[] = [];
    for (let page = 1; ; page++) {
      const res = await inventoryService.getProducts({ page, limit: 100 });
      all.push(...res.data);
      if (page >= res.totalPages) return all;
    }
  },

  async createMovementsBatch(rows: BatchMovementRow[]): Promise<BatchMovementResult> {
    const response = await api.post('/inventory/movements/batch', { rows });
    return response.data.data;
  },

  async createMovement(id: string, data: MovementFormData): Promise<{ movement: InventoryMovement; stock: number }> {
    const response = await api.post(`/inventory/products/${id}/movements`, data);
    return response.data.data;
  },
};
