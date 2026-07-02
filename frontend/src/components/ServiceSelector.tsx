import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Service, ServicePackage } from '../types';

interface ServiceSelectorProps {
  /** id del ServicePackage seleccionado */
  value: string;
  onChange: (servicePackageId: string) => void;
  services: Service[];
  label?: string;
  error?: string;
  disabled?: boolean;
}

const formatPrice = (price: number) => `S/. ${Number(price).toLocaleString('es-PE')}`;

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
  const [pickedServiceId, setPickedServiceId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resuelve el paquete seleccionado y su servicio padre a partir del value actual
  let selectedPackage: ServicePackage | undefined;
  let selectedService: Service | undefined;
  for (const s of services) {
    const pkg = s.packages?.find(p => p.id === value);
    if (pkg) {
      selectedPackage = pkg;
      selectedService = s;
      break;
    }
  }

  const servicesWithPackages = services.filter(s => (s.packages?.length ?? 0) > 0);

  const filteredServices = searchTerm.trim()
    ? servicesWithPackages.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : servicesWithPackages;

  const pickedService = pickedServiceId ? services.find(s => s.id === pickedServiceId) : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setPickedServiceId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePickService = (serviceId: string) => {
    setPickedServiceId(serviceId);
  };

  const handleSelectPackage = (servicePackageId: string) => {
    onChange(servicePackageId);
    setIsOpen(false);
    setPickedServiceId(null);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setPickedServiceId(null);
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

  return (
    <div className="service-selector">
      {label && <label className="input-label">{label}</label>}

      {selectedPackage && selectedService ? (
        <div className={`service-selected${error ? ' service-selected-error' : ''}`}>
          <div className="service-selected-info">
            <span className="service-selected-name">
              {selectedService.name}
              {selectedPackage.label ? ` — ${selectedPackage.label}` : ''}
            </span>
            <span className="service-selected-meta">
              {formatPrice(selectedPackage.price)}
              {selectedPackage.sessions > 1 && ` · ${selectedPackage.sessions} sesiones`}
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
              placeholder={pickedService ? pickedService.name : 'Buscar servicio o tratamiento...'}
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
              {pickedService ? (
                <>
                  <div
                    className="service-dropdown-item service-dropdown-back"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setPickedServiceId(null)}
                  >
                    ‹ Cambiar servicio
                  </div>
                  {(pickedService.packages ?? []).map(pkg => (
                    <div
                      key={pkg.id}
                      className="service-dropdown-item"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelectPackage(pkg.id)}
                    >
                      <span className="service-dropdown-name">{pkg.label || 'Individual'}</span>
                      <span className="service-dropdown-meta">
                        {formatPrice(pkg.price)}
                        {pkg.sessions > 1 && ` · ${pkg.sessions} sesiones`}
                      </span>
                    </div>
                  ))}
                </>
              ) : filteredServices.length === 0 ? (
                <div className="service-dropdown-item service-dropdown-empty">
                  No se encontraron servicios
                </div>
              ) : (
                filteredServices.map(s => (
                  <div
                    key={s.id}
                    className="service-dropdown-item"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handlePickService(s.id)}
                  >
                    <span className="service-dropdown-name">{s.name}</span>
                    <span className="service-dropdown-meta">
                      {s.packages?.length} {s.packages?.length === 1 ? 'paquete' : 'paquetes'}
                    </span>
                  </div>
                ))
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
