import { Service, Order } from '../types';
import { SessionItem } from '../hooks/useAppointmentForm';

// ============================================
// SESSION MANAGER SERVICE - Strategy Pattern
// ============================================

/**
 * Servicio profesional para gestionar operaciones de sesiones
 * Aplica Strategy Pattern para diferentes estrategias de manejo de sesiones
 */
export class SessionManagerService {
  /**
   * Agrega una nueva sesión al array de sesiones
   * Determina automáticamente si es parte de un paquete existente, simulado o nuevo
   */
  addSession(
    sessions: SessionItem[],
    serviceId: string,
    orderId: string | undefined,
    patientOrders: Order[],
    services: Service[],
    tempPackageCounter: number
  ): { sessions: SessionItem[]; newCounter: number } {
    let sessionNumber: number | undefined = undefined;
    let tempPackageId: string | undefined = undefined;
    let finalOrderId: string | undefined = undefined;

    if (orderId) {
      // Caso 1: Paquete SIMULADO (temporal)
      const isSimulatedPackage = orderId.startsWith('temp-');

      if (isSimulatedPackage) {
        tempPackageId = orderId;
      } else {
        // Caso 2: Paquete EXISTENTE (de BD)
        finalOrderId = orderId;
        const selectedOrder = patientOrders.find(o => o.id === orderId);
        if (selectedOrder) {
          sessionNumber = this.calculateNextSessionNumber(sessions, orderId, selectedOrder);
        }
      }
    } else {
      // Caso 3: Crear NUEVO paquete
      tempPackageId = `temp-${serviceId}-${tempPackageCounter}`;
      tempPackageCounter++;
    }

    const newSession: SessionItem = {
      serviceId,
      orderId: finalOrderId,
      sessionNumber,
      tempPackageId
    };

    return {
      sessions: [...sessions, newSession],
      newCounter: tempPackageCounter
    };
  }

  /**
   * Calcula el siguiente número de sesión disponible para un paquete
   */
  private calculateNextSessionNumber(
    sessions: SessionItem[],
    orderId: string,
    order: Order
  ): number {
    const appointmentServices = order.appointmentServices || [];
    const nonCancelledAppointments = appointmentServices.filter(
      (a: any) => a.appointment?.status !== 'cancelled'
    );
    const occupiedNumbers = new Set(
      nonCancelledAppointments.map((a: any) => a.sessionNumber).filter(Boolean)
    );

    // Incluir sesiones que ya están en el formulario
    const sessionsInForm = sessions.filter(s => s.orderId === orderId);
    sessionsInForm.forEach(s => {
      if (s.sessionNumber) {
        occupiedNumbers.add(s.sessionNumber);
      }
    });

    let sessionNumber = 1;
    while (occupiedNumbers.has(sessionNumber)) {
      sessionNumber++;
    }

    return sessionNumber;
  }

  /**
   * Remueve o marca para eliminación una sesión
   * Strategy: Sesiones existentes se marcan, nuevas se eliminan directamente
   */
  removeSession(sessions: SessionItem[], index: number): SessionItem[] {
    const session = sessions[index];

    // Strategy 1: Sesión EXISTENTE → marcar para eliminar
    if (session.appointmentServiceId) {
      const updated = sessions.map((s, i) =>
        i === index ? { ...s, markedForDeletion: !s.markedForDeletion } : s
      );
      return this.applySessionCompensation(updated);
    }

    // Strategy 2: Sesión NUEVA → eliminar directamente
    const updated = sessions.filter((_, i) => i !== index);
    return this.applySessionCompensation(updated);
  }

  /**
   * Aplica compensación automática entre sesiones marcadas y nuevas
   * REGLA: Mantener sesiones con número más bajo
   */
  private applySessionCompensation(sessions: SessionItem[]): SessionItem[] {
    const packageGroups = this.groupSessionsByPackage(sessions);
    let compensatedSessions = [...sessions];
    const indicesToRemove = new Set<number>();

    packageGroups.forEach((indices) => {
      // Sesiones existentes marcadas (ordenadas por número ascendente)
      const markedForDeletion = indices
        .filter(i => compensatedSessions[i].markedForDeletion && compensatedSessions[i].appointmentServiceId)
        .map(i => ({
          index: i,
          sessionNumber: compensatedSessions[i].sessionNumber || 999
        }))
        .sort((a, b) => a.sessionNumber - b.sessionNumber);

      // Sesiones nuevas (ordenadas por número descendente - eliminar las más altas)
      const newSessions = indices
        .filter(i => !compensatedSessions[i].appointmentServiceId && !compensatedSessions[i].markedForDeletion)
        .map(i => ({
          index: i,
          sessionNumber: compensatedSessions[i].sessionNumber || 999
        }))
        .sort((a, b) => b.sessionNumber - a.sessionNumber);

      // Compensar: cancelar eliminaciones con sesiones nuevas
      const compensationCount = Math.min(markedForDeletion.length, newSessions.length);

      for (let i = 0; i < compensationCount; i++) {
        const deletionIndex = markedForDeletion[i].index;
        const newIndex = newSessions[i].index;

        // Desmarcar sesión existente (mantiene número bajo)
        compensatedSessions[deletionIndex] = {
          ...compensatedSessions[deletionIndex],
          markedForDeletion: false,
        };

        // Marcar sesión nueva para eliminar (elimina número alto)
        indicesToRemove.add(newIndex);
      }
    });

    // Eliminar sesiones nuevas compensadas
    if (indicesToRemove.size > 0) {
      compensatedSessions = compensatedSessions.filter((_, i) => !indicesToRemove.has(i));
    }

    // Renumerar sesiones nuevas para llenar huecos
    return this.renumberNewSessions(compensatedSessions);
  }

  /**
   * Agrupa sesiones por paquete (mismo serviceId + orderId/tempPackageId)
   */
  private groupSessionsByPackage(sessions: SessionItem[]): Map<string, number[]> {
    const packageGroups = new Map<string, number[]>();

    sessions.forEach((session, index) => {
      let packageKey: string;
      if (session.orderId) {
        packageKey = `existing-${session.orderId}`;
      } else if (session.tempPackageId) {
        packageKey = session.tempPackageId;
      } else {
        packageKey = `new-${session.serviceId}`;
      }

      if (!packageGroups.has(packageKey)) {
        packageGroups.set(packageKey, []);
      }
      packageGroups.get(packageKey)!.push(index);
    });

    return packageGroups;
  }

  /**
   * Renumera sesiones nuevas para ser consecutivas (1, 2, 3...)
   */
  private renumberNewSessions(sessions: SessionItem[]): SessionItem[] {
    const packageGroups = this.groupSessionsByPackage(sessions);
    let renumberedSessions = [...sessions];

    packageGroups.forEach((indices) => {
      // Obtener números ocupados por sesiones existentes
      const occupiedNumbers = new Set<number>();
      indices.forEach(i => {
        const session = renumberedSessions[i];
        if (session.appointmentServiceId && !session.markedForDeletion && session.sessionNumber) {
          occupiedNumbers.add(session.sessionNumber);
        }
      });

      // Filtrar solo sesiones nuevas
      const newSessionIndices = indices.filter(
        i => !renumberedSessions[i].appointmentServiceId
      );

      // Renumerar sesiones nuevas
      newSessionIndices.forEach((index) => {
        let nextNumber = 1;
        while (occupiedNumbers.has(nextNumber)) {
          nextNumber++;
        }

        renumberedSessions[index] = {
          ...renumberedSessions[index],
          sessionNumber: nextNumber,
        };

        occupiedNumbers.add(nextNumber);
      });
    });

    return renumberedSessions;
  }

  /**
   * Transforma sesiones a operaciones explícitas para el backend
   */
  transformToOperations(
    sessions: SessionItem[],
    services: Service[]
  ): import('../types').SessionOperations {
    const toDelete: string[] = [];
    const toCreate: Array<{
      orderId?: string;
      serviceId: string;
      sessionNumber: number;
      tempPackageId?: string;
    }> = [];
    const newOrders: Array<{
      serviceId: string;
      totalSessions: number;
      tempPackageId: string;
    }> = [];

    const addedNewOrders = new Set<string>();

    sessions.forEach((session) => {
      // 1. Sesiones existentes marcadas → eliminar
      if (session.appointmentServiceId && session.markedForDeletion) {
        toDelete.push(session.appointmentServiceId);
      }

      // 2. Sesiones nuevas → crear
      if (!session.appointmentServiceId && !session.markedForDeletion) {
        if (session.orderId) {
          // Sesión de paquete existente
          toCreate.push({
            orderId: session.orderId,
            serviceId: session.serviceId,
            sessionNumber: session.sessionNumber || 1,
          });
        } else if (session.tempPackageId) {
          // Sesión de paquete nuevo
          if (!addedNewOrders.has(session.tempPackageId)) {
            const service = services.find((s) => s.id === session.serviceId);
            newOrders.push({
              serviceId: session.serviceId,
              totalSessions: service?.defaultSessions || 1,
              tempPackageId: session.tempPackageId,
            });
            addedNewOrders.add(session.tempPackageId);
          }

          toCreate.push({
            serviceId: session.serviceId,
            sessionNumber: session.sessionNumber || 1,
            tempPackageId: session.tempPackageId,
          });
        }
      }
    });

    return { toDelete, toCreate, newOrders };
  }
}

// Singleton instance
export const sessionManager = new SessionManagerService();
