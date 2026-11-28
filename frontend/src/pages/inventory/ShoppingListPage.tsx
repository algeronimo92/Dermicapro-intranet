import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
 * Lista de compras: sólo de consulta. Muestra los productos que ya emitieron
 * su alerta (stock <= mínimo) y cuánto se sugiere comprar para llegar al
 * objetivo. La compra se registra en su propio apartado (Compras).
 */
export function ShoppingListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getLowStockProducts()
      .then(list => { if (!cancelled) setProducts([...list].sort(byUrgency)); })
      .catch(err => { if (!cancelled) setLoadError(apiErrorMessage(err, 'No se pudo cargar la lista de compras')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const suggestedUnits = products.reduce((sum, p) => sum + (suggestedQuantity(p) ?? 0), 0);
  const outOfStock = products.filter(p => p.stock === 0).length;

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
                  <th className="bulk-table__product">Producto</th>
                  <th className="bulk-table__num">Stock</th>
                  <th className="bulk-table__num shopping-table__extra">Mínimo</th>
                  <th className="bulk-table__num shopping-table__extra">Objetivo</th>
                  <th className="bulk-table__num">Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const suggested = suggestedQuantity(p);
                  return (
                    <tr key={p.id}>
                      <td className="bulk-table__product">
                        <Link to={`/inventory/${p.id}`} className="bulk-table__name">{p.name}</Link>
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
                      <td className="bulk-table__num shopping-table__suggested">
                        {suggested !== null ? suggested : <span className="text-secondary" title="Sin objetivo definido">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="shopping-summary">
            {products.length} producto(s) en alerta{outOfStock > 0 && ` · ${outOfStock} agotado(s)`}
            {suggestedUnits > 0 && ` · ${suggestedUnits} unidad(es) sugerida(s)`}
            {products.some(p => p.targetStock === null) && ' · Sin objetivo no se sugiere cantidad (defínelo en Alertas de stock).'}
          </p>
        </>
      )}
    </PageDetailLayout>
  );
}
