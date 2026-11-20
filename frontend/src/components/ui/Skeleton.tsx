import React from 'react';
import '../../styles/skeleton.css';

/**
 * Placeholders de carga con la forma del contenido final.
 * Se muestran solo en la primera carga: cuando ya hay datos, las páginas
 * deben mantenerlos visibles mientras se refrescan.
 */

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 14, radius, className = '', style }) => (
  <span
    className={`skeleton ${className}`}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

/** Contenedor accesible: anuncia la carga una sola vez a lectores de pantalla */
export const SkeletonRegion: React.FC<{ label?: string; className?: string; children: React.ReactNode }> = ({
  label = 'Cargando…', className = '', children,
}) => (
  <div className={`skeleton-region ${className}`} role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

export const SkeletonStatCard: React.FC = () => (
  <div className="skeleton-card">
    <div className="skeleton-row skeleton-row--between">
      <Skeleton width="45%" height={12} />
      <Skeleton width={40} height={40} radius={10} />
    </div>
    <Skeleton width="60%" height={30} style={{ marginTop: 18 }} />
    <Skeleton width="38%" height={12} style={{ marginTop: 12 }} />
  </div>
);

export const SkeletonChart: React.FC<{ height?: number }> = ({ height = 240 }) => (
  <div className="skeleton-card">
    <Skeleton width="34%" height={16} />
    <Skeleton width="52%" height={11} style={{ marginTop: 8 }} />
    <div className="skeleton-chart" style={{ height }}>
      {[55, 72, 40, 88, 64, 78, 46, 92, 60, 70, 52, 80].map((h, i) => (
        <span key={i} className="skeleton skeleton-chart__bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <SkeletonRegion label="Cargando dashboard…">
    <Skeleton width={140} height={18} style={{ marginBottom: 16 }} />
    <div className="stats-grid stats-grid--4">
      {Array.from({ length: 4 }, (_, i) => <SkeletonStatCard key={i} />)}
    </div>
    <div className="dashboard__charts-row">
      <SkeletonChart height={240} />
      <SkeletonChart height={240} />
    </div>
    <Skeleton width={180} height={18} style={{ margin: '32px 0 16px' }} />
    <div className="stats-grid stats-grid--4">
      {Array.from({ length: 4 }, (_, i) => <SkeletonStatCard key={i} />)}
    </div>
  </SkeletonRegion>
);

/** Tabla o lista: cabecera + filas */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 8, columns = 5 }) => (
  <SkeletonRegion label="Cargando datos…" className="skeleton-table">
    <div className="skeleton-table__row skeleton-table__row--head" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }, (_, c) => <Skeleton key={c} width="55%" height={11} />)}
    </div>
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="skeleton-table__row" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} width={c === 0 ? '80%' : `${45 + ((r * 7 + c * 13) % 40)}%`} height={13} />
        ))}
      </div>
    ))}
  </SkeletonRegion>
);

/** Página de detalle: encabezado con avatar + tarjetas de información */
export const DetailSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <SkeletonRegion label="Cargando detalle…">
    <div className="skeleton-card skeleton-row" style={{ gap: 16, marginBottom: 20 }}>
      <Skeleton width={64} height={64} radius="50%" />
      <div style={{ flex: 1 }}>
        <Skeleton width="40%" height={22} />
        <Skeleton width="25%" height={12} style={{ marginTop: 10 }} />
      </div>
      <Skeleton width={110} height={36} radius={8} />
    </div>
    <div className="skeleton-grid">
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="skeleton-card">
          <Skeleton width="35%" height={14} />
          {[85, 70, 92, 60].map((w, j) => <Skeleton key={j} width={`${w}%`} height={12} style={{ marginTop: 14 }} />)}
        </div>
      ))}
    </div>
  </SkeletonRegion>
);

/** Rejilla de tarjetas (catálogos, tableros) */
export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <SkeletonRegion label="Cargando…" className="skeleton-grid">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton-card">
        <div className="skeleton-row" style={{ gap: 12 }}>
          <Skeleton width={42} height={42} radius={10} />
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="35%" height={11} style={{ marginTop: 8 }} />
          </div>
        </div>
        <Skeleton width="90%" height={12} style={{ marginTop: 16 }} />
        <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
      </div>
    ))}
  </SkeletonRegion>
);
