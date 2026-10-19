import React, { useState, useEffect } from 'react';
import { ShoppingBag, Star, Sparkles, Filter, SlidersHorizontal, ArrowUpDown, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.js';
import { Product, Category } from '../types.js';

interface StorefrontPageProps {
  onSelectProduct: (productId: string) => void;
  searchQuery: string;
}

export const StorefrontPage: React.FC<StorefrontPageProps> = ({
  onSelectProduct,
  searchQuery,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);

  const { addToCart } = useCart();

  // Fetch Categories
  useEffect(() => {
    api.get('/products/categories').then((res) => {
      if (res.data?.success) setCategories(res.data.data);
    });
  }, []);

  // Fetch Products based on search, category, and sorting
  useEffect(() => {
    setIsLoading(true);
    const params: any = {
      sortBy,
      sortOrder,
    };
    if (searchQuery) params.search = searchQuery;
    if (selectedCategory !== 'all') params.category = selectedCategory;

    api.get('/products', { params })
      .then((res) => {
        if (res.data?.success) {
          setProducts(res.data.data.products);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch products', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchQuery, selectedCategory, sortBy, sortOrder]);

  return (
    <div>
      {/* Hero Showcase Banner */}
      <section
        style={{
          position: 'relative',
          borderRadius: 24,
          padding: '48px 36px',
          marginBottom: 36,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 50%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid var(--border-glass)',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ maxWidth: 640, position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#a5b4fc',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            <Sparkles size={14} color="#818cf8" />
            <span>Next-Gen E-Commerce Architecture</span>
          </div>

          <h1
            style={{
              fontSize: '2.6rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              marginBottom: 14,
              background: 'linear-gradient(to right, #ffffff, #e2e8f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Engineered for Precision & Pure Audio-Visual Clarity.
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 24 }}>
            Explore state-of-the-art studio peripherals, mechanical hardware, and smart wearable technology with live inventory tracking and instant checkout.
          </p>
        </div>
      </section>

      {/* Filter & Sorting Controls */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Category Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: 999 }}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`btn btn-sm ${selectedCategory === cat.slug ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 999 }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ArrowUpDown size={16} color="#94a3b8" />
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}
            className="select-field"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            <option value="createdAt-desc">Newest Arrivals</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Alphabetical: A to Z</option>
          </select>
        </div>
      </section>

      {/* Live Product Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>No products found</h3>
          <p style={{ fontSize: '0.9rem' }}>Try adjusting your search query or selecting another category.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <div
              key={p.id}
              className="glass-card glass-card-interactive"
              style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', padding: 18 }}
              onClick={() => onSelectProduct(p.id)}
            >
              {/* Image Preview with Category Badge */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 200,
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: 'rgba(15, 23, 42, 0.9)',
                  marginBottom: 16,
                }}
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag size={40} color="#6366f1" />
                  </div>
                )}

                {/* Category Pill */}
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {p.category?.name || 'Hardware'}
                </span>

                {/* Stock Alert Badge */}
                {p.isLowStock && p.stock > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.9)',
                      color: '#0f172a',
                    }}
                  >
                    Only {p.stock} left!
                  </span>
                )}
              </div>

              {/* Title & SKU */}
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    lineHeight: 1.35,
                    marginBottom: 6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.name}
                </h3>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <div style={{ display: 'flex', color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                    {p.rating?.average ? p.rating.average.toFixed(1) : '5.0'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    ({p.rating?.reviewCount || 1})
                  </span>
                </div>
              </div>

              {/* Price & Add to Cart Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 14,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8' }}>
                    ${p.price.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(p.id, 1);
                  }}
                  disabled={p.stock <= 0}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 14px' }}
                >
                  <ShoppingBag size={15} />
                  <span>{p.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
