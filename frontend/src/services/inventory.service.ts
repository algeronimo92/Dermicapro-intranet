import api from './api';

export type ProductCategory = 'sunscreen' | 'serum' | 'cleanser' | 'moisturizer' | 'accessory' | 'other';
export type MovementType = 'in' | 'out';
// sale / internal_use / loss quedan sólo en el historial anterior: el inventario
// ya no registra ventas ni salidas manuales.
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
  purchase: 'Compra',
  sale: 'Venta (anterior)',
  internal_use: 'Uso interno (anterior)',
  loss: 'Merma (anterior)',
  adjustment: 'Ajuste por conteo',
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
  targetStock: number | null;
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
  /** Sólo llega si la persona puede ver compras. */
  purchaseItem?: { purchaseId: string } | null;
}

export interface ProductFormData {
  name: string;
  brand?: string | null;
  category: ProductCategory;
  presentation?: string | null;
  salePrice: number;
  minStock: number;
  targetStock?: number | null;
  barcode?: string | null;
  isActive?: boolean;
}

export interface StockAlertRow {
  productId: string;
  minStock: number;
  targetStock: number | null;
}

export interface InvoiceSummary {
  id: string;
  documentType: string;
  issuerRuc: string;
  issuerName: string;
  issueDate: string;
  currency: string;
  total: string;
}

export interface PurchaseSummary {
  id: string;
  purchaseDate: string;
  note: string | null;
  createdAt: string;
  createdBy: UserSummary;
  hasInvoice: boolean;
  /** Sólo llega si la persona puede ver Facturas. */
  invoice?: InvoiceSummary | null;
  productCount: number;
  unitCount: number;
  productNames: string[];
}

export interface PurchaseDetail extends Omit<PurchaseSummary, 'productCount' | 'unitCount' | 'productNames'> {
  items: {
    id: string;
    quantity: number;
    product: Pick<Product, 'id' | 'name' | 'brand' | 'presentation' | 'photoUrl' | 'stock'>;
  }[];
}

export interface PurchaseFormData {
  purchaseDate: string;
  invoiceId: string | null;
  note?: string;
  items: { productId: string; quantity: number }[];
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

export const isLowStock = (p: Pick<Product, 'stock' | 'minStock'>) => p.stock <= p.minStock;

export const formatPrice = (value: string | number) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatInvoiceAmount = (invoice: Pick<InvoiceSummary, 'total' | 'currency'>) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: invoice.currency }).format(Number(invoice.total));

/** Fecha de hoy en la zona del navegador, como 'YYYY-MM-DD'. */
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Fechas sin hora (compras, facturas): se muestran tal cual, sin correr por zona horaria. */
const dateOnlyFormatter = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', dateStyle: 'medium' });
export const formatDateOnly = (value: string) => dateOnlyFormatter.format(new Date(value));

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

  /** Productos activos en alerta (stock <= mínimo): la lista de compras. */
  async getLowStockProducts(): Promise<Product[]> {
    const all: Product[] = [];
    for (let page = 1; ; page++) {
      const res = await inventoryService.getProducts({ page, limit: 100, lowStock: true });
      all.push(...res.data);
      if (page >= res.totalPages) return all;
    }
  },

  async updateStockAlerts(rows: StockAlertRow[]): Promise<number> {
    const response = await api.put<{ data: { updated: number } }>('/inventory/products/alerts', { rows });
    return response.data.data.updated;
  },

  async getPurchases(page = 1, search = '', limit = 20): Promise<Paginated<PurchaseSummary>> {
    const response = await api.get('/inventory/purchases', { params: { page, limit, ...(search && { search }) } });
    return response.data;
  },

  async getPurchase(id: string): Promise<PurchaseDetail> {
    const response = await api.get<{ data: PurchaseDetail }>(`/inventory/purchases/${id}`);
    return response.data.data;
  },

  async createPurchase(data: PurchaseFormData): Promise<{ id: string }> {
    const response = await api.post<{ data: { id: string } }>('/inventory/purchases', data);
    return response.data.data;
  },

  /** Facturas de Productos registradas que todavía no tienen compra. */
  async getAvailableInvoices(): Promise<InvoiceSummary[]> {
    const response = await api.get<{ data: InvoiceSummary[] }>('/inventory/purchases/available-invoices');
    return response.data.data;
  },
};
