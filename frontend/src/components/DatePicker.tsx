import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import './DatePicker.css';

interface DatePickerProps {
  value: string;           // "YYYY-MM-DD" o ""
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

function parseIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? undefined : date;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return '';
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  error,
  placeholder = 'dd/mm/aaaa',
  disabled,
  minDate,
  maxDate,
}) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(parseIso(value) ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const selected = parseIso(value);

  // Recalcular posición del popover al abrir
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 340;
      const placeAbove = spaceBelow < calendarHeight + 16;

      setPopoverStyle({
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 300),
        zIndex: 9999,
        ...(placeAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
  }, [open]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('.dp-popover')
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Sincronizar mes al cambiar valor externamente
  useEffect(() => {
    if (selected) setMonth(selected);
  }, [value]);

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      onChange(toIso(day));
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const popover = open
    ? createPortal(
        <div className="dp-popover" style={popoverStyle}>
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleDaySelect}
            month={month}
            onMonthChange={setMonth}
            locale={es}
            captionLayout="dropdown"
            startMonth={new Date(1940, 0)}
            endMonth={new Date(new Date().getFullYear() + 2, 11)}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ] as any}
            showOutsideDays
          />
        </div>,
        document.body
      )
    : null;

  return (
    <div className="input-group" ref={containerRef}>
      {label && <label className="input-label">{label}</label>}

      <div
        className={`dp-trigger ${error ? 'dp-trigger--error' : ''} ${disabled ? 'dp-trigger--disabled' : ''} ${open ? 'dp-trigger--open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setOpen(o => !o);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg className="dp-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>

        <span className={`dp-value ${!selected ? 'dp-value--placeholder' : ''}`}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>

        {selected && !disabled && (
          <button
            type="button"
            className="dp-clear"
            onClick={handleClear}
            aria-label="Limpiar fecha"
            tabIndex={-1}
          >
            ×
          </button>
        )}

        <svg className={`dp-chevron ${open ? 'dp-chevron--open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {error && <span className="error-message">{error}</span>}

      {popover}
    </div>
  );
};
