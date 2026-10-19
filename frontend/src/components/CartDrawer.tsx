import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext.js';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const { cart, isCartOpen, closeCart, updateQuantity, removeItem, clearCart } = useCart();

  if (!isCartOpen) return null;

  const summary = cart?.summary || {
    itemCount: 0,
    subtotal: 0,
    taxAmount: 0,
    shippingCost: 0,
    grandTotal: 0,
    freeShippingThreshold: 100,
    qualifiesForFreeShipping: false,
  };

  const progressPercentage = Math.min(100, (summary.subtotal / summary.freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, summary.freeShippingThreshold - summary.subtotal);

  return (
    <>
      <div className="drawer-overlay" onClick={closeCart} />
      <div className="drawer-panel">
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag size={22} color="#818cf8" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Your Shopping Cart</h2>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              {summary.itemCount}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {summary.itemCount > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-icon"
                title="Clear all items"
                style={{ color: '#f43f5e' }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={closeCart} className="btn btn-icon">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Free Shipping Progress Bar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
            {summary.qualifiesForFreeShipping ? (
              <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={14} /> You unlocked FREE Shipping!
              </span>
            ) : (
              <span>
                Add <strong style={{ color: '#818cf8' }}>${remainingForFreeShipping.toFixed(2)}</strong> more for <strong>FREE Shipping</strong>
              </span>
            )}
            <span style={{ color: '#94a3b8' }}>{Math.round(progressPercentage)}%</span>
          </div>
          <div style={{ width: '100%', height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                background: summary.qualifiesForFreeShipping ? '#10b981' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!cart || cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', color: '#64748b', padding: '40px 0' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#94a3b8' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem' }}>Browse our catalog to add items to your cart.</p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: 14,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Product Thumbnail */}
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.8)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ShoppingBag size={24} color="#6366f1" />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.3 }}>
                      {item.productName}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {item.productSku}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#818cf8' }}>
                      ${item.totalPrice.toFixed(2)}
                    </span>

                    {/* Quantity Controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(15, 21, 33, 0.9)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: '2px 6px',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.availableStock}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', opacity: item.quantity >= item.availableStock ? 0.3 : 1 }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId)}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}
                      title="Remove item"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Checkout CTA */}
        {cart && cart.items.length > 0 && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(11, 15, 25, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.88rem', color: '#94a3b8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>${summary.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estimated Tax (8%)</span>
                <span>${summary.taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping</span>
                <span>{summary.shippingCost === 0 ? <span style={{ color: '#10b981', fontWeight: 600 }}>FREE</span> : `$${summary.shippingCost.toFixed(2)}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                <span>Grand Total</span>
                <span style={{ color: '#818cf8' }}>${summary.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                closeCart();
                onProceedToCheckout();
              }}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 6 }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.75rem', color: '#64748b' }}>
              <ShieldCheck size={14} color="#10b981" />
              <span>256-Bit Encrypted Secure Checkout</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
