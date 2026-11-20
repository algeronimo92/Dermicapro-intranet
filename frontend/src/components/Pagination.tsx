import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select } from './Select';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total de registros: activa el texto "Mostrando X–Y de Z" */
  totalItems?: number;
  /** Tamaño de página actual; junto con onPageSizeChange muestra el selector */
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  /** Nombre de lo que se lista, en plural: "pacientes", "pagos"… */
  itemLabel?: string;
  className?: string;
}

export const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

/**
 * Páginas visibles: todas si son 7 o menos; si no, primera, última y la
 * vecindad de la actual, con "…" donde se salta.
 *   1 2 3 4 5 … 12   ·   1 … 5 6 7 … 12   ·   1 … 8 9 10 11 12
 */
export function getPageItems(current: number, total: number): Array<number | 'gap-start' | 'gap-end'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, 'gap-end', total];
  if (current >= total - 3) return [1, 'gap-start', total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap-start', current - 1, current, current + 1, 'gap-end', total];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  itemLabel = 'registros',
  className = '',
}) => {
  const showSizeSelector = !!onPageSizeChange && !!pageSize && (totalItems === undefined || totalItems > Math.min(...pageSizeOptions));
  const showPages = totalPages > 1;
  if (!showPages && !showSizeSelector) return null;

  const from = totalItems !== undefined && pageSize ? Math.min(totalItems, (currentPage - 1) * pageSize + 1) : undefined;
  const to = totalItems !== undefined && pageSize ? Math.min(totalItems, currentPage * pageSize) : undefined;

  const go = (page: number) => {
    const next = Math.min(Math.max(1, page), totalPages);
    if (next !== currentPage) onPageChange(next);
  };

  return (
    <nav className={`pager ${className}`} aria-label="Paginación">
      <div className="pager__meta">
        {totalItems !== undefined && from !== undefined && to !== undefined && totalItems > 0 && (
          <span className="pager__summary">
            Mostrando <strong>{from}–{to}</strong> de <strong>{totalItems}</strong> {itemLabel}
          </span>
        )}
        {showSizeSelector && (
          <span className="pager__size">
            <span className="pager__size-label">Por página</span>
            <Select
              size="sm"
              aria-label="Registros por página"
              value={String(pageSize)}
              onChange={e => onPageSizeChange!(Number(e.target.value))}
              options={pageSizeOptions.map(n => ({ value: String(n), label: String(n) }))}
              className="pager__size-select"
            />
          </span>
        )}
      </div>

      {showPages && (
        <div className="pager__controls">
          <button
            type="button"
            className="pager__btn pager__btn--edge"
            onClick={() => go(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="pager__edge-label">Anterior</span>
          </button>

          <ul className="pager__pages">
            {getPageItems(currentPage, totalPages).map(item =>
              typeof item === 'number' ? (
                <li key={item}>
                  <button
                    type="button"
                    className={`pager__btn pager__page${item === currentPage ? ' is-current' : ''}`}
                    onClick={() => go(item)}
                    aria-label={`Página ${item}`}
                    aria-current={item === currentPage ? 'page' : undefined}
                  >
                    {item}
                  </button>
                </li>
              ) : (
                <li key={item} className="pager__gap" aria-hidden="true">…</li>
              )
            )}
          </ul>

          <span className="pager__compact" aria-hidden="true">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            className="pager__btn pager__btn--edge"
            onClick={() => go(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Página siguiente"
          >
            <span className="pager__edge-label">Siguiente</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </nav>
  );
};
