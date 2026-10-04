import { useState, useRef, useCallback, useEffect } from 'react';
import { CustomerInfo } from '../types';
import {
  getPaymentConfig,
  loadRazorpayScript,
  loadPayPalScript,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPayPalOrder,
  capturePayPalOrder,
  cancelOrderPayment,
  pollOrderStatus,
  PaymentConfig,
} from '../services/paymentService';

export type PaymentStep =
  | 'idle'
  | 'preparing'
  | 'connecting_razorpay'
  | 'connecting_paypal'
  | 'verifying'
  | 'confirming'
  | 'success'
  | 'failed';

export interface UsePaymentProps {
  onSuccess: (orderId: string, orderNumber: string, guestAccessToken?: string) => void;
  onError: (message: string) => void;
  onCartChanged?: () => void;
}

export const usePayment = ({ onSuccess, onError, onCartChanged }: UsePaymentProps) => {
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('idle');
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-flight guard ref to prevent rapid double-clicks
  const isSubmittingRef = useRef(false);

  // Stable idempotency key per checkout session
  const idempotencyKeyRef = useRef<string>(`idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  // Active internal order ID for cancellation / polling
  const activeOrderIdRef = useRef<string | null>(null);

  // Load config on mount
  useEffect(() => {
    getPaymentConfig().then((cfg) => setConfig(cfg));
  }, []);

  /**
   * Resets the idempotency key when user alters address, cart, or restarts checkout
   */
  const regenerateIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current = `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  /**
   * Razorpay Checkout Flow (UPI, Cards, Netbanking, Wallets)
   */
  const startRazorpayCheckout = useCallback(
    async (params: {
      customer: CustomerInfo;
      items?: any[];
      couponCode?: string | null;
      deliveryMethod: string;
      preselectedMethod?: 'upi' | 'card' | 'netbanking' | 'wallets';
    }) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setErrorMessage(null);
      setPaymentStep('preparing');

      try {
        // 1. Lazy load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Could not connect to Razorpay payment gateway. Check your internet connection.');
        }

        setPaymentStep('connecting_razorpay');

        // 2. Create server-side Razorpay order
        const rzpOrder = await createRazorpayOrder({
          shippingAddress: params.customer,
          items: params.items,
          couponCode: params.couponCode,
          idempotencyKey: idempotencyKeyRef.current,
          deliveryMethod: params.deliveryMethod,
        });

        activeOrderIdRef.current = rzpOrder.orderId;

        // 3. Configure Razorpay modal
        const options: any = {
          key: rzpOrder.keyId || config?.razorpayKeyId,
          amount: Math.round(rzpOrder.amount * 100),
          currency: rzpOrder.currency || 'INR',
          name: 'NYx DRIPstore',
          description: `Order ${rzpOrder.orderNumber}`,
          order_id: rzpOrder.razorpayOrderId,
          prefill: {
            name: `${params.customer.firstName} ${params.customer.lastName}`.trim(),
            email: params.customer.email,
            contact: params.customer.phone,
          },
          theme: {
            color: '#8B5CF6',
            backdrop_color: '#0A0A0D',
          },
          modal: {
            ondismiss: async () => {
              isSubmittingRef.current = false;
              setPaymentStep('idle');
              if (activeOrderIdRef.current) {
                await cancelOrderPayment(activeOrderIdRef.current);
              }
            },
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setPaymentStep('verifying');

            try {
              const verifyResult = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyResult.success) {
                setPaymentStep('success');
                isSubmittingRef.current = false;
                onSuccess(verifyResult.orderId, verifyResult.orderNumber, verifyResult.guestAccessToken || rzpOrder.guestAccessToken);
              }
            } catch (err: unknown) {
              console.warn('Verification request error, checking polling fallback...', err);
              // Poll up to 30 seconds in case webhook finalized the order
              if (activeOrderIdRef.current) {
                const polledStatus = await pollOrderStatus(activeOrderIdRef.current, 15000);
                if (polledStatus === 'paid') {
                  setPaymentStep('success');
                  isSubmittingRef.current = false;
                  onSuccess(activeOrderIdRef.current, rzpOrder.orderNumber, rzpOrder.guestAccessToken);
                  return;
                }
              }

              isSubmittingRef.current = false;
              setPaymentStep('failed');
              const msg = err instanceof Error ? err.message : 'Payment verification failed.';
              setErrorMessage(msg);
              onError(msg);
            }
          },
        };

        // Pre-highlight specific payment instruments where supported
        if (params.preselectedMethod === 'upi') {
          options.config = { display: { blocks: { utib: { name: 'Pay via UPI', instruments: [{ method: 'upi' }] } } } };
        } else if (params.preselectedMethod === 'card') {
          options.config = { display: { blocks: { utib: { name: 'Pay with Card', instruments: [{ method: 'card' }] } } } };
        } else if (params.preselectedMethod === 'netbanking') {
          options.config = { display: { blocks: { utib: { name: 'Net Banking', instruments: [{ method: 'netbanking' }] } } } };
        } else if (params.preselectedMethod === 'wallets') {
          options.config = { display: { blocks: { utib: { name: 'Wallets', instruments: [{ method: 'wallet' }] } } } };
        }

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failResp: any) => {
          console.warn('Razorpay payment.failed event:', failResp.error);
          isSubmittingRef.current = false;
          setPaymentStep('failed');
          const description = failResp.error?.description || 'Transaction declined by bank or card issuer.';
          setErrorMessage(description);
          onError(description);
        });

        rzp.open();
      } catch (err: unknown) {
        isSubmittingRef.current = false;
        setPaymentStep('failed');
        const msg = err instanceof Error ? err.message : 'Unable to initialize checkout.';
        setErrorMessage(msg);
        onError(msg);

        if (msg.includes('CART_CHANGED') || msg.includes('OUT_OF_STOCK')) {
          onCartChanged?.();
        }
      }
    },
    [config, onSuccess, onError, onCartChanged]
  );

  /**
   * Initializes PayPal Buttons inside a DOM container
   */
  const renderPayPalButtons = useCallback(
    async (
      containerElement: HTMLElement,
      params: {
        customer: CustomerInfo;
        items?: any[];
        couponCode?: string | null;
        deliveryMethod: string;
      }
    ) => {
      const activeConfig = config || (await getPaymentConfig());
      const loaded = await loadPayPalScript(activeConfig.paypalClientId, activeConfig.paypalCurrency);

      if (!loaded || !(window as any).paypal?.Buttons) {
        console.warn('PayPal Buttons SDK not available');
        return;
      }

      containerElement.innerHTML = '';
      let activeGuestToken: string | undefined = undefined;

      (window as any).paypal
        .Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay',
            height: 44,
          },
          createOrder: async () => {
            setPaymentStep('connecting_paypal');
            isSubmittingRef.current = true;

            try {
              const res = await createPayPalOrder({
                shippingAddress: params.customer,
                items: params.items,
                couponCode: params.couponCode,
                idempotencyKey: idempotencyKeyRef.current,
                deliveryMethod: params.deliveryMethod,
              });

              activeOrderIdRef.current = res.orderId;
              activeGuestToken = res.guestAccessToken;
              return res.paypalOrderId;
            } catch (err: unknown) {
              isSubmittingRef.current = false;
              setPaymentStep('failed');
              const msg = err instanceof Error ? err.message : 'Failed to create PayPal order.';
              setErrorMessage(msg);
              onError(msg);
              throw err;
            }
          },
          onApprove: async (data: { orderID: string }) => {
            setPaymentStep('verifying');

            try {
              const captureRes = await capturePayPalOrder({
                paypalOrderId: data.orderID,
              });

              if (captureRes.success) {
                setPaymentStep('success');
                isSubmittingRef.current = false;
                onSuccess(captureRes.orderId, captureRes.orderNumber, captureRes.guestAccessToken || activeGuestToken);
              }
            } catch (err: unknown) {
              console.warn('PayPal capture error, checking polling fallback...', err);
              if (activeOrderIdRef.current) {
                const polled = await pollOrderStatus(activeOrderIdRef.current, 15000);
                if (polled === 'paid') {
                  setPaymentStep('success');
                  isSubmittingRef.current = false;
                  onSuccess(activeOrderIdRef.current, 'CONFIRMED', activeGuestToken);
                  return;
                }
              }

              isSubmittingRef.current = false;
              setPaymentStep('failed');
              const msg = err instanceof Error ? err.message : 'PayPal capture failed.';
              setErrorMessage(msg);
              onError(msg);
            }
          },
          onCancel: async () => {
            isSubmittingRef.current = false;
            setPaymentStep('idle');
            if (activeOrderIdRef.current) {
              await cancelOrderPayment(activeOrderIdRef.current);
            }
          },
          onError: (err: any) => {
            console.error('PayPal Buttons internal error:', err);
            isSubmittingRef.current = false;
            setPaymentStep('failed');
            onError('PayPal was unable to authorize the transaction.');
          },
        })
        .render(containerElement);
    },
    [config, onSuccess, onError]
  );

  return {
    paymentStep,
    isProcessing: paymentStep !== 'idle' && paymentStep !== 'failed' && paymentStep !== 'success',
    errorMessage,
    startRazorpayCheckout,
    renderPayPalButtons,
    regenerateIdempotencyKey,
  };
};
