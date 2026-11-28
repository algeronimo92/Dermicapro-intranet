import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageDetailLayout } from '../../components/templates';
import { LowStockIcon } from '../../components/inventory/LowStockIcon';
import { useChartTheme } from '../../components/dashboard/widgets/chartTheme';
import '../../components/dashboard/widgets/RevenueChart.css';
import {
  apiErrorMessage,
  inventoryService,
  todayKey,
  type DailyStock,
  type Product,
} from '../../services/inventory.service';

const PRESETS = [7, 30, 90] as const;

/** 'YYYY-MM-DD' menos n días. */
function daysBefore(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const shortDay = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', day: '2-digit', month: 'short' });
const longDay = new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
const fmtShort = (day: string) => shortDay.format(new Date(`${day}T12:00:00Z`));
const fmtLong = (day: string) => longDay.format(new Date(`${day}T12:00:00Z`));
const productLabel = (p: Product) => [p.name, p.presentation].filter(Boolean).join(' · ');
const MAX_RESULTS = 50;

/** Resumen: cómo va el stock de un producto día a día. */
export function StockFlowPage() {
  const navigate = useNavigate();
  const theme = useChartTheme();
  const [params, setParams] = useSearchParams();
  const to = params.get('to') ?? todayKey();
  const from = params.get('from') ?? daysBefore(to, 29);

  const [products, setProducts] = useState<Product[]>([]);
  const [data, setData] = useState<DailyStock | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inventoryService.getAllActiveProducts()
      .then(list => setProducts([...list].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(err => setError(apiErrorMessage(err, 'No se pudieron cargar los productos')))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Sin producto elegido se muestra el primero de la lista.
  const productId = params.get('product') || products[0]?.id || '';
  const product = products.find(p => p.id === productId);

  // Buscador de producto: se escribe para filtrar, en vez de recorrer toda la lista.
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter(p => !q || [p.name, p.brand, p.presentation, p.barcode].some(v => v?.toLowerCase().includes(q)))
      .slice(0, MAX_RESULTS);
  }, [products, query]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    inventoryService.getDailyStock({ productId, from, to })
      .then(res => { if (!cancelled) { setData(res); setError(null); } })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudo cargar el stock diario')); });
    return () => { cancelled = true; };
  }, [productId, from, to]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const choose = (p: Product) => {
    update({ product: p.id });
    setSearching(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  // Enter elige la primera coincidencia; Escape cierra sin cambiar.
  const handleSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && results[0]) { e.preventDefault(); choose(results[0]); }
    if (e.key === 'Escape') e.currentTarget.blur();
  };

  const activePreset = PRESETS.find(n => to === todayKey() && from === daysBefore(to, n - 1));
  const lineColor = theme.series.brand;
  const days = data?.productId === productId ? data.days : [];

  return (
    <PageDetailLayout
      title="Resumen de inventario"
      subtitle="Cómo va el stock de cada producto día a día"
      onBack={() => navigate('/inventory')}
      backLabel="Productos"
      isLoading={loadingProducts}
      error={products.length === 0 ? error : null}
    >
      {products.length === 0 ? (
        <div className="inventory-empty">Todavía no hay productos activos.</div>
      ) : (
        <>
          <div className="flow-filters">
            <div className="flow-filters__product purchase-search">
              <input
                type="text" className="filter-select-modern" aria-label="Buscar producto"
                placeholder="Buscar producto por nombre, marca o código…"
                value={searching ? query : product ? productLabel(product) : ''}
                onFocus={() => { setQuery(''); setSearching(true); }}
                onBlur={() => setSearching(false)}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKey}
              />
              {searching && (
                <ul className="purchase-search__results" role="listbox">
                  {results.length === 0 ? (
                    <li className="flow-search__empty">Ningún producto coincide.</li>
                  ) : results.map(p => (
                    <li key={p.id}>
                      {/* onMouseDown: elige antes de que el input pierda el foco y cierre la lista. */}
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); choose(p); }}>
                        <span className="purchase-search__name">{p.name} <LowStockIcon product={p} /></span>
                        <span className="purchase-search__meta">
                          {[p.brand, p.presentation].filter(Boolean).join(' · ')} · Stock {p.stock}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flow-filters__presets" role="group" aria-label="Período">
              {PRESETS.map(n => (
                <button
                  key={n} type="button"
                  className={`flow-chip${activePreset === n ? ' is-active' : ''}`}
                  onClick={() => update({ from: daysBefore(todayKey(), n - 1), to: '' })}
                >
                  {n} días
                </button>
              ))}
            </div>
            <label className="flow-filters__date">
              <span className="field-label">Desde</span>
              <input type="date" value={from} max={to} onChange={(e) => e.target.value && update({ from: e.target.value })} className="filter-select-modern" />
            </label>
            <label className="flow-filters__date">
              <span className="field-label">Hasta</span>
              <input type="date" value={to} min={from} max={todayKey()} onChange={(e) => e.target.value && update({ to: e.target.value })} className="filter-select-modern" />
            </label>
          </div>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <section className="revenue-chart">
            <div className="chart-card__header">
              <div>
                <h3 className="revenue-chart__title flow-title">
                  Stock diario · {product?.name} {product && <LowStockIcon product={product} />}
                </h3>
                <p className="revenue-chart__subtitle">
                  Stock al cierre de cada día
                  {product && product.minStock > 0 && ` · la línea punteada es el mínimo (${product.minStock})`}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date" tickFormatter={fmtShort} tick={theme.tick} tickLine={false}
                  axisLine={{ stroke: theme.grid }} tickMargin={8} interval="preserveStartEnd" minTickGap={16}
                />
                <YAxis allowDecimals={false} width={44} tick={theme.tick} tickLine={false} axisLine={false} />
                {product && product.minStock > 0 && (
                  <ReferenceLine y={product.minStock} stroke={theme.axis} strokeDasharray="5 4" ifOverflow="extendDomain" />
                )}
                <Tooltip
                  cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
                  {...theme.tooltip}
                  labelFormatter={(label: unknown) => fmtLong(String(label))}
                  formatter={(value: unknown) => [`${Number(value)} und.`, 'Stock']}
                />
                <Line
                  type="stepAfter" dataKey="stock" name="Stock" stroke={lineColor} strokeWidth={2}
                  dot={days.length <= 31 ? { r: 3, fill: lineColor, strokeWidth: 0 } : false}
                  activeDot={{ r: 5, fill: lineColor }} isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </PageDetailLayout>
  );
}
