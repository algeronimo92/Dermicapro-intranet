import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
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
import { Select } from '../../components/Select';
import { ChartLegend } from '../../components/dashboard/widgets/ChartLegend';
import { useChartTheme } from '../../components/dashboard/widgets/chartTheme';
import '../../components/dashboard/widgets/RevenueChart.css';
import {
  apiErrorMessage,
  inventoryService,
  REASON_LABELS,
  todayKey,
  type Product,
  type StockFlow,
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
const units = (n: number) => `${n} und.`;
const plus = (n: number) => (n ? `+${n}` : '0');
const minus = (n: number) => (n ? `−${n}` : '0');

/**
 * Resumen del inventario por fechas: cómo se movió el stock de un producto (o
 * de todo el inventario) día a día — cuánto entró, cuánto salió y con cuánto
 * cerró cada día.
 */
export function StockFlowPage() {
  const navigate = useNavigate();
  const theme = useChartTheme();
  const [params, setParams] = useSearchParams();
  const productId = params.get('product') ?? '';
  const to = params.get('to') ?? todayKey();
  const from = params.get('from') ?? daysBefore(to, 29);

  const [products, setProducts] = useState<Product[]>([]);
  const [flow, setFlow] = useState<StockFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inventoryService.getAllActiveProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    inventoryService.getStockFlow({ from, to, productId: productId || undefined })
      .then(res => { if (!cancelled) { setFlow(res); setError(null); } })
      .catch(err => { if (!cancelled) setError(apiErrorMessage(err, 'No se pudo cargar el resumen')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, productId]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const product = products.find(p => p.id === productId);
  const inColor = theme.categorical[0];
  const outColor = theme.categorical[3];
  const stockColor = theme.series.brand;
  // Las salidas se dibujan bajo el cero: entrada y salida se distinguen también por posición.
  const flowData = useMemo(() => (flow?.days ?? []).map(d => ({ ...d, outNeg: -d.out })), [flow]);
  const activeDays = (flow?.days ?? []).filter(d => d.in || d.out);
  const activePreset = PRESETS.find(n => to === todayKey() && from === daysBefore(to, n - 1));

  const productOptions = [
    { value: '', label: 'Todo el inventario' },
    ...products.map(p => ({ value: p.id, label: [p.name, p.presentation].filter(Boolean).join(' · ') })),
  ];

  const axisProps = {
    tick: theme.tick,
    tickLine: false,
    axisLine: false,
  } as const;

  return (
    <PageDetailLayout
      title="Resumen de inventario"
      subtitle="Cómo se movió el stock día a día: lo que entró, lo que salió y con cuánto cerró cada día"
      onBack={() => navigate('/inventory')}
      backLabel="Productos"
      isLoading={loading && !flow}
      error={!flow ? error : null}
    >
      <div className="flow-filters">
        <div className="flow-filters__product">
          <Select
            value={productId}
            onChange={(e) => update({ product: e.target.value })}
            options={productOptions}
            aria-label="Producto"
          />
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

      {error && flow && <div className="alert alert-error" role="alert">{error}</div>}

      {flow && (
        <>
          <div className="flow-stats">
            <div className="flow-stat">
              <span className="flow-stat__label">Stock al inicio</span>
              <strong className="flow-stat__value">{flow.startStock}</strong>
              <span className="flow-stat__hint">{fmtShort(flow.from)}</span>
            </div>
            <div className="flow-stat">
              <span className="flow-stat__label">Entradas</span>
              <strong className="flow-stat__value">{plus(flow.totalIn)}</strong>
              <span className="flow-stat__hint">unidades</span>
            </div>
            <div className="flow-stat">
              <span className="flow-stat__label">Salidas</span>
              <strong className="flow-stat__value">{minus(flow.totalOut)}</strong>
              <span className="flow-stat__hint">unidades</span>
            </div>
            <div className="flow-stat">
              <span className="flow-stat__label">Stock al cierre</span>
              <strong className="flow-stat__value">{flow.endStock}</strong>
              <span className="flow-stat__hint">{fmtShort(flow.to)}</span>
            </div>
          </div>

          <div className="flow-charts">
            <section className="revenue-chart">
              <div className="chart-card__header">
                <div>
                  <h3 className="revenue-chart__title">Stock al cierre de cada día</h3>
                  <p className="revenue-chart__subtitle">
                    {product ? product.name : 'Todo el inventario'}
                    {product && product.minStock > 0 && ` · la línea punteada es el mínimo (${product.minStock})`}
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={flow.days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtShort} {...axisProps} axisLine={{ stroke: theme.grid }} tickMargin={8} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} width={44} {...axisProps} />
                  {product && product.minStock > 0 && (
                    <ReferenceLine y={product.minStock} stroke={theme.axis} strokeDasharray="5 4" ifOverflow="extendDomain" />
                  )}
                  <Tooltip
                    cursor={{ stroke: theme.axis, strokeDasharray: '3 3' }}
                    {...theme.tooltip}
                    labelFormatter={(label: unknown) => fmtLong(String(label))}
                    formatter={(value: unknown) => [units(Number(value)), 'Stock al cierre']}
                  />
                  <Line
                    type="stepAfter" dataKey="stock" name="Stock al cierre" stroke={stockColor} strokeWidth={2}
                    dot={flow.days.length <= 31 ? { r: 3, fill: stockColor, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: stockColor }} isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>

            <section className="revenue-chart">
              <div className="chart-card__header">
                <div>
                  <h3 className="revenue-chart__title">Entradas y salidas por día</h3>
                  <p className="revenue-chart__subtitle">Entradas sobre el cero, salidas debajo</p>
                </div>
                <ChartLegend items={[
                  { label: 'Entradas', color: inColor, value: plus(flow.totalIn) },
                  { label: 'Salidas', color: outColor, value: minus(flow.totalOut) },
                ]} />
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={flowData} stackOffset="sign" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtShort} {...axisProps} axisLine={{ stroke: theme.grid }} tickMargin={8} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis allowDecimals={false} width={44} tickFormatter={(v: number) => String(Math.abs(v))} {...axisProps} />
                  <ReferenceLine y={0} stroke={theme.axis} />
                  <Tooltip
                    cursor={{ fill: theme.cursor }}
                    {...theme.tooltip}
                    labelFormatter={(label: unknown) => fmtLong(String(label))}
                    formatter={(value: unknown, name: unknown) => [units(Math.abs(Number(value))), String(name)]}
                  />
                  <Bar dataKey="in" name="Entradas" stackId="flow" fill={inColor} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                  <Bar dataKey="outNeg" name="Salidas" stackId="flow" fill={outColor} radius={[0, 0, 4, 4]} maxBarSize={24} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          <div className="flow-details">
            <section className="purchase-card">
              <h2>Por motivo</h2>
              {flow.byReason.length === 0 ? (
                <p className="text-secondary">Sin movimientos en este período.</p>
              ) : (
                <ul className="flow-list">
                  {flow.byReason.map(r => (
                    <li key={`${r.reason}:${r.type}`}>
                      <span>{REASON_LABELS[r.reason]}{r.reason === 'adjustment' && (r.type === 'in' ? ' (sobrante)' : ' (faltante)')}</span>
                      <strong>{r.type === 'in' ? '+' : '−'}{r.quantity}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {!productId && (
              <section className="purchase-card">
                <h2>Productos con más movimiento</h2>
                {flow.topProducts.length === 0 ? (
                  <p className="text-secondary">Sin movimientos en este período.</p>
                ) : (
                  <ul className="flow-list">
                    {flow.topProducts.map(p => (
                      <li key={p.productId}>
                        <button type="button" className="link-btn" onClick={() => update({ product: p.productId })}>{p.name}</button>
                        <span className="flow-list__io">{plus(p.in)} / {minus(p.out)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {product && (
              <section className="purchase-card">
                <h2>Producto</h2>
                <p className="text-secondary" style={{ margin: 0 }}>
                  Stock actual {product.stock} · mínimo {product.minStock}
                  {product.targetStock !== null && ` · objetivo ${product.targetStock}`}
                </p>
                <Link to={`/inventory/${product.id}`}>Ver ficha e historial de movimientos</Link>
              </section>
            )}
          </div>

          <details className="flow-table">
            <summary>Ver tabla por día ({activeDays.length} día(s) con movimientos)</summary>
            {activeDays.length === 0 ? (
              <p className="text-secondary">Sin movimientos en este período.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th style={{ textAlign: 'right' }}>Entradas</th>
                      <th style={{ textAlign: 'right' }}>Salidas</th>
                      <th style={{ textAlign: 'right' }}>Stock al cierre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeDays].reverse().map(d => (
                      <tr key={d.date}>
                        <td>{fmtLong(d.date)}</td>
                        <td style={{ textAlign: 'right' }}>{d.in ? `+${d.in}` : '—'}</td>
                        <td style={{ textAlign: 'right' }}>{d.out ? `−${d.out}` : '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{d.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </>
      )}
    </PageDetailLayout>
  );
}
