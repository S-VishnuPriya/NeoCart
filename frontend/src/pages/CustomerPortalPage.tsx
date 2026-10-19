import React, { useState, useEffect } from 'react';
import { User, MapPin, Package, Clock, ShieldCheck, X, AlertTriangle, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Address, Order, OrderStatus } from '../types.js';

export const CustomerPortalPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Profile Edit State
  const [firstName, setFirstName] = useState(user?.customer?.firstName || '');
  const [lastName, setLastName] = useState(user?.customer?.lastName || '');
  const [phone, setPhone] = useState(user?.customer?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // New Address State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    streetAddress: '',
    apartment: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    isDefaultShipping: false,
    isDefaultBilling: false,
  });

  // Cancellation Modal State
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Changed mind / found alternate item');
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch Orders & Addresses
  const loadData = async () => {
    try {
      const [ordersRes, addrRes] = await Promise.all([
        api.get('/orders'),
        api.get('/customers/addresses'),
      ]);
      if (ordersRes.data?.success) setOrders(ordersRes.data.data.orders);
      if (addrRes.data?.success) setAddresses(addrRes.data.data);
    } catch (err) {
      console.error('Failed to load customer portal data', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/customers/profile', { firstName, lastName, phone });
      if (res.data?.success) {
        showToast('Profile updated successfully!', 'success');
        await refreshProfile();
      }
    } catch (err: any) {
      showToast('Failed to update profile.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/customers/addresses', newAddress);
      if (res.data?.success) {
        showToast('Address added to your address book.', 'success');
        setShowAddAddress(false);
        setNewAddress({ streetAddress: '', apartment: '', city: '', state: '', postalCode: '', country: 'US', isDefaultShipping: false, isDefaultBilling: false });
        loadData();
      }
    } catch (err: any) {
      showToast('Failed to add address.', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await api.delete(`/customers/addresses/${id}`);
      showToast('Address deleted.', 'info');
      loadData();
    } catch {
      showToast('Failed to delete address.', 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModalOrderId) return;
    setIsCancelling(true);
    try {
      const res = await api.post(`/orders/${cancelModalOrderId}/cancel`, {
        reason: cancelReason,
      });
      if (res.data?.success) {
        showToast('Order has been cancelled and stock returned.', 'success');
        setCancelModalOrderId(null);
        setSelectedOrder(null);
        loadData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel order.';
      showToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return <span className="badge badge-pending">PENDING</span>;
      case 'CONFIRMED': return <span className="badge badge-confirmed">CONFIRMED</span>;
      case 'PROCESSING': return <span className="badge badge-processing">PROCESSING</span>;
      case 'SHIPPED': return <span className="badge badge-shipped">SHIPPED</span>;
      case 'DELIVERED': return <span className="badge badge-delivered">DELIVERED</span>;
      case 'CANCELLED': return <span className="badge badge-cancelled">CANCELLED</span>;
    }
  };

  const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

  return (
    <div>
      {/* Header Profile Summary Card */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#fff',
              }}
            >
              {user?.customer?.firstName?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
                  {user?.customer?.firstName} {user?.customer?.lastName}
                </h1>
                <span className="badge badge-role">{user?.role}</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{user?.email}</p>
            </div>
          </div>

          {/* Sub-Nav Tabs */}
          <div style={{ display: 'flex', gap: 8, background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveTab('orders')}
              className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 8 }}
            >
              <Package size={15} />
              <span>Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`btn btn-sm ${activeTab === 'addresses' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 8 }}
            >
              <MapPin size={15} />
              <span>Addresses ({addresses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 8 }}
            >
              <User size={15} />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Orders View */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Package size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>No orders placed yet</h3>
              <p style={{ fontSize: '0.9rem' }}>Browse the store and place your first order!</p>
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="glass-card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                        {ord.orderNumber}
                      </span>
                      {getStatusBadge(ord.status)}
                      <span className={`badge ${ord.paymentStatus === 'PAID' ? 'badge-delivered' : 'badge-pending'}`}>
                        {ord.paymentStatus}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Placed on {new Date(ord.placedAt).toLocaleDateString()} at {new Date(ord.placedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Total</span>
                      <strong style={{ fontSize: '1.2rem', color: '#818cf8' }}>${Number(ord.totalAmount).toFixed(2)}</strong>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="btn btn-secondary btn-sm"
                    >
                      View Details & Tracking
                    </button>
                  </div>
                </div>

                {/* Items Summary Row */}
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  {ord.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>{item.productName}</span>
                      <span style={{ color: '#818cf8', fontWeight: 700 }}>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Addresses View */}
      {activeTab === 'addresses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Your Saved Addresses</h3>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="btn btn-primary btn-sm"
            >
              {showAddAddress ? 'Cancel' : '+ Add New Address'}
            </button>
          </div>

          {showAddAddress && (
            <form onSubmit={handleCreateAddress} className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>New Address Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="742 Evergreen Terrace"
                    value={newAddress.streetAddress}
                    onChange={(e) => setNewAddress({ ...newAddress, streetAddress: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Apartment / Suite</label>
                  <input
                    type="text"
                    placeholder="Apt 4B"
                    value={newAddress.apartment}
                    onChange={(e) => setNewAddress({ ...newAddress, apartment: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Springfield"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">State</label>
                  <input
                    type="text"
                    required
                    placeholder="IL"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Postal Code</label>
                  <input
                    type="text"
                    required
                    placeholder="62704"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Address
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {addresses.map((addr) => (
              <div key={addr.id} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {addr.isDefaultShipping && <span className="badge badge-confirmed">Default Shipping</span>}
                    {addr.isDefaultBilling && <span className="badge badge-role">Default Billing</span>}
                  </div>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="btn btn-icon"
                    style={{ color: '#f43f5e' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>
                  {addr.streetAddress} {addr.apartment && `(${addr.apartment})`}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
                  {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Edit Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="glass-card" style={{ maxWidth: 540, padding: 28 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Personal Information</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
          >
            {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      )}

      {/* Order Tracking & Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, padding: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{selectedOrder.orderNumber}</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tracking & Fulfillment Lifecycle</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-icon">
                <X size={20} />
              </button>
            </div>

            {/* FSM Status Progression Bar */}
            {selectedOrder.status !== 'CANCELLED' ? (
              <div style={{ marginBottom: 24, background: 'rgba(255, 255, 255, 0.02)', padding: 18, borderRadius: 14, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: 12 }}>
                  {orderStatuses.map((st, idx) => {
                    const currentIdx = orderStatuses.indexOf(selectedOrder.status);
                    const isPassed = idx <= currentIdx;
                    return (
                      <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 2 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            background: isPassed ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {isPassed ? <CheckCircle size={16} /> : idx + 1}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isPassed ? '#f8fafc' : '#64748b' }}>
                          {st}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: 14, background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 12, marginBottom: 20, color: '#f43f5e', fontSize: '0.88rem' }}>
                <strong>Order Cancelled.</strong> Reason: {selectedOrder.cancellationReason || 'Requested by customer'}
              </div>
            )}

            {/* Items List */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10, color: '#f8fafc' }}>Purchased Items</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedOrder.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 10, fontSize: '0.88rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#f8fafc' }}>{item.productName}</span>
                      <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: 8 }}>SKU: {item.productSku}</span>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>{item.quantity} x ${Number(item.unitPrice).toFixed(2)}</span>
                      <strong style={{ color: '#818cf8', marginLeft: 12 }}>${Number(item.totalPrice).toFixed(2)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Summary */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginBottom: 24, fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Subtotal</span>
                <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Tax (8%)</span>
                <span>${Number(selectedOrder.taxAmount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Shipping</span>
                <span>${Number(selectedOrder.shippingCost).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                <span>Total Amount</span>
                <span style={{ color: '#818cf8' }}>${Number(selectedOrder.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Cancel Action (Only for PENDING, CONFIRMED, PROCESSING) */}
            {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(selectedOrder.status) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCancelModalOrderId(selectedOrder.id)}
                  className="btn btn-outline-danger btn-sm"
                >
                  Cancel Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalOrderId && (
        <div className="modal-overlay" onClick={() => setCancelModalOrderId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f43f5e', marginBottom: 12 }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Confirm Order Cancellation</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 16 }}>
              Are you sure you want to cancel this order? Reserved inventory will be returned to stock automatically.
            </p>

            <div className="input-group">
              <label className="input-label">Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="select-field"
              >
                <option value="Changed mind / found alternate item">Changed mind / found alternate item</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Shipping time too long">Shipping time too long</option>
                <option value="Other reason">Other reason</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                onClick={() => setCancelModalOrderId(null)}
                className="btn btn-secondary btn-sm"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="btn btn-outline-danger btn-sm"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
