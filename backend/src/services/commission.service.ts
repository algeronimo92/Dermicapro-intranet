import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

export interface CommissionSettings {
  commissionType: string | null;
  commissionRate: Decimal | null;
  commissionFixedAmount: Decimal | null;
}

export interface EffectiveCommission {
  commissionType: string;
  commissionRate: number | null;
  commissionFixedAmount: number | null;
}

/**
 * Resuelve la configuración de comisión efectiva de un ServiceInstance:
 * si el ServicePackage vendido define su propio commissionType, ese bloque
 * completo prevalece sobre el del Service (nunca se mezclan campos de
 * ambos niveles, ej. type del padre + rate del hijo).
 */
export function resolveEffectiveCommission(
  service: CommissionSettings,
  servicePackage: CommissionSettings
): EffectiveCommission {
  const settings = servicePackage.commissionType !== null ? servicePackage : service;

  return {
    commissionType: settings.commissionType ?? 'percentage',
    commissionRate: settings.commissionRate !== null ? Number(settings.commissionRate) : null,
    commissionFixedAmount:
      settings.commissionFixedAmount !== null ? Number(settings.commissionFixedAmount) : null,
  };
}

/**
 * Calcula el monto de comisión sobre un monto base, dada una configuración
 * de comisión ya resuelta (ver resolveEffectiveCommission).
 */
export function calculateCommissionAmount(
  baseAmount: number | Decimal,
  commission: EffectiveCommission
): { commissionRate: number; commissionAmount: number } {
  if (commission.commissionType === 'fixed') {
    return {
      commissionRate: 0,
      commissionAmount: commission.commissionFixedAmount ?? 0,
    };
  }

  const commissionRate = commission.commissionRate ?? 0.05;
  return {
    commissionRate,
    commissionAmount: Number(baseAmount) * commissionRate,
  };
}
