/**
 * Package Group View Component
 *
 * Presents simulated package groups in a clear, organized manner.
 * Separates presentation logic from business logic.
 *
 * @pattern Presenter - Clean separation of concerns
 * @pattern Component Composition - Reusable sub-components
 */

import React from 'react';
import { Button } from './Button';
import { PackageGroup } from '../utils/packageSimulation';
import { ServiceIcon } from '../utils/serviceIcons';

interface PackageGroupViewProps {
  packageGroups: PackageGroup[];
  services: Array<{ id: string; basePrice: number }>;
  onRemoveSession: (originalIndex: number) => void;
  onUpdatePackagePrice?: (tempPackageId: string, newPrice: number) => void;
  readOnly?: boolean; // Modo solo lectura (sin botones ni badges de edición)
}

/**
 * Main component that renders all package groups
 */
export const PackageGroupView: React.FC<PackageGroupViewProps> = ({
  packageGroups,
  services,
  onRemoveSession,
  onUpdatePackagePrice,
  readOnly = false,
}) => {
  if (packageGroups.length === 0) {
    return null;
  }

  return (
    <div className="services-list">
      {packageGroups.map((packageGroup) => (
        <PackageGroupCard
          key={packageGroup.id}
          packageGroup={packageGroup}
          services={services}
          onRemoveSession={onRemoveSession}
          onUpdatePackagePrice={onUpdatePackagePrice}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
};

/**
 * Individual package group card
 */
const PackageGroupCard: React.FC<{
  packageGroup: PackageGroup;
  services: Array<{ id: string; basePrice: number }>;
  onRemoveSession: (originalIndex: number) => void;
  onUpdatePackagePrice?: (tempPackageId: string, newPrice: number) => void;
  readOnly?: boolean;
}> = ({ packageGroup, services, onRemoveSession, onUpdatePackagePrice, readOnly = false }) => {
  const isNewPackage = packageGroup.type === 'new';
  const service = services.find((s) => s.id === packageGroup.serviceId);

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Package Header */}
      <PackageHeader
        serviceName={packageGroup.serviceName}
        isNewPackage={isNewPackage}
        sessionCount={packageGroup.sessions.length}
        totalSessions={packageGroup.totalSessions}
        completedSessions={packageGroup.completedSessions}
        hasPendingReservations={packageGroup.hasPendingReservations}
        orderCreatedAt={packageGroup.orderCreatedAt}
        finalPrice={packageGroup.finalPrice}
        basePrice={service?.basePrice}
        tempPackageId={packageGroup.id}
        onUpdatePrice={onUpdatePackagePrice}
        readOnly={readOnly}
      />

      {/* Sessions List */}
      <div
        style={{
          border: '2px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          overflow: 'hidden',
        }}
      >
        {packageGroup.sessions.map((session, idx) => (
          <SessionItem
            key={session.originalIndex}
            session={session}
            service={service}
            serviceName={packageGroup.serviceName}
            isLastInGroup={idx === packageGroup.sessions.length - 1}
            totalSessions={packageGroup.totalSessions}
            onRemove={() => onRemoveSession(session.originalIndex)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Package header component
 */
const PackageHeader: React.FC<{
  serviceName: string;
  isNewPackage: boolean;
  sessionCount: number;
  totalSessions: number;
  completedSessions?: number;
  hasPendingReservations?: boolean;
  orderCreatedAt?: string;
  finalPrice?: number;
  basePrice?: number;
  tempPackageId?: string;
  onUpdatePrice?: (tempPackageId: string, newPrice: number) => void;
  readOnly?: boolean;
}> = ({ serviceName, isNewPackage, sessionCount, totalSessions, completedSessions = 0, hasPendingReservations = false, orderCreatedAt, finalPrice, basePrice, tempPackageId, onUpdatePrice, readOnly = false }) => {
  const [isEditingPrice, setIsEditingPrice] = React.useState(false);
  const [editedPrice, setEditedPrice] = React.useState(finalPrice?.toString() || basePrice?.toString() || '0');

  // Sync local state when finalPrice changes from parent
  React.useEffect(() => {
    setEditedPrice(finalPrice?.toString() || basePrice?.toString() || '0');
  }, [finalPrice, basePrice]);

  const handleSavePrice = () => {
    const newPrice = parseFloat(editedPrice);
    if (!isNaN(newPrice) && newPrice >= 0 && tempPackageId && onUpdatePrice) {
      onUpdatePrice(tempPackageId, newPrice);
      setIsEditingPrice(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedPrice(finalPrice?.toString() || basePrice?.toString() || '0');
    setIsEditingPrice(false);
  };

  // Calcular descuento/aumento
  const discount = basePrice && finalPrice ? ((basePrice - finalPrice) / basePrice) * 100 : 0;
  const hasDiscount = Math.abs(discount) > 0.01;

  return (
  <div
    style={{
      background: readOnly ? '#f3f4f6' : (isNewPackage
        ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
        : '#f3f4f6'),
      padding: '12px 16px',
      borderRadius: '8px 8px 0 0',
      borderBottom: '2px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
        {serviceName}
      </span>

      {/* Precio - Editable para todos los paquetes */}
      {!readOnly && isEditingPrice ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            value={editedPrice}
            onChange={(e) => setEditedPrice(e.target.value)}
            step="0.01"
            min="0"
            style={{
              width: '100px',
              padding: '4px 8px',
              border: '2px solid #3b82f6',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSavePrice();
              if (e.key === 'Escape') handleCancelEdit();
            }}
          />
          <button
            onClick={handleSavePrice}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            ✓
          </button>
          <button
            onClick={handleCancelEdit}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            ✕
          </button>
        </div>
      ) : finalPrice !== undefined || basePrice !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              background: '#10b981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            S/. {Number(finalPrice || basePrice).toFixed(2)}
          </span>

          {/* Botón para editar precio (todos los paquetes) */}
          {!readOnly && onUpdatePrice && (
            <>
              <button
                onClick={() => setIsEditingPrice(true)}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
                title="Editar precio"
              >
                ✎
              </button>

              {/* Botón para restaurar precio original (solo si hay precio personalizado) */}
              {hasDiscount && tempPackageId && (
                <button
                  onClick={() => {
                    if (basePrice && tempPackageId && onUpdatePrice) {
                      onUpdatePrice(tempPackageId, basePrice);
                      setEditedPrice(basePrice.toString());
                    }
                  }}
                  style={{
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                  title="Restaurar precio de lista"
                >
                  ⟲
                </button>
              )}
            </>
          )}

          {/* Badge de descuento/aumento */}
          {hasDiscount && (
            <span
              style={{
                background: discount > 0 ? '#dcfce7' : '#fee2e2',
                color: discount > 0 ? '#166534' : '#991b1b',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              {discount > 0 ? `${discount.toFixed(0)}% OFF` : `+${Math.abs(discount).toFixed(0)}%`}
            </span>
          )}
        </div>
      ) : null}
      {!readOnly && isNewPackage && (
        <span
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
          }}
        >
          🆕 Paquete Nuevo
        </span>
      )}
      {!readOnly && !isNewPackage && (
        <>
          <span
            style={{
              background: '#6b7280',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            📦 Paquete Existente
          </span>
          {orderCreatedAt && (
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              Creado {new Date(orderCreatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          )}
        </>
      )}
      {hasPendingReservations && (
        <span
          style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: '2px 8px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
          }}
          title="Este paquete tiene sesiones reservadas en otras citas"
        >
          ⚠️ Reservas pendientes
        </span>
      )}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {!isNewPackage && completedSessions > 0 && (
        <span style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
          ✓ {completedSessions} atendida{completedSessions > 1 ? 's' : ''}
        </span>
      )}
      <span style={{ fontSize: '12px', color: '#374151', fontWeight: '600' }}>
        {sessionCount} de {totalSessions}
      </span>
    </div>
  </div>
  );
};

/**
 * Individual session item
 */
const SessionItem: React.FC<{
  session: any;
  service: any;
  serviceName: string;
  isLastInGroup: boolean;
  totalSessions: number;
  onRemove: () => void;
  readOnly?: boolean;
}> = ({ session, service, serviceName, isLastInGroup, totalSessions, onRemove, readOnly = false }) => {
  const isNewSession = session.isNew;
  const isMarkedForDeletion = session.markedForDeletion;

  return (
    <div
      className="service-item"
      style={{
        background: readOnly ? 'white' : (isMarkedForDeletion
          ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' // Rojo claro para eliminar
          : isNewSession
          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' // Verde claro para nuevo
          : 'white'), // Blanco para existente normal
        borderBottom: !isLastInGroup ? '1px solid #e5e7eb' : 'none',
        borderRadius: 0,
        position: 'relative',
        opacity: isMarkedForDeletion && !readOnly ? 0.6 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {!readOnly && isNewSession && !isMarkedForDeletion && <NewSessionBadge />}
      {!readOnly && isMarkedForDeletion && <DeleteSessionBadge />}

      <div className="service-content" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: isMarkedForDeletion
              ? '#fecaca'
              : isNewSession
              ? '#dcfce7'
              : '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ServiceIcon
            serviceName={serviceName}
            size={20}
            color={isMarkedForDeletion ? '#991b1b' : isNewSession ? '#166534' : '#6b7280'}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3 className="service-name" style={{
            fontSize: '14px',
            margin: 0,
            textDecoration: isMarkedForDeletion ? 'line-through' : 'none',
          }}>
            Sesión {session.calculatedSessionNumber}
          </h3>
          <span
            className="service-badge"
            style={{
              background: isMarkedForDeletion
                ? '#fee2e2'
                : isNewSession
                ? '#dcfce7'
                : '#e5e7eb',
              color: isMarkedForDeletion
                ? '#991b1b'
                : isNewSession
                ? '#166534'
                : '#374151',
            }}
          >
            {session.calculatedSessionNumber} de {totalSessions}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!readOnly && (
          <Button
            type="button"
            variant={isMarkedForDeletion ? "primary" : "secondary"}
            size="small"
            onClick={onRemove}
          >
            {isMarkedForDeletion ? 'Restaurar' : 'Quitar'}
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * New session indicator badge
 */
const NewSessionBadge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: '#10b981',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
    }}
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
    Por Agregar
  </div>
);

/**
 * Delete session indicator badge
 */
const DeleteSessionBadge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: '#dc2626',
      color: 'white',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
    }}
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
    Por Eliminar
  </div>
);
