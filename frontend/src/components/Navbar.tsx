import React from 'react';
import { ShoppingBag, ShoppingCart, User as UserIcon, Shield, Sparkles, LogOut, Package, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';

interface NavbarProps {
  currentTab: 'store' | 'portal' | 'admin' | 'auth';
  setCurrentTab: (tab: 'store' | 'portal' | 'admin' | 'auth') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, openCart } = useCart();

  const isStaff = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 900,
        background: 'rgba(10, 13, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        {/* Brand Logo */}
        <div
          onClick={() => setCurrentTab('store')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.5)',
            }}
          >
            <ShoppingBag size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                NeoCart
              </span>
              <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ flex: 1, maxWidth: 460, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search headphones, keyboards, 4K monitors..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentTab !== 'store') setCurrentTab('store');
            }}
            className="input-field"
            style={{ paddingLeft: 42, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 9999, border: '1px solid rgba(255, 255, 255, 0.08)' }}
          />
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Store Tab */}
          <button
            onClick={() => setCurrentTab('store')}
            className={`btn btn-sm ${currentTab === 'store' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Package size={16} />
            <span>Store</span>
          </button>

          {/* Admin Control Center Tab (for staff) */}
          {isStaff && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`btn btn-sm ${currentTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                background: currentTab === 'admin' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(168, 85, 247, 0.15)',
                borderColor: 'rgba(168, 85, 247, 0.3)',
                color: currentTab === 'admin' ? '#fff' : '#c084fc',
              }}
            >
              <Shield size={16} />
              <span>Admin Hub</span>
            </button>
          )}

          {/* Customer Portal Tab */}
          {isAuthenticated ? (
            <button
              onClick={() => setCurrentTab('portal')}
              className={`btn btn-sm ${currentTab === 'portal' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <UserIcon size={16} />
              <span>{user?.customer?.firstName || 'My Account'}</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('auth')}
              className={`btn btn-sm ${currentTab === 'auth' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <UserIcon size={16} />
              <span>Sign In</span>
            </button>
          )}

          {/* Cart Icon & Badge Button */}
          <button
            onClick={openCart}
            className="btn btn-primary btn-sm"
            style={{ position: 'relative', padding: '8px 14px' }}
          >
            <ShoppingCart size={18} />
            <span>Cart</span>
            {itemCount > 0 && (
              <span
                style={{
                  background: '#f43f5e',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: 9999,
                  marginLeft: 2,
                  boxShadow: '0 2px 6px rgba(244, 63, 94, 0.6)',
                }}
              >
                {itemCount}
              </span>
            )}
          </button>

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              onClick={logout}
              className="btn btn-icon"
              title="Sign Out"
              style={{ color: '#94a3b8' }}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
