import React, { useState, useEffect } from 'react';
import { ShieldAlert, Package, ShoppingCart, Tag, Star, Users, Check, X, ArrowLeft, RefreshCw, AlertCircle, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { PRODUCTS } from '../../data/products';
import { useToast } from '../../context/ToastContext';

export const AdminView: React.FC = () => {
  const { user, profile, isAdmin, isLoading } = useAuth();
  const { navigateTo } = useNavigation();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'coupons' | 'reviews'>('products');
  const [productsList, setProductsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // New coupon form
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('10');
  const [newDesc, setNewDesc] = useState('');

  // Editing stock
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  const loadAdminData = async () => {
    setLoadingData(true);

    if (!isSupabaseConfigured) {
      setProductsList(PRODUCTS);
      setCouponsList([
        { code: 'NYX10', discount_percent: 10, description: '10% off entire order', usage_count: 34, is_active: true },
        { code: 'DRIP15', discount_percent: 15, description: '15% off orders above ₹1,499', usage_count: 18, is_active: true },
      ]);
      setLoadingData(false);
      return;
    }

    try {
      // 1. Fetch Products
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (prods && prods.length > 0) {
        setProductsList(prods);
      } else {
        setProductsList(PRODUCTS);
      }

      // 2. Fetch Orders
      const { data: ords } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (ords) setOrdersList(ords);

      // 3. Fetch Coupons
      const { data: cups } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (cups) setCouponsList(cups);

      // 4. Fetch Reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (revs) setReviewsList(revs);
    } catch (err) {
      console.warn('Admin load note:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const handleUpdateStock = async (productId: string, qty: number) => {
    if (!isSupabaseConfigured) {
      setProductsList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: qty } : p))
      );
      setEditingStockId(null);
      showToast('Inventory Updated', `Stock set to ${qty}`, 'success');
      return;
    }

    try {
      await supabase
        .from('inventory')
        .upsert({
          product_id: productId,
          quantity: qty,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id' });

      await supabase
        .from('products')
        .update({ stock: qty, updated_at: new Date().toISOString() })
        .eq('id', productId);

      setProductsList((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stock: qty } : p))
      );
      setEditingStockId(null);
      showToast('Inventory Updated', `Stock set to ${qty}`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stock update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!isSupabaseConfigured) {
      setOrdersList((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o))
      );
      showToast('Order Updated', `Status changed to ${status}`, 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (!error) {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, order_status: status } : o))
        );
        showToast('Order Updated', `Status changed to ${status}`, 'success');
      }
    } catch (err) {
      console.warn('Update order status note:', err);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    const payload = {
      code: newCode.trim().toUpperCase(),
      discount_percent: Number(newDiscount),
      description: newDesc.trim() || `${newDiscount}% promotional discount`,
      is_active: true,
      min_order_amount: 0,
    };

    if (!isSupabaseConfigured) {
      setCouponsList((prev) => [payload, ...prev]);
      setNewCode('');
      setNewDesc('');
      showToast('Cipher Created', payload.code, 'success');
      return;
    }

    try {
      const { data, error } = await supabase.from('coupons').insert(payload).select().single();
      if (!error && data) {
        setCouponsList((prev) => [data, ...prev]);
        setNewCode('');
        setNewDesc('');
        showToast('Cipher Created', payload.code, 'success');
      }
    } catch {
      // note
    }
  };

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] flex items-center justify-center p-6">
        <p className="text-xs uppercase tracking-widest text-[#9A9AA3]">Verifying Security Clearance...</p>
      </div>
    );
  }

  // 2. Access Denied State (Not logged in or not admin)
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-24 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#15151B] border border-red-900/60 p-8 space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center">
            <ShieldAlert size={24} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold block">
            RESTRICTED OPERATIONAL VAULT
          </span>
          <h2 className="font-display text-xl font-bold uppercase text-white">
            ADMIN CLEARANCE REQUIRED
          </h2>
          <p className="text-xs text-[#9A9AA3] leading-relaxed">
            Your current authenticated operative role is{' '}
            <span className="text-[#00D9FF] font-semibold">{profile?.role || 'Guest'}</span>.
            Access to inventory, customer order logs, and promotional ciphers is restricted to syndicate administrators.
          </p>
          <div className="p-3 bg-[#0A0A0D] border border-[#2A2A32] text-left text-[11px] text-[#C7CBD3] space-y-1">
            <p className="font-semibold text-[#8B5CF6]">How to grant admin access in Supabase:</p>
            <p>1. Open your Supabase Dashboard → Table Editor → <code>profiles</code></p>
            <p>2. Locate your user record: <code>{user?.email || 'your-email@domain.com'}</code></p>
            <p>3. Set column <code>role</code> to <code>admin</code></p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="w-full py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  // 3. Authorized Admin Cockpit
  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2A2A32]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="p-2 border border-[#2A2A32] text-[#9A9AA3] hover:text-white transition-colors"
              title="Return to Shop"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#00D9FF] font-semibold block">
                ADMINISTRATIVE COCKPIT · ROW LEVEL SECURITY ACTIVE
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-white">
                NYX VAULT ARCHIVE MANAGEMENT
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAdminData}
              className="px-3.5 py-2 border border-[#2A2A32] hover:border-[#8B5CF6] text-xs text-[#C7CBD3] flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={13} className={loadingData ? 'animate-spin' : ''} />
              <span>Sync Database</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#2A2A32] gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[#9A9AA3] hover:text-white'
            }`}
          >
            <Package size={15} />
            <span>Products & Stock ({productsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[#9A9AA3] hover:text-white'
            }`}
          >
            <ShoppingCart size={15} />
            <span>Customer Orders ({ordersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'border-[#8B5CF6] text-white'
                : 'border-transparent text-[#9A9AA3] hover:text-white'
            }`}
          >
            <Tag size={15} />
            <span>Coupons & Ciphers ({couponsList.length})</span>
          </button>
        </div>

        {/* TAB 1: PRODUCTS & INVENTORY */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-[#9A9AA3]">
              <p>Manage live inventory levels and stock thresholds.</p>
              <span className="font-mono-numbers">{productsList.length} Hardware Pieces Loaded</span>
            </div>

            <div className="bg-[#15151B] border border-[#2A2A32] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0A0D] border-b border-[#2A2A32] text-[#9A9AA3] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Current Stock</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A32]">
                  {productsList.map((p) => {
                    const isEditing = editingStockId === p.id;
                    const stockVal = Number(p.stock || 0);

                    return (
                      <tr key={p.id} className="hover:bg-[#101015] transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-[#F5F5F7]">{p.name}</p>
                          <p className="text-[10px] text-[#9A9AA3] font-mono-numbers">{p.slug}</p>
                        </td>
                        <td className="p-3.5 text-[#C7CBD3]">{p.category_name || p.category}</td>
                        <td className="p-3.5 font-mono-numbers text-white">
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={newStockVal}
                                onChange={(e) => setNewStockVal(Number(e.target.value))}
                                className="w-16 bg-[#0A0A0D] border border-[#8B5CF6] px-2 py-1 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateStock(p.id, newStockVal)}
                                className="p-1 text-emerald-400 hover:text-white"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingStockId(null)}
                                className="p-1 text-red-400 hover:text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-mono-numbers">
                              <span className={stockVal <= 5 ? 'text-amber-400 font-bold' : 'text-white'}>
                                {stockVal} units
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStockId(p.id);
                                  setNewStockVal(stockVal);
                                }}
                                className="text-[#9A9AA3] hover:text-[#8B5CF6]"
                                title="Edit Stock"
                              >
                                <Edit3 size={12} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {stockVal > 5 ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                              IN STOCK
                            </span>
                          ) : stockVal > 0 ? (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-950/60 text-amber-300 border border-amber-800/40">
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-red-950/60 text-red-300 border border-red-800/40">
                              DEPLETED
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => navigateTo('product', { productId: p.slug })}
                            className="text-[#00D9FF] hover:underline text-[11px]"
                          >
                            View Page →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <p className="text-xs text-[#9A9AA3]">Real-time customer transactions stored in Supabase <code>orders</code> table.</p>

            {ordersList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#9A9AA3] border border-[#2A2A32] bg-[#15151B]">
                No orders registered yet. Run a test checkout to see orders appear in real-time.
              </div>
            ) : (
              <div className="space-y-4">
                {ordersList.map((ord) => (
                  <div key={ord.id} className="p-5 bg-[#15151B] border border-[#2A2A32] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2A2A32]">
                      <div>
                        <span className="font-mono-numbers font-bold text-white text-sm">{ord.order_number}</span>
                        <span className="text-[10px] text-[#9A9AA3] block">
                          Customer: {ord.customer_name} ({ord.customer_email}) · {new Date(ord.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={ord.order_status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="bg-[#0A0A0D] border border-[#2A2A32] text-xs text-white px-2.5 py-1"
                        >
                          <option value="Processing">Processing</option>
                          <option value="Paid">Paid</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <span className="font-mono-numbers font-bold text-[#00D9FF] text-sm">
                          ₹{Number(ord.total).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#C7CBD3]">
                      <p className="text-[11px] text-[#9A9AA3]">
                        Payment: <span className="uppercase text-white font-semibold">{ord.payment_method}</span> · Status: {ord.payment_status}
                      </p>
                      <p className="text-[11px] text-[#9A9AA3]">
                        Destination: {ord.shipping_address?.address}, {ord.shipping_address?.city}, {ord.shipping_address?.state} - {ord.shipping_address?.pincode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* Create new coupon form */}
            <form onSubmit={handleCreateCoupon} className="p-5 bg-[#15151B] border border-[#2A2A32] space-y-3">
              <h3 className="font-display text-sm font-bold uppercase text-white">Create Promotional Cipher</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Cipher Code (e.g. MIDNIGHT20)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="bg-[#0A0A0D] border border-[#2A2A32] px-3 py-2 text-xs text-white uppercase"
                />
                <input
                  type="number"
                  required
                  min={1}
                  max={90}
                  placeholder="Discount % (e.g. 20)"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="bg-[#0A0A0D] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="bg-[#0A0A0D] border border-[#2A2A32] px-3 py-2 text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider"
              >
                Publish Coupon
              </button>
            </form>

            {/* Existing Coupons Table */}
            <div className="bg-[#15151B] border border-[#2A2A32]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A0A0D] border-b border-[#2A2A32] text-[#9A9AA3] uppercase text-[10px]">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Discount</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Redemptions</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A32]">
                  {couponsList.map((c, i) => (
                    <tr key={i}>
                      <td className="p-3.5 font-mono-numbers font-bold text-[#8B5CF6]">{c.code}</td>
                      <td className="p-3.5 font-bold text-white">{c.discount_percent}% OFF</td>
                      <td className="p-3.5 text-[#C7CBD3]">{c.description}</td>
                      <td className="p-3.5 font-mono-numbers text-[#9A9AA3]">{c.usage_count || 0} used</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
