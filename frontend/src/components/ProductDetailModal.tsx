import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, ShieldCheck, Check, Plus, Minus, MessageSquare, AlertCircle } from 'lucide-react';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { Product, Review } from '../types.js';

interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ productId, onClose }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Review Form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!productId) return;
    setIsLoading(true);

    Promise.all([
      api.get(`/products/${productId}`),
      api.get(`/reviews/product/${productId}`),
    ])
      .then(([prodRes, revRes]) => {
        if (prodRes.data?.success) setProduct(prodRes.data.data);
        if (revRes.data?.success) {
          setReviews(revRes.data.data.reviews || []);
          setReviewStats(revRes.data.data.stats || null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch product details', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  if (!productId) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please sign in to write a review.', 'error');
      return;
    }
    if (!newTitle || !newComment) {
      showToast('Please fill in title and comment.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await api.post(`/reviews/product/${productId}`, {
        rating: newRating,
        title: newTitle,
        comment: newComment,
      });

      if (res.data?.success) {
        showToast('Review submitted successfully!', 'success');
        setReviews([res.data.data, ...reviews]);
        setShowReviewForm(false);
        setNewTitle('');
        setNewComment('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to submit review.';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 820, padding: 0, overflow: 'hidden' }}
      >
        {isLoading || !product ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>Loading product details...</div>
        ) : (
          <div>
            {/* Modal Header & Close Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={onClose}
                className="btn btn-icon"
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#fff',
                  borderRadius: 999,
                  zIndex: 10,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Top Product Hero */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 28, padding: 28, borderBottom: '1px solid var(--border-subtle)' }}>
              {/* Image Preview */}
              <div
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'rgba(15, 23, 42, 0.8)',
                  height: 320,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ShoppingBag size={64} color="#6366f1" />
                )}
              </div>

              {/* Product Info */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span className="badge badge-role">{product.category?.name || 'Electronics'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {product.sku}</span>
                  </div>

                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.3, marginBottom: 10 }}>
                    {product.name}
                  </h2>

                  {/* Rating Stars */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <div style={{ display: 'flex', color: '#f59e0b' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={star <= Math.round(product.rating?.average || 0) ? '#f59e0b' : 'transparent'}
                          color="#f59e0b"
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      {product.rating?.average || '0.0'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      ({product.rating?.reviewCount || 0} reviews)
                    </span>
                  </div>

                  <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 18 }}>
                    {product.description}
                  </p>
                </div>

                {/* Pricing & Add to Cart Controls */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#818cf8' }}>
                      ${product.price.toFixed(2)}
                    </span>
                    <span
                      className={`badge ${
                        product.stock <= 0
                          ? 'badge-cancelled'
                          : product.isLowStock
                          ? 'badge-pending'
                          : 'badge-delivered'
                      }`}
                    >
                      {product.stock <= 0 ? 'Out of Stock' : product.isLowStock ? `Only ${product.stock} left!` : `${product.stock} In Stock`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Quantity Picker */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '6px 12px',
                      }}
                    >
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <Minus size={16} />
                      </button>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(product.id, quantity);
                        onClose();
                      }}
                      disabled={product.stock <= 0}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '12px 20px', fontSize: '0.95rem' }}
                    >
                      <ShoppingBag size={18} />
                      <span>Add to Cart • ${(product.price * quantity).toFixed(2)}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Reviews & Customer Feedback Section */}
            <div style={{ padding: 28, background: 'rgba(11, 16, 26, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MessageSquare size={20} color="#818cf8" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Customer Reviews & Ratings</h3>
                </div>

                {!showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    Write a Review
                  </button>
                )}
              </div>

              {/* Review Submission Form */}
              {showReviewForm && (
                <form
                  onSubmit={handleReviewSubmit}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 14,
                    padding: 20,
                    marginBottom: 24,
                  }}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Share your feedback</h4>

                  {/* Rating Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Your Rating:</span>
                    <div style={{ display: 'flex', gap: 4, cursor: 'pointer' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={22}
                          onClick={() => setNewRating(star)}
                          fill={star <= newRating ? '#f59e0b' : 'transparent'}
                          color="#f59e0b"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="input-group" style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="Headline (e.g. Best headphones I have ever owned)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 14 }}>
                    <textarea
                      placeholder="Write your honest review here..."
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="textarea-field"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="btn btn-primary btn-sm"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>
                    No reviews yet. Be the first to review this product!
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', color: '#f59e0b' }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={14}
                                fill={s <= rev.rating ? '#f59e0b' : 'transparent'}
                                color="#f59e0b"
                              />
                            ))}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f8fafc' }}>
                            {rev.title}
                          </span>
                        </div>

                        {rev.isVerifiedPurchase && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.72rem',
                              color: '#10b981',
                              fontWeight: 600,
                              background: 'rgba(16, 185, 129, 0.12)',
                              padding: '2px 8px',
                              borderRadius: 999,
                            }}
                          >
                            <ShieldCheck size={12} /> Verified Buyer
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: 6 }}>
                        {rev.comment}
                      </p>

                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        By {rev.customer ? `${rev.customer.firstName} ${rev.customer.lastName}` : 'Verified Customer'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
