import React from 'react';
import { Button } from './Button';
import { PackageGroup } from '../utils/packageSimulation';
import { ServiceIcon } from '../utils/serviceIcons';

interface PackageGroupViewProps {
  packageGroups: PackageGroup[];
  services: Array<{ id: string; basePrice: number }>;
  onRemoveSession: (originalIndex: number) => void;
  onUpdatePackagePrice?: (tempPackageId: string, newPrice: number) => void;
  readOnly?: boolean;
}

export const PackageGroupView: React.FC<PackageGroupViewProps> = ({
  packageGroups,
  services,
  onRemoveSession,
  onUpdatePackagePrice,
  readOnly = false,
}) => {
  if (packageGroups.length === 0) return null;

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
    <div className="pkg-group">
      <PackageHeader
        serviceName={packageGroup.serviceName}
        isNewPackage={isNewPackage}
        sessionCount={packageGroup.sessions.length}
        totalSessions={packageGroup.totalSessions}
        completedSessions={packageGroup.completedSessions}
        scheduledElsewhere={packageGroup.scheduledElsewhere}
        hasPendingReservations={packageGroup.hasPendingReservations}
        orderCreatedAt={packageGroup.orderCreatedAt}
        finalPrice={packageGroup.finalPrice}
        basePrice={service?.basePrice}
        tempPackageId={packageGroup.id}
        onUpdatePrice={onUpdatePackagePrice}
        readOnly={readOnly || !!packageGroup.hasPaymentOrder}
        isPaymentOrderPaid={packageGroup.isPaymentOrderPaid}
      />
      <div className="pkg-sessions">
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

const PackageHeader: React.FC<{
  serviceName: string;
  isNewPackage: boolean;
  sessionCount: number;
  totalSessions: number;
  completedSessions?: number;
  scheduledElsewhere?: number;
  hasPendingReservations?: boolean;
  orderCreatedAt?: string;
  finalPrice?: number;
  basePrice?: number;
  tempPackageId?: string;
  onUpdatePrice?: (tempPackageId: string, newPrice: number) => void;
  readOnly?: boolean;
  isPaymentOrderPaid?: boolean;
}> = ({
  serviceName, isNewPackage, sessionCount, totalSessions,
  completedSessions = 0, scheduledElsewhere,
  hasPendingReservations = false,
  orderCreatedAt, finalPrice, basePrice, tempPackageId, onUpdatePrice,
  readOnly = false, isPaymentOrderPaid = false,
}) => {
  const [isEditingPrice, setIsEditingPrice] = React.useState(false);
  const [editedPrice, setEditedPrice] = React.useState(
    finalPrice?.toString() || basePrice?.toString() || '0'
  );

  React.useEffect(() => {
    setEditedPrice(finalPrice?.toString() || basePrice?.toString() || '0');
  }, [finalPrice, basePrice]);

  const handleSave = () => {
    const val = parseFloat(editedPrice);
    if (!isNaN(val) && val >= 0 && tempPackageId && onUpdatePrice) {
      onUpdatePrice(tempPackageId, val);
      setIsEditingPrice(false);
    }
  };

  const handleCancel = () => {
    setEditedPrice(finalPrice?.toString() || basePrice?.toString() || '0');
    setIsEditingPrice(false);
  };

  const discount = basePrice && finalPrice ? ((basePrice - finalPrice) / basePrice) * 100 : 0;
  const hasDiscount = Math.abs(discount) > 0.01;

  return (
    <div className={`pkg-header ${isNewPackage && !readOnly ? 'pkg-header--new' : ''}`}>
      <div className="pkg-header__left">
        <span className="pkg-header__name">{serviceName}</span>

        {/* Precio */}
        {!readOnly && isEditingPrice ? (
          <div className="pkg-price-edit">
            <input
              className="pkg-price-edit__input"
              type="number"
              value={editedPrice}
              onChange={(e) => setEditedPrice(e.target.value)}
              step="0.01"
              min="0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <button className="pkg-price-btn pkg-price-btn--save" onClick={handleSave}>✓</button>
            <button className="pkg-price-btn pkg-price-btn--cancel" onClick={handleCancel}>✕</button>
          </div>
        ) : (finalPrice !== undefined || basePrice !== undefined) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <span className="pkg-header__price">
              S/. {Number(finalPrice ?? basePrice).toFixed(2)}
            </span>
            {/* Botones de edición — solo si no tiene orden de pago */}
            {!readOnly && onUpdatePrice && (
              <>
                <button className="pkg-price-btn pkg-price-btn--edit" onClick={() => setIsEditingPrice(true)} title="Editar precio">✎</button>
                {hasDiscount && tempPackageId && (
                  <button
                    className="pkg-price-btn pkg-price-btn--restore"
                    title="Restaurar precio de lista"
                    onClick={() => {
                      if (basePrice && tempPackageId && onUpdatePrice) {
                        onUpdatePrice(tempPackageId, basePrice);
                        setEditedPrice(basePrice.toString());
                      }
                    }}
                  >⟲</button>
                )}
              </>
            )}
            {hasDiscount && (
              <span className={`pkg-header__badge ${discount > 0 ? 'pkg-header__badge--discount' : 'pkg-header__badge--increase'}`}>
                {discount > 0 ? `${discount.toFixed(0)}% OFF` : `+${Math.abs(discount).toFixed(0)}%`}
              </span>
            )}
            {/* Badge de estado de orden de pago */}
            {isPaymentOrderPaid && (
              <span className="pkg-header__badge" style={{ background: 'var(--color-success-alpha-10)', color: 'var(--color-success-dark)', border: '1px solid var(--color-success)', fontSize: 10 }}>
                ✓ Con Orden de Pago
              </span>
            )}
            {readOnly && !isPaymentOrderPaid && !isNewPackage && (
              <span className="pkg-header__badge" style={{ background: 'var(--color-warning-alpha-10)', color: 'var(--color-warning-dark)', border: '1px solid var(--color-warning)', fontSize: 10 }}>
                Orden de Pago pendiente
              </span>
            )}
          </div>
        ) : null}

        {/* Badges de tipo (solo en modo edición) */}
        {!readOnly && isNewPackage && (
          <span className="pkg-header__badge pkg-header__badge--new">Paquete Nuevo</span>
        )}
        {!readOnly && !isNewPackage && (
          <>
            <span className="pkg-header__badge pkg-header__badge--existing">Paquete Existente</span>
            {orderCreatedAt && (
              <span className="pkg-header__meta">
                Creado {new Date(orderCreatedAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            )}
          </>
        )}
        {hasPendingReservations && (
          <span className="pkg-header__badge pkg-header__badge--warning" title="Este paquete tiene sesiones reservadas en otras citas">
            ⚠ Reservas pendientes
          </span>
        )}
      </div>

      <div className="pkg-header__right">
        {!isNewPackage && completedSessions > 0 && (
          <span className="pkg-header__attended">
            ✓ {completedSessions} atendida{completedSessions > 1 ? 's' : ''}
          </span>
        )}
        <span className="pkg-header__counter">
          {(scheduledElsewhere ?? completedSessions) + sessionCount} de {totalSessions}
        </span>
      </div>
    </div>
  );
};

const SessionItem: React.FC<{
  session: any;
  service: any;
  serviceName: string;
  isLastInGroup: boolean;
  totalSessions: number;
  onRemove: () => void;
  readOnly?: boolean;
}> = ({ session, serviceName, totalSessions, onRemove, readOnly = false }) => {
  const isNew = session.isNew && !readOnly;
  const isDel = session.markedForDeletion && !readOnly;

  const cls = isDel ? 'pkg-session pkg-session--deleting' : isNew ? 'pkg-session pkg-session--new' : 'pkg-session';

  return (
    <div className={cls}>
      {isNew && (
        <div className="pkg-session__abs-badge pkg-session__abs-badge--add">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Por Agregar
        </div>
      )}
      {isDel && (
        <div className="pkg-session__abs-badge pkg-session__abs-badge--del">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Por Eliminar
        </div>
      )}

      <div className="pkg-session__inner">
        <div className="pkg-session__icon">
          <ServiceIcon serviceName={serviceName} size={18} color="currentColor" />
        </div>
        <div>
          <p className="pkg-session__name">Sesión {session.calculatedSessionNumber}</p>
          <span className="pkg-session__chip">{session.calculatedSessionNumber} de {totalSessions}</span>
        </div>
      </div>

      {!readOnly && (
        <Button
          type="button"
          variant={isDel ? 'primary' : 'secondary'}
          size="small"
          onClick={onRemove}
        >
          {isDel ? 'Restaurar' : 'Quitar'}
        </Button>
      )}
    </div>
  );
};
