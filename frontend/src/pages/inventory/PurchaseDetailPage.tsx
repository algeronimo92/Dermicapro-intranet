import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, Package } from 'lucide-react';
import { PageDetailLayout } from '../../components/templates';
import {
  apiErrorMessage,
  formatDateOnly,
  formatInvoiceAmount,
  inventoryService,
  type PurchaseDetail,
} from '../../services/inventory.service';
import { formatDateTime } from '../../utils/dateUtils';

export function PurchaseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getPurchase(id)
      .then(p => { if (!cancelled) setPurchase(p); })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudo cargar la compra')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const units = purchase?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <PageDetailLayout
      title={purchase ? `Compra del ${formatDateOnly(purchase.purchaseDate)}` : 'Compra'}
      subtitle={purchase ? `${purchase.items.length} producto(s) · ${units} unidad(es)` : undefined}
      onBack={() => navigate('/inventory/purchases')}
      backLabel="Compras"
      isLoading={loading}
      error={error}
      notFoundMessage="Compra no encontrada"
    >
      {purchase && (
        <div className="purchase-form">
          {state?.registered && <div className="alert alert-success" role="status">Compra registrada: el stock ya se actualizó.</div>}

          <section className="purchase-card">
            <h2>Factura</h2>
            {purchase.invoice ? (
              <Link to={`/invoices/${purchase.invoice.id}`} className="purchase-invoice__selected purchase-invoice__link">
                <FileText size={20} aria-hidden />
                <div>
                  <strong>{purchase.invoice.documentType} · {purchase.invoice.issuerName}</strong>
                  <span>
                    RUC {purchase.invoice.issuerRuc} · {formatDateOnly(purchase.invoice.issueDate)} · {formatInvoiceAmount(purchase.invoice)}
                  </span>
                </div>
              </Link>
            ) : (
              <p className="purchase-invoice__hint">
                {purchase.hasInvoice ? 'Tiene factura (no tienes acceso a Facturas para verla).' : 'Registrada sin factura.'}
              </p>
            )}
          </section>

          <section className="purchase-card">
            <h2>Productos</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>Stock hoy</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items.map(item => (
                    <tr key={item.id} className="is-clickable" onClick={() => navigate(`/inventory/${item.product.id}`)}>
                      <td>
                        <span className="purchase-product">
                          {item.product.photoUrl
                            ? <img src={item.product.photoUrl} alt="" />
                            : <Package size={18} strokeWidth={1.4} aria-hidden />}
                          <span>
                            <span className="bulk-table__name">{item.product.name}</span>
                            <span className="bulk-table__meta">{[item.product.brand, item.product.presentation].filter(Boolean).join(' · ')}</span>
                          </span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="movement-qty--in">+{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{item.product.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-secondary purchase-meta">
            Registrada por {purchase.createdBy.firstName} {purchase.createdBy.lastName} el{' '}
            {formatDateTime(purchase.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {purchase.note && <> · Nota: {purchase.note}</>}
          </p>
        </div>
      )}
    </PageDetailLayout>
  );
}
