import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Pagination } from '../../components/Pagination';
import { PageListLayout } from '../../components/templates';
import { formatDateTime } from '../../utils/dateUtils';
import { apiErrorMessage, inventoryService, type StockCountSummary } from '../../services/inventory.service';

const PAGE_SIZE = 20;

/** Historial de conteos de inventario y sus diferencias. */
export function StockCountsPage() {
  const navigate = useNavigate();
  const { modules } = useAuth();
  const [counts, setCounts] = useState<StockCountSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getStockCounts(page, PAGE_SIZE)
      .then(res => {
        if (cancelled) return;
        setCounts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar los conteos')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <PageListLayout
      title="Conteos de inventario"
      actions={modules.inventory.count && (
        <Button variant="primary" onClick={() => navigate('/inventory/counts/new')}>+ Nuevo conteo</Button>
      )}
      total={total}
      totalLabel={total === 1 ? 'conteo' : 'conteos'}
      isLoading={loading}
      error={error}
    >
      {counts.length === 0 ? (
        <div className="inventory-empty">Todavía no hay conteos registrados.</div>
      ) : (
        <div className="table-container">
          <table className="table counts-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th style={{ textAlign: 'right' }}>Contados</th>
                <th style={{ textAlign: 'right' }}>Con diferencia</th>
                <th style={{ textAlign: 'right' }}>Ajuste</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {counts.map(c => (
                <tr key={c.id} className="is-clickable" onClick={() => navigate(`/inventory/counts/${c.id}`)}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(c.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {c.note && <span className="bulk-table__meta">{c.note}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{c.productCount}</td>
                  <td style={{ textAlign: 'right' }}>{c.differenceCount || <span className="text-secondary">Todo cuadra</span>}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.surplus > 0 && <span className="count-diff is-surplus">+{c.surplus}</span>}
                    {c.surplus > 0 && c.shortage > 0 && ' / '}
                    {c.shortage > 0 && <span className="count-diff is-shortage">−{c.shortage}</span>}
                    {c.surplus === 0 && c.shortage === 0 && <span className="text-secondary">—</span>}
                  </td>
                  <td>{c.createdBy.firstName} {c.createdBy.lastName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} itemLabel="conteos" />
      )}
    </PageListLayout>
  );
}
