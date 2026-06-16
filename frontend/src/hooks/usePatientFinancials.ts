import { useState, useEffect, useCallback } from 'react';
import { paymentOrdersService, PatientFinancialSummary } from '../services/paymentOrders.service';

interface UsePatientFinancialsResult extends PatientFinancialSummary {
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: PatientFinancialSummary = {
  totalBilled: 0,
  totalPaid: 0,
  totalBalance: 0,
  totalPending: 0,
  accountBalance: 0,
  pendingCount: 0,
  partialCount: 0,
  paidCount: 0,
  totalPaymentOrders: 0,
  pendingPaymentOrders: [],
  ordersWithoutPaymentOrder: [],
};

export function usePatientFinancials(patientId: string): UsePatientFinancialsResult {
  const [data, setData] = useState<PatientFinancialSummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    paymentOrdersService
      .getPatientSummary(patientId)
      .then((summary) => {
        if (!cancelled) {
          setData(summary);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Error al cargar información financiera');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { ...data, loading, error, refresh };
}
