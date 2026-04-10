import React, { useEffect, useRef, useState } from 'react';
import { NiubizPaymentSession } from '../../services/subscription.service';
import './NiubizPaymentForm.css';

// Niubiz global types
declare global {
  interface Window {
    VisanetCheckout?: {
      configure: (config: NiubizCheckoutConfig) => void;
      open: () => void;
      close: () => void;
    };
    payform?: {
      setConfiguration: (config: NiubizPayformConfig) => void;
      createToken: (
        container: HTMLElement[],
        callback: (response: NiubizTokenResponse) => void
      ) => void;
    };
  }
}

interface NiubizCheckoutConfig {
  sessiontoken: string;
  channel: string;
  merchantid: string;
  purchasenumber: string;
  amount: string;
  expirationminutes: number;
  timeouturl: string;
  merchantlogo?: string;
  formbuttoncolor?: string;
  action?: string;
  complete: (params: NiubizCompleteParams) => void;
}

interface NiubizPayformConfig {
  callbackurl: string;
  sessionkey: string;
  channel: string;
  merchantid: string;
  purchasenumber: string;
  amount: string;
}

interface NiubizCompleteParams {
  transactionToken?: string;
  action?: string;
}

interface NiubizTokenResponse {
  transactionToken?: string;
  bin?: string;
  action?: string;
}

interface NiubizPaymentFormProps {
  session: NiubizPaymentSession;
  onSuccess: (transactionToken: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const NiubizPaymentForm: React.FC<NiubizPaymentFormProps> = ({
  session,
  onSuccess,
  onCancel,
  onError,
}) => {
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (window.VisanetCheckout || window.payform) {
      setIsScriptLoaded(true);
      return;
    }

    // Wait for script to load (it should be loaded by the context)
    const checkScript = setInterval(() => {
      if (window.VisanetCheckout || window.payform) {
        setIsScriptLoaded(true);
        clearInterval(checkScript);
      }
    }, 100);

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkScript);
      if (!window.VisanetCheckout && !window.payform) {
        onError('No se pudo cargar el formulario de pago');
      }
    }, 10000);

    return () => {
      clearInterval(checkScript);
      clearTimeout(timeout);
    };
  }, [onError]);

  useEffect(() => {
    if (!isScriptLoaded) return;

    // Configure Niubiz Checkout
    if (window.VisanetCheckout) {
      try {
        window.VisanetCheckout.configure({
          sessiontoken: session.sessionKey,
          channel: 'web',
          merchantid: session.merchantId,
          purchasenumber: session.purchaseNumber,
          amount: session.amount,
          expirationminutes: 20,
          timeouturl: window.location.origin + '/patient/subscription?timeout=true',
          formbuttoncolor: '#4caf50',
          complete: (params: NiubizCompleteParams) => {
            if (params.transactionToken) {
              setIsProcessing(true);
              onSuccess(params.transactionToken);
            } else if (params.action === 'cancel') {
              onCancel();
            }
          },
        });

        // Open the checkout modal
        window.VisanetCheckout.open();
      } catch (err) {
        console.error('Error configuring Niubiz checkout:', err);
        onError('Error al configurar el formulario de pago');
      }
    } else if (window.payform && formContainerRef.current) {
      // Alternative: Use payform for embedded form
      try {
        window.payform.setConfiguration({
          callbackurl: session.callbackUrl,
          sessionkey: session.sessionKey,
          channel: 'web',
          merchantid: session.merchantId,
          purchasenumber: session.purchaseNumber,
          amount: session.amount,
        });
      } catch (err) {
        console.error('Error configuring Niubiz payform:', err);
        onError('Error al configurar el formulario de pago');
      }
    }

    return () => {
      // Cleanup: close modal if open
      if (window.VisanetCheckout) {
        try {
          window.VisanetCheckout.close();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, [isScriptLoaded, session, onSuccess, onCancel, onError]);

  if (isProcessing) {
    return (
      <div className="niubiz-payment-form niubiz-payment-form--processing">
        <div className="niubiz-payment-form__spinner"></div>
        <p>Procesando pago...</p>
      </div>
    );
  }

  return (
    <div className="niubiz-payment-form">
      <div className="niubiz-payment-form__header">
        <h3>Pago Seguro con Niubiz</h3>
        <p>Ingresa los datos de tu tarjeta</p>
      </div>

      {!isScriptLoaded ? (
        <div className="niubiz-payment-form__loading">
          <div className="niubiz-payment-form__spinner"></div>
          <p>Cargando formulario de pago...</p>
        </div>
      ) : (
        <div ref={formContainerRef} className="niubiz-payment-form__container">
          {/* Niubiz will inject the form here or open a modal */}
          <div id="niubiz-form-container"></div>
        </div>
      )}

      <div className="niubiz-payment-form__footer">
        <button
          type="button"
          className="niubiz-payment-form__cancel-btn"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <div className="niubiz-payment-form__security">
          <img
            src="https://static-content.vnforapps.com/v2/images/visa.svg"
            alt="Visa"
            className="niubiz-payment-form__card-logo"
          />
          <img
            src="https://static-content.vnforapps.com/v2/images/mc.svg"
            alt="Mastercard"
            className="niubiz-payment-form__card-logo"
          />
          <img
            src="https://static-content.vnforapps.com/v2/images/amex.svg"
            alt="American Express"
            className="niubiz-payment-form__card-logo"
          />
          <span>Pago 100% seguro</span>
        </div>
      </div>
    </div>
  );
};

export default NiubizPaymentForm;
