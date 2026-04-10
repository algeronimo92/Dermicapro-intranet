import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePatientAuth } from './PatientAuthContext';
import subscriptionService, {
  Subscription,
  SubscriptionPlan,
  NiubizPaymentSession,
} from '../services/subscription.service';

// ==========================================
// Types
// ==========================================

interface SubscriptionContextType {
  // State
  subscription: Subscription | null;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;

  // Niubiz Payment Session (for payment form)
  paymentSession: NiubizPaymentSession | null;
  selectedPlanId: string | null;

  // Computed
  hasActiveSubscription: boolean;
  currentPlan: SubscriptionPlan | null;
  daysUntilRenewal: number | null;
  sessionsRemaining: number;
  discountPercentage: number;

  // Actions
  refreshSubscription: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  startPayment: (planId: string) => Promise<NiubizPaymentSession>;
  completePayment: (transactionToken: string) => Promise<Subscription>;
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  clearPaymentSession: () => void;
  clearError: () => void;
}

// ==========================================
// Context
// ==========================================

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

// ==========================================
// Provider
// ==========================================

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, patient } = usePatientAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Niubiz payment session state
  const [paymentSession, setPaymentSession] = useState<NiubizPaymentSession | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch plans (public, no auth required)
  const refreshPlans = useCallback(async () => {
    try {
      const fetchedPlans = await subscriptionService.getPlans();
      setPlans(fetchedPlans);
    } catch (err) {
      console.error('Error fetching plans:', err);
      // Don't set error for plans fetch - they're optional
    }
  }, []);

  // Fetch subscription (requires auth)
  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedSubscription = await subscriptionService.getMySubscription();
      setSubscription(fetchedSubscription);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Error al cargar la suscripción');
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Start payment - creates Niubiz session
  const startPayment = useCallback(async (planId: string): Promise<NiubizPaymentSession> => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await subscriptionService.createPaymentSession(planId);
      setPaymentSession(session);
      setSelectedPlanId(planId);

      // Load Niubiz checkout script
      await subscriptionService.loadNiubizScript(session.checkoutJs);

      return session;
    } catch (err: any) {
      console.error('Error starting payment:', err);
      setError(err.response?.data?.error || 'Error al iniciar el pago');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Complete payment - process after Niubiz form
  const completePayment = useCallback(async (transactionToken: string): Promise<Subscription> => {
    if (!selectedPlanId) {
      throw new Error('No hay plan seleccionado');
    }

    setIsLoading(true);
    setError(null);

    try {
      const newSubscription = await subscriptionService.processPayment(
        selectedPlanId,
        transactionToken
      );
      setSubscription(newSubscription);
      setPaymentSession(null);
      setSelectedPlanId(null);
      return newSubscription;
    } catch (err: any) {
      console.error('Error completing payment:', err);
      setError(err.response?.data?.error || 'Error al procesar el pago');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlanId]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = await subscriptionService.cancelSubscription(reason);
      setSubscription(updated);
    } catch (err: any) {
      console.error('Error canceling subscription:', err);
      setError(err.response?.data?.error || 'Error al cancelar la suscripción');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reactivate subscription
  const reactivateSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const updated = await subscriptionService.reactivateSubscription();
      setSubscription(updated);
    } catch (err: any) {
      console.error('Error reactivating subscription:', err);
      setError(err.response?.data?.error || 'Error al reactivar la suscripción');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear payment session
  const clearPaymentSession = useCallback(() => {
    setPaymentSession(null);
    setSelectedPlanId(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch data on auth change
  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  useEffect(() => {
    if (isAuthenticated && patient) {
      refreshSubscription();
    } else {
      setSubscription(null);
    }
  }, [isAuthenticated, patient, refreshSubscription]);

  // Computed values
  const hasActiveSubscription = subscription?.status === 'active';
  const currentPlan = subscription?.plan || null;
  const daysUntilRenewal = subscription?.daysUntilRenewal ?? null;
  const sessionsRemaining = subscription?.sessionsRemaining ?? 0;
  const discountPercentage = currentPlan?.discountPercentage ?? 0;

  const value: SubscriptionContextType = {
    subscription,
    plans,
    isLoading,
    error,
    paymentSession,
    selectedPlanId,
    hasActiveSubscription,
    currentPlan,
    daysUntilRenewal,
    sessionsRemaining,
    discountPercentage,
    refreshSubscription,
    refreshPlans,
    startPayment,
    completePayment,
    cancelSubscription,
    reactivateSubscription,
    clearPaymentSession,
    clearError,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// ==========================================
// Hook
// ==========================================

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export default SubscriptionContext;
