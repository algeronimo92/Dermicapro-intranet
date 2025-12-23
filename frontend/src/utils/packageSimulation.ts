/**
 * Package Simulation Utility
 *
 * Implements a simulation layer that mirrors backend package creation logic.
 * Uses Strategy Pattern + Factory Pattern for clean architecture.
 *
 * @pattern Strategy - Different grouping strategies for sessions
 * @pattern Factory - Creates package groups from sessions
 * @pattern Value Object - Immutable domain objects
 */

// ============================================
// DOMAIN TYPES (Value Objects)
// ============================================

export interface SessionInput {
  serviceId: string;
  orderId?: string;
  sessionNumber?: number;
  appointmentServiceId?: string;
  tempPackageId?: string; // ID temporal para distinguir diferentes paquetes nuevos del mismo servicio
  markedForDeletion?: boolean; // Marca sesiones existentes para eliminar
}

export interface ServiceMetadata {
  id: string;
  name: string;
  basePrice: number;
  defaultSessions: number;
}

export interface OrderMetadata {
  id: string;
  totalSessions: number;
  serviceId: string;
  createdAt: string;
  finalPrice?: number;
  appointmentServices?: Array<{
    sessionNumber?: number | null;
    appointment?: {
      status?: string;
    };
  }>;
}

export interface SimulatedSession extends SessionInput {
  originalIndex: number;
  calculatedSessionNumber: number;
  isNew: boolean;
}

export interface PackageGroup {
  id: string; // unique identifier
  type: 'existing' | 'new';
  serviceId: string;
  serviceName: string;
  orderId?: string;
  totalSessions: number;
  sessions: SimulatedSession[];
  hasNewSessions: boolean;
  orderCreatedAt?: string;
  finalPrice?: number; // Precio final del paquete completo

  // Additional context for better UX
  hasPendingReservations: boolean; // Has reserved sessions in other appointments
  completedSessions: number; // Number of attended sessions
  cancelledSessions: number; // Number of cancelled sessions
  isComplete: boolean; // All sessions are scheduled/attended
}

// ============================================
// STRATEGY PATTERN: Session Number Calculator
// ============================================

interface SessionNumberStrategy {
  calculate(
    session: SessionInput,
    indexInGroup: number,
    previousSessions: SessionInput[],
    order?: OrderMetadata
  ): number;
}

class ExistingPackageStrategy implements SessionNumberStrategy {
  calculate(
    session: SessionInput,
    _indexInGroup: number,
    previousSessions: SessionInput[],
    order?: OrderMetadata
  ): number {
    if (session.sessionNumber) {
      return session.sessionNumber;
    }

    if (!order) {
      throw new Error('Order is required for existing package strategy');
    }

    // Calculate next available session number in existing package
    const appointmentServices = order.appointmentServices || [];
    const nonCancelledAppointments = appointmentServices.filter(
      (a) => a.appointment?.status !== 'cancelled'
    );
    const occupiedNumbers = new Set(
      nonCancelledAppointments.map((a) => a.sessionNumber).filter(Boolean)
    );

    // Add numbers from previous sessions in this group
    previousSessions.forEach((s) => {
      if (s.sessionNumber) {
        occupiedNumbers.add(s.sessionNumber);
      }
    });

    let nextNumber = 1;
    while (occupiedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    return nextNumber;
  }
}

class NewPackageStrategy implements SessionNumberStrategy {
  calculate(
    session: SessionInput,
    indexInGroup: number,
    _previousSessions: SessionInput[]
  ): number {
    if (session.sessionNumber) {
      return session.sessionNumber;
    }

    // For new packages, sessions are numbered sequentially
    return indexInGroup + 1;
  }
}

// ============================================
// FACTORY PATTERN: Package Group Factory
// ============================================

class PackageGroupFactory {
  private existingStrategy = new ExistingPackageStrategy();
  private newStrategy = new NewPackageStrategy();

  /**
   * Creates a package group from sessions
   * @pattern Factory Method
   */
  createPackageGroup(
    packageKey: string,
    sessions: Array<SessionInput & { originalIndex: number }>,
    services: ServiceMetadata[],
    orders: OrderMetadata[],
    isEditMode: boolean,
    customPrices?: Record<string, number>
  ): PackageGroup {
    const firstSession = sessions[0];
    const service = services.find((s) => s.id === firstSession.serviceId);

    if (!service) {
      throw new Error(`Service not found: ${firstSession.serviceId}`);
    }

    const isExistingPackage = packageKey.startsWith('existing-');
    const order = isExistingPackage
      ? orders.find((o) => o.id === firstSession.orderId)
      : null;

    // Calculate session numbers using appropriate strategy
    const strategy = isExistingPackage ? this.existingStrategy : this.newStrategy;
    const sessionsWithNumbers: SimulatedSession[] = sessions.map((sess, idx) => {
      const previousSessions = sessions.slice(0, idx);
      const sessionNumber = strategy.calculate(sess, idx, previousSessions, order || undefined);

      return {
        ...sess,
        calculatedSessionNumber: sessionNumber,
        isNew: isEditMode && !sess.appointmentServiceId,
      };
    });

    const totalSessions = order?.totalSessions || service.defaultSessions || sessions.length;
    const hasNewSessions = sessionsWithNumbers.some((s) => s.isNew);

    // Calculate additional context for existing packages
    let hasPendingReservations = false;
    let completedSessions = 0;
    let cancelledSessions = 0;
    let isComplete = false;

    if (order) {
      const appointmentServices = order.appointmentServices || [];

      // Count completed sessions (attended status)
      completedSessions = appointmentServices.filter(
        (as) => as.appointment?.status === 'attended'
      ).length;

      // Count cancelled sessions
      cancelledSessions = appointmentServices.filter(
        (as) => as.appointment?.status === 'cancelled'
      ).length;

      // Check for pending reservations
      hasPendingReservations = appointmentServices.some(
        (as) => as.appointment?.status === 'reserved'
      );

      // Check if package is complete (all sessions scheduled, excluding cancelled)
      const nonCancelledSessions = appointmentServices.filter(
        (as) => as.appointment?.status !== 'cancelled'
      ).length;
      isComplete = nonCancelledSessions + sessionsWithNumbers.length >= totalSessions;
    }

    // Determinar el precio final: prioridad a precio personalizado, luego order.finalPrice, luego service.basePrice
    let finalPrice: number | undefined;
    if (customPrices && customPrices[packageKey] !== undefined) {
      // Precio personalizado para paquetes nuevos
      finalPrice = customPrices[packageKey];
    } else if (order?.finalPrice) {
      // Precio de order existente
      finalPrice = Number(order.finalPrice);
    } else if (!isExistingPackage) {
      // Precio base del servicio para paquetes nuevos sin precio personalizado
      finalPrice = service.basePrice;
    }

    return {
      id: packageKey,
      type: isExistingPackage ? 'existing' : 'new',
      serviceId: service.id,
      serviceName: service.name,
      orderId: order?.id,
      totalSessions,
      sessions: sessionsWithNumbers,
      hasNewSessions,
      orderCreatedAt: order?.createdAt,
      finalPrice,
      hasPendingReservations,
      completedSessions,
      cancelledSessions,
      isComplete,
    };
  }
}

// ============================================
// MAIN SIMULATOR (Facade Pattern)
// ============================================

export class PackageSimulator {
  private factory = new PackageGroupFactory();

  /**
   * Simulates how sessions will be grouped into packages after save
   * @pattern Facade - Simplified interface for complex subsystem
   */
  simulatePackages(
    sessions: SessionInput[],
    services: ServiceMetadata[],
    orders: OrderMetadata[],
    isEditMode: boolean,
    customPrices?: Record<string, number>
  ): PackageGroup[] {
    // Group sessions by package key
    const packageGroups = this.groupSessionsByPackage(sessions);

    // Convert groups to PackageGroup objects
    const groups = Array.from(packageGroups.entries()).map(([packageKey, groupedSessions]) =>
      this.factory.createPackageGroup(packageKey, groupedSessions, services, orders, isEditMode, customPrices)
    );

    // Sort: existing packages first, then new packages
    return groups.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'existing' ? -1 : 1;
      }
      // Within same type, sort by creation date (for existing) or service name (for new)
      if (a.type === 'existing' && a.orderCreatedAt && b.orderCreatedAt) {
        return new Date(a.orderCreatedAt).getTime() - new Date(b.orderCreatedAt).getTime();
      }
      return a.serviceName.localeCompare(b.serviceName);
    });
  }

  /**
   * Groups sessions by package identifier
   * @private
   */
  private groupSessionsByPackage(
    sessions: SessionInput[]
  ): Map<string, Array<SessionInput & { originalIndex: number }>> {
    const groups = new Map<string, Array<SessionInput & { originalIndex: number }>>();

    sessions.forEach((session, index) => {
      const packageKey = this.getPackageKey(session);

      if (!groups.has(packageKey)) {
        groups.set(packageKey, []);
      }

      groups.get(packageKey)!.push({ ...session, originalIndex: index });
    });

    return groups;
  }

  /**
   * Determines the package key for a session
   * @private
   */
  private getPackageKey(session: SessionInput): string {
    // Existing package: use orderId
    if (session.orderId) {
      return `existing-${session.orderId}`;
    }

    // New package with temp ID: use tempPackageId to distinguish multiple new packages of same service
    if (session.tempPackageId) {
      return session.tempPackageId;
    }

    // Fallback: group by serviceId (should not happen with proper tempPackageId assignment)
    return `new-${session.serviceId}`;
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const packageSimulator = new PackageSimulator();
