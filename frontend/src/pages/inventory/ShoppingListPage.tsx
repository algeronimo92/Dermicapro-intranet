import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageDetailLayout } from '../../components/templates';
import { apiErrorMessage, inventoryService, type Product } from '../../services/inventory.service';

/** Cuánto sugiere comprar: hasta el objetivo; sin objetivo no sugiere cantidad. */
const suggestedQuantity = (p: Pick<Product, 'stock' | 'targetStock'>) =>
  p.targetStock !== null && p.targetStock > p.stock ? p.targetStock - p.stock : null;

// Agotados primero; luego los que están más por debajo de su mínimo.
const byUrgency = (a: Product, b: Product) =>
  Number(b.stock === 0) - Number(a.stock === 0)
  || (a.stock - a.minStock) - (b.stock - b.minStock)
  || a.name.localeCompare(b.name);

/**
 * Lista de compras: los productos que ya emitieron su alerta (stock <= mínimo),
 * con la cantidad sugerida para llegar al objetivo. Los marcados se llevan al
 * registro de compra ya cargados (?products=id:cantidad,...).
 */
export function ShoppingListPage() {
  const navigate = useNavigate();
  const { modules } = useAuth();
  const canPurchase = modules.inventory.purchase;

  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getLowStockProducts()
      .then(list => {
        if (cancelled) return;
        const sorted = [...list].sort(byUrgency);
        setProducts(sorted);
        setQuantities(Object.fromEntries(sorted.map(p => [p.id, String(suggestedQuantity(p) ?? '')])));
        // Vienen marcados los que tienen cantidad sugerida.
        setSelected(new Set(sorted.filter(p => suggestedQuantity(p) !== null).map(p => p.id)));
      })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudo cargar la lista de compras')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chosen = useMemo(() => products.filter(p => selected.has(p.id)), [products, selected]);
  const totalUnits = chosen.reduce((sum, p) => sum + (Number(quantities[p.id]) || 0), 0);
  const allSelected = products.length > 0 && chosen.length === products.length;

  const toggle = (id: string) => {
    setError(null);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const setQuantity = (id: string, value: string) => {
    setError(null);
    const digits = value.replace(/\D/g, '');
    setQuantities(prev => ({ ...prev, [id]: digits }));
    if (digits && Number(digits) > 0) setSelected(prev => new Set(prev).add(id));
  };

  const goToPurchase = () => {
    const missing = chosen.find(p => !(Number(quantities[p.id]) >= 1));
    if (missing) return setError(`Indica cuántas unidades comprar de «${missing.name}»`);
    const preset = chosen.map(p => `${p.id}:${Number(quantities[p.id])}`).join(',');
    navigate(`/inventory/purchases/new?products=${encodeURIComponent(preset)}`);
  };

  return (
    <PageDetailLayout
      title="Lista de compras"
      subtitle="Productos que llegaron a su stock mínimo, con lo sugerido para reponer hasta el objetivo"
      onBack={() => navigate('/inventory')}
      backLabel="Productos"
      isLoading={loading}
      error={loadError}
    >
      {products.length === 0 ? (
        <div className="inventory-empty">Ningún producto está en alerta: no hay nada por comprar.</div>
      ) : (
        <>
          <div className="bulk-sheet">
            <table className="bulk-table shopping-table">
              <thead>
                <tr>
                  <th className="shopping-table__check">
                    <input
                      type="checkbox" checked={allSelected} aria-label="Marcar todos"
                      onChange={() => setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)))}
                    />
                  </th>
                  <th className="bulk-table__product">Producto</th>
                  <th className="bulk-table__num">Stock</th>
                  <th className="bulk-table__num shopping-table__extra">Mínimo</th>
                  <th className="bulk-table__num shopping-table__extra">Objetivo</th>
                  <th className="bulk-table__num">A comprar</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className={selected.has(p.id) ? 'is-changed' : ''}>
                    <td className="shopping-table__check">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Comprar ${p.name}`} />
                    </td>
                    <td className="bulk-table__product">
                      <span className="bulk-table__name">{p.name}</span>
                      <span className="bulk-table__meta">{[p.brand, p.presentation].filter(Boolean).join(' · ')}</span>
                      <span className="bulk-table__meta shopping-table__levels">
                        Mín. {p.minStock}{p.targetStock !== null && ` · Obj. ${p.targetStock}`}
                      </span>
                    </td>
                    <td className="bulk-table__num">
                      {p.stock === 0 ? <span className="alert-state alert-state--error">Agotado</span> : p.stock}
                    </td>
                    <td className="bulk-table__num shopping-table__extra">{p.minStock}</td>
                    <td className="bulk-table__num shopping-table__extra">{p.targetStock ?? '—'}</td>
                    <td className="bulk-table__num">
                      <input
                        inputMode="numeric" value={quantities[p.id] ?? ''} placeholder="—"
                        onChange={(e) => setQuantity(p.id, e.target.value)} onFocus={(e) => e.target.select()}
                        className="bulk-cell bulk-cell--qty" aria-label={`Unidades a comprar de ${p.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <div className="bulk-footer">
            <span className="bulk-footer__summary">
              {chosen.length === 0
                ? `${products.length} producto(s) en alerta. Marca los que vas a comprar.`
                : `${chosen.length} de ${products.length} producto(s) · ${totalUnits} unidad(es)`}
              {products.some(p => p.targetStock === null) && ' · Sin objetivo no se sugiere cantidad.'}
            </span>
            {canPurchase && (
              <div className="bulk-footer__actions">
                <button type="button" className="action-btn primary" onClick={goToPurchase} disabled={chosen.length === 0}>
                  Registrar compra
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </PageDetailLayout>
  );
}
