import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Service } from '../types';

interface ServiceSelectorProps {
  value: string;
  onChange: (serviceId: string) => void;
  services: Service[];
  label?: string;
  error?: string;
  disabled?: boolean;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  value,
  onChange,
  services,
  label = 'Servicio/Tratamiento *',
  error,
  disabled,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedService = services.find(s => s.id === value);

  const filtered = searchTerm.trim()
    ? services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : services;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const getDropdownPosition = () => {
    if (!containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    };
  };

  const formatLabel = (s: Service) => {
    const price = `S/. ${Number(s.basePrice).toLocaleString('es-PE')}`;
    const sessions = s.defaultSessions > 1 ? ` · ${s.defaultSessions} sesiones` : '';
    return { name: s.name, meta: `${price}${sessions}` };
  };

  return (
    <div className="service-selector">
      {label && <label className="input-label">{label}</label>}

      {selectedService ? (
        <div className={`service-selected${error ? ' service-selected-error' : ''}`}>
          <div className="service-selected-info">
            <span className="service-selected-name">{selectedService.name}</span>
            <span className="service-selected-meta">
              S/. {Number(selectedService.basePrice).toLocaleString('es-PE')}
              {selectedService.defaultSessions > 1 && ` · ${selectedService.defaultSessions} sesiones`}
            </span>
          </div>
          <button
            type="button"
            className="btn-clear-service"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Quitar servicio"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="service-search-container" ref={containerRef}>
          <div className="service-search-input-wrapper">
            <svg className="service-search-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              className={`input service-search-input${error ? ' input-error' : ''}`}
              placeholder="Buscar servicio o tratamiento..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              disabled={disabled}
              autoComplete="off"
            />
          </div>

          {isOpen && containerRef.current && createPortal(
            <div ref={dropdownRef} className="service-dropdown" style={getDropdownPosition()}>
              {filtered.length === 0 ? (
                <div className="service-dropdown-item service-dropdown-empty">
                  No se encontraron servicios
                </div>
              ) : (
                filtered.map(s => {
                  const { name, meta } = formatLabel(s);
                  return (
                    <div
                      key={s.id}
                      className="service-dropdown-item"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelect(s.id)}
                    >
                      <span className="service-dropdown-name">{name}</span>
                      <span className="service-dropdown-meta">{meta}</span>
                    </div>
                  );
                })
              )}
            </div>,
            document.body
          )}
        </div>
      )}

      {error && <span className="error-message">{error}</span>}
    </div>
  );
};
