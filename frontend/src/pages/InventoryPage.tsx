import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Pagination } from '../components/Pagination';
import { PageListLayout } from '../components/templates';
import { ProductFormModal } from '../components/ProductFormModal';
import { StockBadge } from '../components/StockBadge';
import {
  CATEGORY_LABELS,
  formatPrice,
  apiErrorMessage,
  canManageInventory,
  inventoryService,
  Product,
} from '../services/inventory.service';
import '../styles/inventory.css';

const PAGE_SIZE = 24;

export function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleName = typeof user?.role === 'string' ? user.role : (user?.role?.name ?? '');
  const canManage = canManageInventory(roleName);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, category, brand, lowStock, includeInactive]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryService.getProducts({
        page, limit: PAGE_SIZE, search: debouncedSearch, category, brand, lowStock, includeInactive,
      });
      setProducts(res.data);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.totalPages));
      setLowStockCount(res.lowStockCount);
    } catch (err) {
      setError(apiErrorMessage(err, 'Error al cargar el inventario'));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, category, brand, lowStock, includeInactive]);

  useEffect(() => { load(); }, [load]);

  const loadBrands = useCallback(() => {
    inventoryService.getBrands().then(setBrands).catch(() => setBrands([]));
  }, []);
  useEffect(loadBrands, [loadBrands]);

  return (
    <PageListLayout
      title="Inventario"
      actions={canManage && (
        <Button variant="primary" onClick={() => setCreateOpen(true)}>+ Nuevo producto</Button>
      )}
      filters={
        <>
          <Input
            type="text"
            placeholder="Buscar por nombre, marca o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[{ value: '', label: 'Todas las categorías' },
              ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          <Select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            options={[{ value: '', label: 'Todas las marcas' }, ...brands.map(b => ({ value: b, label: b }))]}
          />
          <label className="checkbox-modern" style={{ cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
            <span className="checkbox-custom" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
              Solo stock bajo
            </span>
          </label>
          {canManage && (
            <label className="checkbox-modern" style={{ cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              <span className="checkbox-custom" />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                Mostrar inactivos
              </span>
            </label>
          )}
        </>
      }
      total={total}
      totalLabel={total === 1 ? 'producto' : 'productos'}
      isLoading={loading}
      error={error}
    >
      {lowStockCount > 0 && !lowStock && (
        <div className="inventory-alert" role="status">
          <span>⚠ {lowStockCount} {lowStockCount === 1 ? 'producto tiene' : 'productos tienen'} stock bajo o agotado.</span>
          <button type="button" onClick={() => setLowStock(true)}>Ver cuáles</button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="inventory-empty">
          {debouncedSearch || category || brand || lowStock
            ? 'No hay productos con esos filtros.'
            : 'Todavía no hay productos registrados.'}
        </div>
      ) : (
        <div className="inventory-grid">
          {products.map(p => (
            <button
              key={p.id}
              type="button"
              className={`product-card${p.isActive ? '' : ' is-inactive'}`}
              onClick={() => navigate(`/inventory/${p.id}`)}
            >
              <div className="product-photo">
                {p.photoUrl ? <img src={p.photoUrl} alt="" loading="lazy" /> : <Package size={40} strokeWidth={1.4} />}
                <StockBadge product={p} />
              </div>
              <div className="product-card__body">
                {p.brand && <span className="product-card__brand">{p.brand}</span>}
                <span className="product-card__name">{p.name}</span>
                <span className="product-card__meta">
                  {[p.presentation, CATEGORY_LABELS[p.category]].filter(Boolean).join(' · ')}
                  {!p.isActive && ' · Inactivo'}
                </span>
                <span className="product-card__price">{formatPrice(p.salePrice)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} itemLabel="productos" />
      )}

      <ProductFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        brands={brands}
        onSaved={(p) => { loadBrands(); navigate(`/inventory/${p.id}`); }}
      />
    </PageListLayout>
  );
}
