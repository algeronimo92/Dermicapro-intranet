import { AlertTriangle } from 'lucide-react';
import { isLowStock, type Product } from '../../services/inventory.service';

/** Advertencia junto al nombre de un producto que ya emitió su alerta de stock. */
export function LowStockIcon({ product }: { product: Pick<Product, 'stock' | 'minStock'> }) {
  if (!isLowStock(product)) return null;
  const label = product.stock === 0 ? 'Agotado' : `En alerta: stock ${product.stock}, mínimo ${product.minStock}`;
  return (
    <span className="low-stock-icon" title={label}>
      <AlertTriangle size={14} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
