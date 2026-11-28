import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Pagination } from '../../components/Pagination';
import { PageListLayout } from '../../components/templates';
import {
  apiErrorMessage,
  formatDateOnly,
  inventoryService,
  RETURN_REASON_LABELS,
  type SupplierReturn,
} from '../../services/inventory.service';

const PAGE_SIZE = 20;

/** Historial de devoluciones al proveedor: qué salió, cuándo y por qué. */
export function SupplierReturnsPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { registered?: boolean } | null };
  const { modules } = useAuth();
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getSupplierReturns(page, debouncedSearch, PAGE_SIZE)
      .then(res => {
        if (cancelled) return;
        setReturns(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar las devoluciones')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  return (
    <PageListLayout
      title="Devoluciones al proveedor"
      actions={modules.inventory.return && (
        <Button variant="primary" onClick={() => navigate('/inventory/returns/new')}>+ Registrar devolución</Button>
      )}
      filters={
        <Input
          type="text"
          placeholder="Buscar por producto, proveedor o nota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      }
      total={total}
      totalLabel={total === 1 ? 'devolución' : 'devoluciones'}
      isLoading={loading}
      error={error}
    >
      {state?.registered && <div className="alert alert-success" role="status">Devolución registrada: el stock ya se descontó.</div>}
      {returns.length === 0 ? (
        <div className="inventory-empty">
          {debouncedSearch ? 'Ninguna devolución coincide con la búsqueda.' : 'Todavía no hay devoluciones registradas.'}
        </div>
      ) : (
        <div className="table-container">
          <table className="table returns-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Motivo</th>
                <th>Productos</th>
                <th>Proveedor</th>
                <th>Registrada por</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id}>
                  <td data-label="Fecha" style={{ whiteSpace: 'nowrap' }}>{formatDateOnly(r.returnDate)}</td>
                  <td data-label="Motivo">
                    <span className="return-reason">{RETURN_REASON_LABELS[r.reason]}</span>
                    {r.note && <span className="bulk-table__meta">{r.note}</span>}
                  </td>
                  <td data-label="Productos">
                    <ul className="return-items">
                      {r.items.map(item => (
                        <li key={item.id}>
                          <strong>{item.quantity}</strong> × {item.product.name}
                          {item.product.presentation && <span className="text-secondary"> · {item.product.presentation}</span>}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="Proveedor">{r.supplierName || <span className="text-secondary">—</span>}</td>
                  <td data-label="Registrada por">{r.createdBy.firstName} {r.createdBy.lastName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} itemLabel="devoluciones" />
      )}
    </PageListLayout>
  );
}
