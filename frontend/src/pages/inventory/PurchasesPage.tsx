import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Pagination } from '../../components/Pagination';
import { PageListLayout } from '../../components/templates';
import {
  apiErrorMessage,
  formatDateOnly,
  formatInvoiceAmount,
  inventoryService,
  type PurchaseSummary,
} from '../../services/inventory.service';

const PAGE_SIZE = 20;

export function PurchasesPage() {
  const navigate = useNavigate();
  const { modules } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
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
    inventoryService.getPurchases(page, debouncedSearch, PAGE_SIZE)
      .then(res => {
        if (cancelled) return;
        setPurchases(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setError(null);
      })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar las compras')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, debouncedSearch]);

  return (
    <PageListLayout
      title="Compras"
      actions={modules.inventory.purchase && (
        <Button variant="primary" onClick={() => navigate('/inventory/purchases/new')}>+ Registrar compra</Button>
      )}
      filters={
        <Input
          type="text"
          placeholder={modules.invoices.view ? 'Buscar por producto, proveedor o nota...' : 'Buscar por producto o nota...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      }
      total={total}
      totalLabel={total === 1 ? 'compra' : 'compras'}
      isLoading={loading}
      error={error}
    >
      {purchases.length === 0 ? (
        <div className="inventory-empty">
          {debouncedSearch ? 'Ninguna compra coincide con la búsqueda.' : 'Todavía no hay compras registradas.'}
        </div>
      ) : (
        <div className="table-container">
          <table className="table purchases-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Productos</th>
                <th style={{ textAlign: 'right' }}>Unidades</th>
                <th>Factura</th>
                <th>Registrada por</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} className="is-clickable" onClick={() => navigate(`/inventory/purchases/${p.id}`)}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateOnly(p.purchaseDate)}</td>
                  <td>
                    {p.productNames.join(', ')}
                    {p.productCount > p.productNames.length && <span className="text-secondary"> y {p.productCount - p.productNames.length} más</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{p.unitCount}</td>
                  <td>
                    {p.invoice ? (
                      <span className="purchase-invoice-cell">
                        <FileText size={14} aria-hidden /> {p.invoice.issuerName} · {formatInvoiceAmount(p.invoice)}
                      </span>
                    ) : p.hasInvoice ? 'Con factura' : <span className="text-secondary">Sin factura</span>}
                  </td>
                  <td>{p.createdBy.firstName} {p.createdBy.lastName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} itemLabel="compras" />
      )}
    </PageListLayout>
  );
}
