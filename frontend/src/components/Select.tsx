import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  value?: string;
  /** Recibe un evento con la misma forma que el de un <select> nativo: e.target.name / e.target.value */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /**
   * Texto de la opción vacía. La opción vacía se agrega solo si el campo está
   * vacío o si se pasa placeholder (p. ej. "Todos los roles" en un filtro), y
   * nunca si alguna opción ya usa value ''.
   */
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  /** Icono a la izquierda del valor */
  icon?: React.ReactNode;
  'aria-label'?: string;
}

interface PanelPos { top: number; left: number; width: number; maxHeight: number; up: boolean }

const PANEL_MAX = 280;

/**
 * Combobox de selección única con lista propia (no la del navegador),
 * accesible por teclado: ↑ ↓ Inicio Fin para moverse, Enter/Espacio para
 * elegir, Esc para cerrar, y escribir una letra salta a la opción.
 */
export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  value = '',
  onChange,
  name,
  id,
  disabled,
  required,
  placeholder,
  className = '',
  size = 'md',
  icon,
  'aria-label': ariaLabel,
}) => {
  const autoId = useId();
  const triggerId = id ?? `select-${autoId}`;
  const listId = `${triggerId}-list`;

  const hasEmptyOption = options.some(o => o.value === '');
  const emptyLabel = placeholder ?? 'Seleccionar...';
  const addEmpty = !hasEmptyOption && (value === '' || placeholder !== undefined);
  const allOptions = addEmpty ? [{ value: '', label: emptyLabel }, ...options] : options;
  const selected = allOptions.find(o => o.value === value);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    const up = below < 200 && above > below;
    setPos({
      top: up ? r.top - 6 : r.bottom + 6,
      left: r.left,
      width: r.width,
      maxHeight: Math.min(PANEL_MAX, up ? above : below),
      up,
    });
  }, []);

  const openList = () => {
    if (disabled) return;
    const idx = allOptions.findIndex(o => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    measure();
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (opt.value !== value) {
      const target = { name: name ?? '', value: opt.value } as HTMLSelectElement;
      onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
    }
    close();
  };

  // Cerrar al hacer clic fuera, y reubicar si cambia el tamaño o hay scroll
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
      measure();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, measure]);

  // Mantener visible la opción activa
  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (delta: number) => {
    let i = active;
    for (let step = 0; step < allOptions.length; step++) {
      i = (i + delta + allOptions.length) % allOptions.length;
      if (!allOptions[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); move(-1); break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(allOptions.length - 1); break;
      case 'Enter':
      case ' ': e.preventDefault(); choose(allOptions[active]); break;
      case 'Escape': e.preventDefault(); close(); break;
      case 'Tab': setOpen(false); break;
      default:
        if (e.key.length === 1) {
          const k = e.key.toLowerCase();
          const start = (active + 1) % allOptions.length;
          const order = [...allOptions.slice(start), ...allOptions.slice(0, start)];
          const hit = order.find(o => !o.disabled && o.label.trim().toLowerCase().startsWith(k));
          if (hit) setActive(allOptions.indexOf(hit));
        }
    }
  };

  return (
    <div className={`input-group ds-select ds-select--${size} ${className}`}>
      {label && (
        <label className="input-label" htmlFor={triggerId}>
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={`ds-select__trigger${open ? ' is-open' : ''}${error ? ' is-error' : ''}${!value && !hasEmptyOption ? ' is-placeholder' : ''}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        aria-required={required}
        aria-invalid={!!error}
      >
        {icon && <span className="ds-select__icon">{icon}</span>}
        <span className="ds-select__value">{selected?.label ?? emptyLabel}</span>
        <ChevronDown size={16} className="ds-select__chevron" aria-hidden="true" />
      </button>
      {name && <input type="hidden" name={name} value={value} />}

      {open && pos && createPortal(
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className={`ds-select__panel${pos.up ? ' is-up' : ''}`}
          style={{
            top: pos.up ? undefined : pos.top,
            bottom: pos.up ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            minWidth: pos.width,
            maxHeight: pos.maxHeight,
          }}
        >
          {allOptions.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <li
                key={`${opt.value}-${i}`}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                className={`ds-select__option${i === active ? ' is-active' : ''}${isSelected ? ' is-selected' : ''}${opt.disabled ? ' is-disabled' : ''}`}
                onMouseEnter={() => !opt.disabled && setActive(i)}
                onMouseDown={e => e.preventDefault()}
                onClick={() => choose(opt)}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={16} className="ds-select__check" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}

      {error && <span className="error-message">{error}</span>}
    </div>
  );
};
