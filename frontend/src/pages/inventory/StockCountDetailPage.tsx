import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageDetailLayout } from '../../components/templates';
import { apiErrorMessage, inventoryService, type StockCountDetail } from '../../services/inventory.service';
import { formatDateTime } from '../../utils/dateUtils';

const signed = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
const dateTime = (value: string) =>
  formatDateTime(value, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Un conteo: lo que decía el sistema, lo contado y el ajuste de cada producto. */
export function StockCountDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { registered?: boolean } | null };
  const [stockCount, setStockCount] = useState<StockCountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getStockCount(id)
      .then(c => { if (!cancelled) setStockCount(c); })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudo cargar el conteo')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // Primero los que tuvieron diferencia.
  const items = [...(stockCount?.items ?? [])].sort((a, b) =>
    Number(b.countedStock !== b.expectedStock) - Number(a.countedStock !== a.expectedStock));

  return (
    <PageDetailLayout
      title={stockCount ? `Conteo del ${dateTime(stockCount.createdAt)}` : 'Conteo'}
      subtitle={stockCount
        ? `${stockCount.productCount} contado(s) · ${stockCount.differenceCount} con diferencia · por ${stockCount.createdBy.firstName} ${stockCount.createdBy.lastName}`
        : undefined}
      onBack={() => navigate('/inventory/counts')}
      backLabel="Conteos"
      isLoading={loading}
      error={error}
    >
      {stockCount && (
        <>
          {state?.registered && (
            <div className="alert alert-success" role="status">
              Conteo registrado{stockCount.differenceCount ? ': el stock quedó ajustado a lo contado.' : '. Todo cuadraba con el sistema.'}
            </div>
          )}
          {stockCount.note && <p className="text-secondary">Nota: {stockCount.note}</p>}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>En sistema</th>
                  <th style={{ textAlign: 'right' }}>Contado</th>
                  <th style={{ textAlign: 'right' }}>Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const diff = item.countedStock - item.expectedStock;
                  return (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/inventory/${item.product.id}`} className="bulk-table__name">{item.product.name}</Link>
                        <span className="bulk-table__meta">{[item.product.brand, item.product.presentation].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{item.expectedStock}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.countedStock}</td>
                      <td style={{ textAlign: 'right' }} className={`count-diff${diff ? (diff > 0 ? ' is-surplus' : ' is-shortage') : ''}`}>
                        {diff === 0 ? <span className="text-secondary">Cuadra</span> : signed(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageDetailLayout>
  );
}
