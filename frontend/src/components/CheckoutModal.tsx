import React, { useState, useEffect } from 'react';
import { X, CreditCard, QrCode, Building2, Truck, CheckCircle, ArrowRight, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useToast } from '../context/ToastContext.js';
import { Address, PaymentMethod } from '../types.js';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  onNavigateToAuth: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNavigateToAuth,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { cart, fetchCart } = useCart();
  const { showToast } = useToast();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    streetAddress: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8912');
  const [upiId, setUpiId] = useState('customer@okaxis');

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // Load customer addresses if logged in
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      api.get('/customers/addresses').then((res) => {
        if (res.data?.success && res.data.data.length > 0) {
          setAddresses(res.data.data);
          const defaultAddr = res.data.data.find((a: Address) => a.isDefaultShipping) || res.data.data[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setIsAddingNewAddress(true);
        }
      });
    }
  }, [isAuthenticated, isOpen]);

  if (!isOpen) return null;

  // If user is not authenticated, prompt login
  if (!isAuthenticated) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldCheck size={32} color="#818cf8" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>Sign In Required</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: 24, lineHeight: 1.5 }}>
            Please sign in or create an account to select your shipping address and complete checkout securely.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateToAuth();
              }}
              className="btn btn-primary"
            >
              <span>Sign In / Register</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Order Placement & Payment Processing
  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      let finalAddressId = selectedAddressId;

      // Create new address if user entered a custom one
      if (isAddingNewAddress || !finalAddressId) {
        if (!newAddress.streetAddress || !newAddress.city || !newAddress.state || !newAddress.postalCode) {
          showToast('Please fill in all required shipping address fields.', 'error');
          setIsProcessing(false);
          return;
        }

        const addrRes = await api.post('/customers/addresses', {
          ...newAddress,
          isDefaultShipping: true,
          isDefaultBilling: true,
        });
        finalAddressId = addrRes.data?.data?.id;
      }

      // 1. Create Order
      const orderRes = await api.post('/orders', {
        shippingAddressId: finalAddressId,
        billingAddressId: finalAddressId,
        paymentMethod,
      });

      const createdOrder = orderRes.data.data;

      // 2. Process Payment via Payment Gateway
      await api.post('/payments/checkout', {
        orderId: createdOrder.id,
        paymentMethod,
        cardDetails: { cardNumber },
        upiId,
      });

      // 3. Trigger Confetti Celebration!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#ec4899'],
      });

      setCompletedOrder(createdOrder);
      await fetchCart();
      showToast('Order confirmed and paid successfully!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Checkout failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const summary = cart?.summary || { grandTotal: 0 };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Express Checkout</h2>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Secure 256-bit encrypted checkout</span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-icon">
            <X size={20} />
          </button>
        </div>

        {/* Success Confirmation View */}
        {completedOrder ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>Payment & Order Successful!</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginBottom: 20 }}>
              Your order <strong style={{ color: '#818cf8' }}>{completedOrder.orderNumber}</strong> has been placed and confirmed.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 18, marginBottom: 24, textAlign: 'left', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>Order Total</span>
                <strong style={{ color: '#f8fafc', fontSize: '1.05rem' }}>${Number(completedOrder.totalAmount).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>Payment Status</span>
                <span className="badge badge-delivered">PAID ({paymentMethod})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Order Status</span>
                <span className="badge badge-confirmed">CONFIRMED</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onSuccess(completedOrder.id);
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            >
              <span>Track in My Orders</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div>
            {/* Step 1: Shipping Address */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label className="input-label" style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>
                  1. Shipping Address
                </label>
                {addresses.length > 0 && (
                  <button
                    onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                    style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isAddingNewAddress ? 'Select Saved Address' : '+ Add New Address'}
                  </button>
                )}
              </div>

              {!isAddingNewAddress && addresses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: selectedAddressId === addr.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${selectedAddressId === addr.id ? '#6366f1' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <input
                        type="radio"
                        name="shippingAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ accentColor: '#6366f1' }}
                      />
                      <div style={{ fontSize: '0.88rem', flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {addr.streetAddress} {addr.apartment && `(${addr.apartment})`}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="input-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder="Street Address (e.g. 742 Evergreen Terrace)"
                      value={newAddress.streetAddress}
                      onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder="City (e.g. Springfield)"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder="State (e.g. IL)"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder="Postal Code (e.g. 62704)"
                      value={newAddress.postalCode}
                      onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      placeholder="Country"
                      value={newAddress.country}
                      onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Payment Method */}
            <div style={{ marginBottom: 24 }}>
              <label className="input-label" style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem', marginBottom: 10, display: 'block' }}>
                2. Select Payment Method
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { id: 'CREDIT_CARD', label: 'Credit Card', icon: CreditCard },
                  { id: 'UPI', label: 'Instant UPI', icon: QrCode },
                  { id: 'CASH_ON_DELIVERY', label: 'Cash on Delivery', icon: Truck },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        padding: '12px 8px',
                        borderRadius: 12,
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? '#6366f1' : 'var(--border-subtle)'}`,
                        color: isSelected ? '#818cf8' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Icon size={20} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Input based on method */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div style={{ background: 'rgba(15, 21, 33, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.85rem' }}>
                    <CreditCard size={16} />
                    <span>Card: <strong>{cardNumber}</strong></span>
                  </div>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div style={{ background: 'rgba(15, 21, 33, 0.8)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.85rem' }}>
                    <QrCode size={16} color="#10b981" />
                    <span>UPI ID: <strong>{upiId}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Processing Secure Payment...</span>
                </>
              ) : (
                <>
                  <span>Pay & Place Order • ${summary.grandTotal.toFixed(2)}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
