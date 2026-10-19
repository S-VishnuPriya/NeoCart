import React, { useState } from 'react';
import { Navbar } from './components/Navbar.js';
import { CartDrawer } from './components/CartDrawer.js';
import { CheckoutModal } from './components/CheckoutModal.js';
import { ProductDetailModal } from './components/ProductDetailModal.js';
import { StorefrontPage } from './pages/StorefrontPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { CustomerPortalPage } from './pages/CustomerPortalPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { useAuth } from './context/AuthContext.js';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'store' | 'portal' | 'admin' | 'auth'>('store');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { isAuthenticated, user } = useAuth();

  return (
    <div className="app-container">
      {/* Top Sticky Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Routed Content */}
      <main className="main-content">
        {currentTab === 'store' && (
          <StorefrontPage
            searchQuery={searchQuery}
            onSelectProduct={(id) => setSelectedProductId(id)}
          />
        )}

        {currentTab === 'portal' && <CustomerPortalPage />}

        {currentTab === 'admin' && <AdminDashboardPage />}

        {currentTab === 'auth' && (
          <AuthPage onSuccess={() => setCurrentTab('store')} />
        )}
      </main>

      {/* Global Modals & Drawers */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={(orderId) => {
          setCurrentTab('portal');
        }}
        onNavigateToAuth={() => setCurrentTab('auth')}
      />

      <ProductDetailModal
        productId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />

      {/* Sleek Global Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '24px 20px',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: '#64748b',
          background: 'rgba(10, 13, 20, 0.95)',
        }}
      >
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span>NeoCart Full-Stack E-Commerce Engine • Developer A & Developer B Integrated</span>
          <span>PostgreSQL • Prisma ORM • Node.js/Express • React (Vite) • TypeScript</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
