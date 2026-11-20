import { isLowStock, Product } from '../services/inventory.service';

export function StockBadge({ product }: { product: Pick<Product, 'stock' | 'minStock'> }) {
  const cls = product.stock === 0 ? ' is-out' : isLowStock(product) ? ' is-low' : '';
  const label = product.stock === 0 ? 'Agotado' : `${product.stock} und.`;
  return <span className={`product-card__stock${cls}`}>{label}</span>;
}
