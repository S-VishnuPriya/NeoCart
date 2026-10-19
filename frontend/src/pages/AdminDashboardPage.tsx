import React, { useState, useEffect } from 'react';
import {
  Shield,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  Box,
  Edit2,
  Trash2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { AdminKPIs, Product, Order, Role, OrderStatus, Category } from '../types.js';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'inventory' | 'orders' | 'reports' | 'users' | 'audit'>('overview');
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    sku: '',
    stock: 20,
    lowStockThreshold: 5,
    imageUrl: '',
    categoryId: '',
  });

  // Inventory State
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [stockChangeAmount, setStockChangeAmount] = useState<number>(10);
  const [stockAdjustReason, setStockAdjustReason] = useState('RESTOCK');
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);

  // Reports State
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<any>(null);

  // Users State
  const [usersList, setUsersList] = useState<any[]>([]);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Load KPI & Master Data
  const loadOverview = async () => {
    try {
      const [overviewRes, prodRes, catRes, ordRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/products?limit=50'),
        api.get('/products/categories'),
        api.get('/orders?limit=50'),
      ]);
      if (overviewRes.data?.success) setKpis(overviewRes.data.data.kpis);
      if (prodRes.data?.success) setProducts(prodRes.data.data.products);
      if (catRes.data?.success) {
        setCategories(catRes.data.data);
        if (catRes.data.data.length > 0) {
          setNewProduct((prev) => ({ ...prev, categoryId: catRes.data.data[0].id }));
        }
      }
      if (ordRes.data?.success) setOrders(ordRes.data.data.orders);
    } catch (err) {
      console.error('Failed to load admin overview', err);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Load Sub-Tab Specific Data
  useEffect(() => {
    if (activeTab === 'reports') {
      Promise.all([
        api.get('/reports/sales-summary'),
        api.get('/reports/orders-by-status'),
        api.get('/reports/customer-metrics'),
      ]).then(([sRes, oRes, cRes]) => {
        if (sRes.data?.success) setSalesSummary(sRes.data.data);
        if (oRes.data?.success) setOrdersByStatus(oRes.data.data);
        if (cRes.data?.success) setCustomerMetrics(cRes.data.data);
      });
    }

    if (activeTab === 'users' && user?.role === 'ADMIN') {
      api.get('/admin/users').then((res) => {
        if (res.data?.success) setUsersList(res.data.data);
      });
    }

    if (activeTab === 'audit' && user?.role === 'ADMIN') {
      api.get('/admin/audit-logs').then((res) => {
        if (res.data?.success) setAuditLogs(res.data.data);
      });
    }
  }, [activeTab, user?.role]);

  // Product Creation
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/products', {
        ...newProduct,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        lowStockThreshold: Number(newProduct.lowStockThreshold),
      });
      if (res.data?.success) {
        showToast('Product created successfully!', 'success');
        setShowAddProduct(false);
        loadOverview();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to create product.';
      showToast(msg, 'error');
    }
  };

  // Stock Adjustment
  const handleAdjustStock = async () => {
    if (!stockAdjustProduct) return;
    try {
      const res = await api.patch(`/inventory/${stockAdjustProduct.id}/adjust`, {
        changeAmount: stockChangeAmount,
        reason: stockAdjustReason,
      });
      if (res.data?.success) {
        showToast('Stock level adjusted successfully.', 'success');
        setStockAdjustProduct(null);
        loadOverview();
      }
    } catch (err: any) {
      showToast('Failed to adjust stock.', 'error');
    }
  };

  // Advance Order Status
  const handleAdvanceOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      const res = await api.patch(`/orders/${orderId}/status`, {
        status: nextStatus,
        notes: `Advanced to ${nextStatus} by staff member ${user?.email}`,
      });
      if (res.data?.success) {
        showToast(`Order status advanced to ${nextStatus}!`, 'success');
        loadOverview();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Illegal status transition.';
      showToast(msg, 'error');
    }
  };

  // Role Promotion / Demotion
  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      if (res.data?.success) {
        showToast(`User role updated to ${newRole}`, 'success');
        setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Cannot change role.';
      showToast(msg, 'error');
    }
  };

  // CSV Report Export Download
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reports/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `neocart_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Sales report exported to CSV.', 'success');
    } catch {
      showToast('Failed to export CSV report.', 'error');
    }
  };

  return (
    <div>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          padding: '24px 28px',
          marginBottom: 28,
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              Admin & Operations Control Center
            </h1>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Role: <strong style={{ color: '#c084fc' }}>{user?.role}</strong> • Signed in as {user?.email}
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 12, border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'products', label: 'Products' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'orders', label: 'Fulfillment' },
            { id: 'reports', label: 'Analytics' },
            ...(user?.role === 'ADMIN' ? [{ id: 'users', label: 'RBAC Users' }, { id: 'audit', label: 'Audit Logs' }] : []),
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: 8,
                background: activeTab === t.id ? 'linear-gradient(135deg, #a855f7, #6366f1)' : 'transparent',
                borderColor: 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards (Visible across tabs) */}
      {kpis && (
        <div className="kpi-grid" style={{ marginBottom: 28 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL REVENUE</span>
              <DollarSign size={20} color="#10b981" />
            </div>
            <strong style={{ fontSize: '1.6rem', color: '#f8fafc', fontWeight: 800 }}>
              ${kpis.totalRevenue.toFixed(2)}
            </strong>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL ORDERS</span>
              <Package size={20} color="#6366f1" />
            </div>
            <strong style={{ fontSize: '1.6rem', color: '#f8fafc', fontWeight: 800 }}>
              {kpis.totalOrders}
            </strong>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>PENDING FULFILLMENT</span>
              <Clock size={20} color="#f59e0b" />
            </div>
            <strong style={{ fontSize: '1.6rem', color: '#f8fafc', fontWeight: 800 }}>
              {kpis.pendingOrders}
            </strong>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>LOW STOCK ALERTS</span>
              <AlertTriangle size={20} color="#f43f5e" />
            </div>
            <strong style={{ fontSize: '1.6rem', color: kpis.lowStockAlerts > 0 ? '#f43f5e' : '#f8fafc', fontWeight: 800 }}>
              {kpis.lowStockAlerts}
            </strong>
          </div>
        </div>
      )}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Recent Orders Overview */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>Recent Orders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orders.slice(0, 5).map((ord) => (
                <div key={ord.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>{ord.orderNumber}</span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: 8 }}>
                      {ord.customer ? `${ord.customer.firstName} ${ord.customer.lastName}` : 'Customer'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="badge badge-role">{ord.status}</span>
                    <strong style={{ color: '#818cf8' }}>${Number(ord.totalAmount).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions & Low Stock Banners */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>Inventory Alerts & Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {products.filter((p) => p.isLowStock).length === 0 ? (
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 8, padding: 14, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 10 }}>
                  <CheckCircle size={18} />
                  <span>All product inventory levels are healthy!</span>
                </div>
              ) : (
                products.filter((p) => p.isLowStock).map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 10 }}>
                    <div>
                      <strong style={{ color: '#f8fafc' }}>{p.name}</strong>
                      <span style={{ color: '#f59e0b', fontSize: '0.8rem', display: 'block' }}>Only {p.stock} units remaining</span>
                    </div>
                    <button onClick={() => { setStockAdjustProduct(p); setActiveTab('inventory'); }} className="btn btn-primary btn-sm">
                      Restock
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Products Manager */}
      {activeTab === 'products' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Product Catalog Management</h3>
            <button onClick={() => setShowAddProduct(!showAddProduct)} className="btn btn-primary btn-sm">
              {showAddProduct ? 'Cancel' : '+ Add New Product'}
            </button>
          </div>

          {/* Add Product Modal/Form */}
          {showAddProduct && (
            <form onSubmit={handleCreateProduct} style={{ background: 'rgba(15, 23, 42, 0.9)', padding: 20, borderRadius: 14, marginBottom: 24, border: '1px solid var(--border-glass)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Create New Product</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Product Name</label>
                  <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="input-field" placeholder="e.g. Studio Condenser Mic" />
                </div>
                <div className="input-group">
                  <label className="input-label">SKU</label>
                  <input type="text" required value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} className="input-field" placeholder="e.g. MIC-STU-001" />
                </div>
                <div className="input-group">
                  <label className="input-label">Price ($)</label>
                  <input type="number" step="0.01" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })} className="input-field" />
                </div>
                <div className="input-group">
                  <label className="input-label">Initial Stock</label>
                  <input type="number" required value={newProduct.stock} onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) })} className="input-field" />
                </div>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select value={newProduct.categoryId} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })} className="select-field">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Image URL</label>
                  <input type="url" value={newProduct.imageUrl} onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })} className="input-field" placeholder="https://..." />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label className="input-label">Description</label>
                  <textarea rows={2} required value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} className="textarea-field" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="submit" className="btn btn-primary btn-sm">Save Product</button>
              </div>
            </form>
          )}

          {/* Product Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 14px' }}>PRODUCT</th>
                  <th style={{ padding: '12px 14px' }}>SKU</th>
                  <th style={{ padding: '12px 14px' }}>PRICE</th>
                  <th style={{ padding: '12px 14px' }}>STOCK</th>
                  <th style={{ padding: '12px 14px' }}>CATEGORY</th>
                  <th style={{ padding: '12px 14px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px', fontWeight: 600, color: '#f8fafc' }}>{p.name}</td>
                    <td style={{ padding: '14px', color: '#64748b' }}>{p.sku}</td>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#818cf8' }}>${p.price.toFixed(2)}</td>
                    <td style={{ padding: '14px' }}>
                      <span className={`badge ${p.stock <= 0 ? 'badge-cancelled' : p.isLowStock ? 'badge-pending' : 'badge-delivered'}`}>
                        {p.stock} units
                      </span>
                    </td>
                    <td style={{ padding: '14px' }}>{p.category?.name || 'Accessories'}</td>
                    <td style={{ padding: '14px' }}>
                      <span className="badge badge-delivered">ACTIVE</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Inventory Monitor */}
      {activeTab === 'inventory' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Inventory & Stock Adjustment Monitor</h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 14px' }}>PRODUCT</th>
                  <th style={{ padding: '12px 14px' }}>SKU</th>
                  <th style={{ padding: '12px 14px' }}>CURRENT STOCK</th>
                  <th style={{ padding: '12px 14px' }}>ALERT STATUS</th>
                  <th style={{ padding: '12px 14px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px', fontWeight: 600, color: '#f8fafc' }}>{p.name}</td>
                    <td style={{ padding: '14px', color: '#64748b' }}>{p.sku}</td>
                    <td style={{ padding: '14px', fontWeight: 700 }}>{p.stock} units</td>
                    <td style={{ padding: '14px' }}>
                      {p.isLowStock ? <span className="badge badge-pending">LOW STOCK ALERT</span> : <span className="badge badge-delivered">HEALTHY</span>}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <button onClick={() => setStockAdjustProduct(p)} className="btn btn-secondary btn-sm">
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stock Adjustment Dialog */}
          {stockAdjustProduct && (
            <div className="modal-overlay" onClick={() => setStockAdjustProduct(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: 24 }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 10 }}>Adjust Stock: {stockAdjustProduct.name}</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: 16 }}>
                  Current Stock: <strong>{stockAdjustProduct.stock}</strong> units
                </p>

                <div className="input-group">
                  <label className="input-label">Adjustment Quantity (+ to restock, - to deduct)</label>
                  <input type="number" value={stockChangeAmount} onChange={(e) => setStockChangeAmount(parseInt(e.target.value) || 0)} className="input-field" />
                </div>

                <div className="input-group">
                  <label className="input-label">Reason for Adjustment</label>
                  <select value={stockAdjustReason} onChange={(e) => setStockAdjustReason(e.target.value)} className="select-field">
                    <option value="RESTOCK">RESTOCK (Warehouse Delivery)</option>
                    <option value="MANUAL_ADJUST">MANUAL_ADJUST (Audit Reconciliation)</option>
                    <option value="DAMAGED_LOSS">DAMAGED_LOSS (Write-Off)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                  <button onClick={() => setStockAdjustProduct(null)} className="btn btn-secondary btn-sm">Cancel</button>
                  <button onClick={handleAdjustStock} className="btn btn-primary btn-sm">Apply Adjustment</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Order Fulfillment */}
      {activeTab === 'orders' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Order Fulfillment Hub</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map((ord) => (
              <div key={ord.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 14, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: '1.05rem', color: '#f8fafc' }}>{ord.orderNumber}</strong>
                    <span className="badge badge-role">{ord.status}</span>
                    <span className={`badge ${ord.paymentStatus === 'PAID' ? 'badge-delivered' : 'badge-pending'}`}>
                      {ord.paymentStatus}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                    Customer: {ord.customer ? `${ord.customer.firstName} ${ord.customer.lastName}` : 'Guest'} • Total: <strong style={{ color: '#818cf8' }}>${Number(ord.totalAmount).toFixed(2)}</strong>
                  </span>
                </div>

                {/* Workflow Status Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {ord.status === 'PENDING' && (
                    <button onClick={() => handleAdvanceOrderStatus(ord.id, 'CONFIRMED')} className="btn btn-primary btn-sm">
                      Confirm Order
                    </button>
                  )}
                  {ord.status === 'CONFIRMED' && (
                    <button onClick={() => handleAdvanceOrderStatus(ord.id, 'PROCESSING')} className="btn btn-primary btn-sm">
                      Start Processing
                    </button>
                  )}
                  {ord.status === 'PROCESSING' && (
                    <button onClick={() => handleAdvanceOrderStatus(ord.id, 'SHIPPED')} className="btn btn-primary btn-sm">
                      Dispatch Shipment
                    </button>
                  )}
                  {ord.status === 'SHIPPED' && (
                    <button onClick={() => handleAdvanceOrderStatus(ord.id, 'DELIVERED')} className="btn btn-primary btn-sm" style={{ background: '#10b981' }}>
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Analytics & Reports */}
      {activeTab === 'reports' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Executive Analytics & Reporting</h3>
            <button onClick={handleExportCSV} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={16} />
              <span>Export Sales CSV</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {salesSummary && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Sales & Velocity</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Total Revenue:</span><strong style={{ color: '#10b981' }}>${salesSummary.totalRevenue.toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Delivered Revenue:</span><strong>${salesSummary.deliveredRevenue.toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Average Order Value (AOV):</span><strong>${salesSummary.averageOrderValue.toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Active Orders:</span><strong>{salesSummary.activeOrders}</strong></div>
                </div>
              </div>
            )}

            {customerMetrics && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Customer Acquisition & Repeat Rate</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Total Registered Customers:</span><strong>{customerMetrics.totalRegisteredCustomers}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Active Purchasers:</span><strong>{customerMetrics.activePurchasers}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Repeat Customer Rate:</span><strong style={{ color: '#818cf8' }}>{customerMetrics.repeatRatePercentage}%</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Users & RBAC */}
      {activeTab === 'users' && user?.role === 'ADMIN' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Role-Based Access Control (RBAC) User Directory</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                <th style={{ padding: '12px 14px' }}>USER</th>
                <th style={{ padding: '12px 14px' }}>NAME</th>
                <th style={{ padding: '12px 14px' }}>CURRENT ROLE</th>
                <th style={{ padding: '12px 14px' }}>PROMOTE / DEMOTE</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '14px', fontWeight: 600, color: '#f8fafc' }}>{u.email}</td>
                  <td style={{ padding: '14px' }}>{u.customer ? `${u.customer.firstName} ${u.customer.lastName}` : 'Staff User'}</td>
                  <td style={{ padding: '14px' }}><span className="badge badge-role">{u.role}</span></td>
                  <td style={{ padding: '14px' }}>
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as Role)} className="select-field" style={{ width: 'auto', padding: '4px 10px' }}>
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: System Audit Logs */}
      {activeTab === 'audit' && user?.role === 'ADMIN' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>System Audit Trail</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 10, fontSize: '0.85rem' }}>
                <div>
                  <span className="badge badge-role" style={{ marginRight: 10 }}>{log.action}</span>
                  <span style={{ color: '#f8fafc' }}>{log.details || log.resource}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
