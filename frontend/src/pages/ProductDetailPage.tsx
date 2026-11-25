import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageDetailLayout } from '../components/templates';
import { Pagination } from '../components/Pagination';
import { ProductFormModal } from '../components/ProductFormModal';
import { InventoryMovementModal } from '../components/InventoryMovementModal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  CATEGORY_LABELS,
  formatPrice,
  InventoryMovement,
  apiErrorMessage,
  inventoryService,
  isLowStock,
  MovementType,
  Product,
  REASON_LABELS,
} from '../services/inventory.service';
import { formatDateTime } from '../utils/dateUtils';
import { StockBadge } from '../components/StockBadge';
import '../styles/inventory.css';

const MOVEMENTS_PAGE_SIZE = 15;

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Lo que puede hacer lo decide Empleados -> Privilegios (products / inventory_movements).
  const { modules } = useAuth();
  const { edit: canEdit, move: canMove } = modules.inventory;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsPages, setMovementsPages] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType | null>(null);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      setProduct(await inventoryService.getProduct(id));
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo cargar el producto'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadMovements = useCallback(async () => {
    if (!id) return;
    try {
      const res = await inventoryService.getMovements(id, movementsPage, MOVEMENTS_PAGE_SIZE);
      setMovements(res.data);
      setMovementsTotal(res.total);
      setMovementsPages(Math.max(1, res.totalPages));
    } catch {
      setMovements([]);
    }
  }, [id, movementsPage]);

  useEffect(() => { loadProduct(); }, [loadProduct]);
  useEffect(() => { loadMovements(); }, [loadMovements]);

  const [togglingActive, setTogglingActive] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  const setActive = async (activate: boolean) => {
    if (!product) return;
    setTogglingActive(true);
    setActiveError(null);
    try {
      setProduct(await inventoryService.updateProduct(product.id, { isActive: activate }));
      setConfirmDeactivate(false);
    } catch (err) {
      setActiveError(apiErrorMessage(err, `No se pudo ${activate ? 'activar' : 'desactivar'} el producto`));
    } finally {
      setTogglingActive(false);
    }
  };

  // Desactivar pide confirmación; reactivar no (no oculta nada).
  const toggleActive = () => {
    if (!product) return;
    setActiveError(null);
    if (product.isActive) setConfirmDeactivate(true);
    else setActive(true);
  };

  const stockClass = product
    ? product.stock === 0 ? ' is-out' : isLowStock(product) ? ' is-low' : ''
    : '';

  return (
    <PageDetailLayout
      title={product?.name ?? 'Producto'}
      subtitle={product ? [product.brand, product.presentation].filter(Boolean).join(' · ') : undefined}
      onBack={() => navigate('/inventory')}
      backLabel="Inventario"
      isLoading={loading}
      error={error}
      notFoundMessage="Producto no encontrado"
      actions={canEdit && product && (
        <>
          <button
            type="button"
            className={`action-btn ${product.isActive ? 'secondary' : 'success'}`}
            onClick={toggleActive}
            disabled={togglingActive}
          >
            {togglingActive ? 'Guardando...' : product.isActive ? 'Desactivar' : 'Activar'}
          </button>
          <button type="button" className="action-btn secondary" onClick={() => setEditOpen(true)}>
            Editar producto
          </button>
        </>
      )}
    >
      {product && (
        <>
          {activeError && !confirmDeactivate && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--spacing-md)' }}>{activeError}</div>
          )}
          <div className="product-detail">
            <div className="product-photo">
              {product.photoUrl
                ? <img src={product.photoUrl} alt={product.name} />
                : <Package size={56} strokeWidth={1.2} />}
              <StockBadge product={product} />
            </div>

            <div className="product-detail__info">
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                <span className="badge badge-info">{CATEGORY_LABELS[product.category]}</span>
                {!product.isActive && <span className="badge badge-error">Inactivo</span>}
              </div>

              <div className="product-detail__stats">
                <div className="product-stat">
                  <div className="product-stat__label">Stock actual</div>
                  <div className={`product-stat__value${stockClass}`}>{product.stock} und.</div>
                </div>
                <div className="product-stat">
                  <div className="product-stat__label">Stock mínimo</div>
                  <div className="product-stat__value">{product.minStock} und.</div>
                </div>
                <div className="product-stat">
                  <div className="product-stat__label">Precio de venta</div>
                  <div className="product-stat__value">{formatPrice(product.salePrice)}</div>
                </div>
              </div>

              {product.barcode && (
                <p className="text-secondary" style={{ margin: '0 0 var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                  Código de barras: {product.barcode}
                </p>
              )}

              {canMove && (
                <div className="product-detail__actions">
                  <button type="button" className="action-btn success" onClick={() => setMovementType('in')}>
                    ＋ Registrar entrada
                  </button>
                  <button type="button" className="action-btn primary" onClick={() => setMovementType('out')} disabled={product.stock === 0}>
                    － Registrar salida
                  </button>
                </div>
              )}
            </div>
          </div>

          <h2 style={{ fontSize: 'var(--font-size-lg)', margin: '0 0 var(--spacing-md)' }}>Historial de movimientos</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Motivo</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th>Registrado por</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={6} className="table-empty">Sin movimientos registrados</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(m.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{REASON_LABELS[m.reason]}</td>
                    <td style={{ textAlign: 'right' }} className={`movement-qty--${m.type}`}>
                      {m.type === 'in' ? '+' : '−'}{m.quantity}
                    </td>
                    <td style={{ textAlign: 'right' }}>{m.stockAfter}</td>
                    <td>{m.createdBy.firstName} {m.createdBy.lastName}</td>
                    <td className="text-secondary">{m.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {movementsPages > 1 && (
            <Pagination
              currentPage={movementsPage}
              totalPages={movementsPages}
              onPageChange={setMovementsPage}
              totalItems={movementsTotal}
              pageSize={MOVEMENTS_PAGE_SIZE}
              itemLabel="movimientos"
            />
          )}

          <ProductFormModal
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            product={product}
            onSaved={setProduct}
          />
          <ConfirmModal
            isOpen={confirmDeactivate}
            title="Desactivar producto"
            message={<>¿Desactivar <strong>{product.name}</strong>?</>}
            details={
              <ul>
                <li>Dejará de aparecer en el inventario y en «Registrar movimientos». Lo verás con «Mostrar inactivos».</li>
                <li>Su stock ({product.stock} und.) y su historial de movimientos se conservan.</li>
                <li>Puedes reactivarlo cuando quieras desde esta ficha.</li>
              </ul>
            }
            confirmLabel="Desactivar"
            loading={togglingActive}
            loadingLabel="Desactivando..."
            error={confirmDeactivate ? activeError : null}
            onConfirm={() => setActive(false)}
            onCancel={() => { setConfirmDeactivate(false); setActiveError(null); }}
          />
          <InventoryMovementModal
            isOpen={movementType !== null}
            onClose={() => setMovementType(null)}
            product={product}
            initialType={movementType ?? 'in'}
            onSaved={(stock) => {
              setProduct(p => (p ? { ...p, stock } : p));
              if (movementsPage === 1) loadMovements(); else setMovementsPage(1);
            }}
          />
        </>
      )}
    </PageDetailLayout>
  );
}
