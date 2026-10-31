import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Menu,
  ShieldCheck,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useProducts } from '../../context/ProductContext';
import { useToast } from '../../context/ToastContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { invalidateProductsCache } from '../../services/productService';
import { ProductModal } from './ProductModal';
import { CategoryModal } from './CategoryModal';
import { OrderDetailModal } from './OrderDetailModal';
import { CustomerDetailModal } from './CustomerDetailModal';

type AdminTab = 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'analytics' | 'settings';

export const AdminDashboardView: React.FC = () => {
  const { user, profile, isAdmin, isLoading: authLoading, signOut } = useAuth();
  const { navigateTo } = useNavigation();
  const { products: storeProducts, refreshProducts } = useProducts();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data states from Supabase
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState(false);

  // Delete product confirmation
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Inline stock editing
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>('');

  // Filters & search
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const [customerSearch, setCustomerSearch] = useState('');

  // 1. Auth Guard: Redirect unauthenticated or non-admin to /admin/login
  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        showToast('Authentication Required', 'Please log in with admin clearance.', 'error');
        navigateTo('admin-login');
      }
    }
  }, [user, isAdmin, authLoading, navigateTo, showToast]);

  // 2. Fetch real data from Supabase
  const loadDashboardData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      // 1. Fetch Products
      const { data: prodsData, error: prodsErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!prodsErr && prodsData) {
        setProducts(prodsData);
      } else {
        setProducts(storeProducts);
      }

      // 2. Fetch Orders with order_items
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (!ordersErr && ordersData) {
        setOrders(ordersData);
      }

      // 3. Fetch Categories (if table exists, otherwise derive from products & defaults)
      const { data: catsData, error: catsErr } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (!catsErr && catsData && catsData.length > 0) {
        setCategories(catsData);
      } else {
        // Automatically derive categories from existing products + catalog defaults
        const defaultNames = [
          'Necklaces',
          'Pendants',
          'Bracelets',
          'Chains',
          'Wallets',
          'Accessories',
          'Glass',
          'Earbuds',
          'Caps',
          'Studs / Earrings',
        ];
        const productCategoryNames = (prodsData || storeProducts || [])
          .map((p: any) => p.category_name || p.category)
          .filter(Boolean);
        const uniqueCatNames = Array.from(new Set([...defaultNames, ...productCategoryNames]));
        setCategories(
          uniqueCatNames.map((name, index) => ({
            id: `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            display_order: index,
          }))
        );
      }

      // 4. Fetch Profiles for Customers
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesData) {
        setProfiles(profilesData);
      }
    } catch (err) {
      console.warn('Dashboard data fetch note:', err);
    } finally {
      setLoadingData(false);
    }
  }, [storeProducts]);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, loadDashboardData]);

  // Calculated Real Statistics
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalOrders = orders.length;

    // Verified payments: sum of total where payment_status === 'Paid'
    const verifiedOrders = orders.filter((o) => (o.payment_status || '').toLowerCase() === 'paid');
    const totalRevenue = verifiedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    const pendingOrders = orders.filter(
      (o) => ['pending', 'processing'].includes((o.order_status || '').toLowerCase())
    ).length;

    const completedOrders = orders.filter(
      (o) => (o.order_status || '').toLowerCase() === 'delivered'
    ).length;

    const lowStockCount = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5).length;
    const outOfStockCount = products.filter((p) => Number(p.stock) <= 0).length;

    return {
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      lowStockCount,
      outOfStockCount,
      verifiedCount: verifiedOrders.length,
    };
  }, [products, orders]);

  // Real Monthly Sales Data for Chart
  const salesByMonth = useMemo(() => {
    const monthsMap: Record<string, { label: string; revenue: number; ordersCount: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate last 6 months in chronological order
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[key] = {
        label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        revenue: 0,
        ordersCount: 0,
      };
    }

    // Populate with real orders
    orders.forEach((ord) => {
      if ((ord.payment_status || '').toLowerCase() === 'paid') {
        const ordDate = new Date(ord.created_at);
        const key = `${ordDate.getFullYear()}-${String(ordDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) {
          monthsMap[key].revenue += Number(ord.total || 0);
          monthsMap[key].ordersCount += 1;
        }
      }
    });

    return Object.values(monthsMap);
  }, [orders]);

  const maxMonthRevenue = useMemo(() => {
    const maxVal = Math.max(...salesByMonth.map((m) => m.revenue), 1000);
    return maxVal;
  }, [salesByMonth]);

  // Aggregated Customers List
  const customersList = useMemo(() => {
    const map = new Map<string, any>();

    // Seed from profiles
    profiles.forEach((p) => {
      map.set(p.email.toLowerCase(), {
        id: p.id,
        name: p.full_name || p.email.split('@')[0],
        email: p.email,
        phone: p.phone,
        role: p.role,
        createdAt: p.created_at,
        orders: [],
        totalSpent: 0,
        orderCount: 0,
      });
    });

    // Aggregate from orders
    orders.forEach((ord) => {
      const email = (ord.customer_email || '').toLowerCase();
      if (!email) return;

      if (!map.has(email)) {
        map.set(email, {
          id: ord.user_id || `guest-${email}`,
          name: ord.customer_name || email.split('@')[0],
          email: ord.customer_email,
          phone: ord.customer_phone,
          role: 'Customer',
          createdAt: ord.created_at,
          orders: [],
          totalSpent: 0,
          orderCount: 0,
        });
      }

      const rec = map.get(email);
      rec.orders.push(ord);
      rec.orderCount += 1;
      if ((ord.payment_status || '').toLowerCase() === 'paid') {
        rec.totalSpent += Number(ord.total || 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [profiles, orders]);

  // Product Actions: Stock, Toggle Publish, Delete
  const handleSaveStock = async (prodId: string) => {
    const newStockNum = parseInt(tempStockValue, 10);
    if (isNaN(newStockNum) || newStockNum < 0) {
      showToast('Invalid Stock', 'Please enter a non-negative number.', 'error');
      return;
    }

    try {
      await supabase
        .from('products')
        .update({ stock: newStockNum, updated_at: new Date().toISOString() })
        .eq('id', prodId);

      try {
        await supabase
          .from('inventory')
          .upsert({ product_id: prodId, quantity: newStockNum, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });
      } catch {
        // safe
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === prodId ? { ...p, stock: newStockNum } : p))
      );
      setEditingStockId(null);
      invalidateProductsCache();
      await refreshProducts();
      showToast('Inventory Updated', `Stock quantity set to ${newStockNum}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stock update failed';
      showToast('Error', msg, 'error');
    }
  };

  const handleTogglePublish = async (prod: any) => {
    const nextState = !prod.is_active;
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', prod.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, is_active: nextState } : p))
      );
      invalidateProductsCache();
      await refreshProducts();
      showToast(
        nextState ? 'Product Published' : 'Product Hidden',
        `${prod.name} is now ${nextState ? 'visible' : 'hidden'} on storefront.`,
        'info'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update visibility';
      showToast('Error', msg, 'error');
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeletingProduct(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      invalidateProductsCache();
      await refreshProducts();
      showToast('Product Removed', `${productToDelete.name} was removed from catalogue.`, 'success');
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      showToast('Error', msg, 'error');
    } finally {
      setDeletingProduct(false);
    }
  };

  // Quick Order Status Update
  const handleQuickOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      );
      showToast('Status Updated', `Order marked as ${newStatus}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast('Error', msg, 'error');
    }
  };

  // Filtered lists
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.slug?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCat =
        productCategoryFilter === 'all' ||
        (p.category_name || p.category || '').toLowerCase() === productCategoryFilter.toLowerCase();
      return matchesSearch && matchesCat;
    });
  }, [products, productSearch, productCategoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = orderSearch.toLowerCase();
      const matchesSearch =
        o.order_number?.toLowerCase().includes(term) ||
        o.customer_name?.toLowerCase().includes(term) ||
        o.customer_email?.toLowerCase().includes(term);
      const matchesStatus =
        orderStatusFilter === 'all' ||
        (o.order_status || '').toLowerCase() === orderStatusFilter.toLowerCase() ||
        (orderStatusFilter === 'paid' && (o.payment_status || '').toLowerCase() === 'paid');
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const term = customerSearch.toLowerCase();
      return c.name?.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term);
    });
  }, [customersList, customerSearch]);

  const handleSignOut = async () => {
    await signOut();
    navigateTo('admin-login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-2 border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase tracking-[0.3em] text-[#9A9AA3]">
          Verifying Vault Clearance...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#F5F5F7] flex flex-col lg:flex-row font-sans">
      {/* ====================================================================
          SIDEBAR NAVIGATION (Desktop & Mobile Drawer)
          ==================================================================== */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-[#15151B] border-r border-[#2A2A32] flex flex-col justify-between transition-transform duration-300 ease-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-[#2A2A32] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
                <span className="text-[10px] font-mono-numbers uppercase tracking-[0.25em] text-[#00D9FF] font-semibold">
                  OPERATIONAL VAULT
                </span>
              </div>
              <h1 className="font-display text-lg font-black uppercase text-white tracking-wider mt-0.5">
                NYX<span className="text-[#8B5CF6]">DRIP</span> ADMIN
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-[#9A9AA3] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'dashboard'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('products');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'products'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package size={16} />
                <span>Products</span>
              </div>
              <span className="font-mono-numbers text-[10px] bg-[#0A0A0D] px-1.5 py-0.5 border border-[#2A2A32] text-[#C7CBD3]">
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('categories');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'categories'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers size={16} />
                <span>Categories</span>
              </div>
              <span className="font-mono-numbers text-[10px] bg-[#0A0A0D] px-1.5 py-0.5 border border-[#2A2A32] text-[#C7CBD3]">
                {categories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'orders'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={16} />
                <span>Orders</span>
              </div>
              {stats.pendingOrders > 0 ? (
                <span className="font-mono-numbers text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5">
                  {stats.pendingOrders}
                </span>
              ) : (
                <span className="font-mono-numbers text-[10px] bg-[#0A0A0D] px-1.5 py-0.5 border border-[#2A2A32] text-[#C7CBD3]">
                  {orders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('customers');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'customers'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={16} />
                <span>Customers</span>
              </div>
              <span className="font-mono-numbers text-[10px] bg-[#0A0A0D] px-1.5 py-0.5 border border-[#2A2A32] text-[#C7CBD3]">
                {customersList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('analytics');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'analytics'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <BarChart3 size={16} />
              <span>Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-none ${
                activeTab === 'settings'
                  ? 'bg-[#8B5CF6] text-white font-bold shadow-lg shadow-[#8B5CF6]/20'
                  : 'text-[#9A9AA3] hover:text-white hover:bg-[#1B1B22]'
              }`}
            >
              <Settings size={16} />
              <span>Settings & SQL</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer with Admin Session & Logout */}
        <div className="p-4 border-t border-[#2A2A32] bg-[#0A0A0D]">
          <div className="mb-3 px-2">
            <span className="text-[10px] uppercase tracking-wider text-[#9A9AA3] font-semibold block">
              Logged in Operative
            </span>
            <p className="text-xs font-bold text-white truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40">
              ROLE: {profile?.role?.toUpperCase() || 'ADMIN'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="py-2 px-2 border border-[#2A2A32] hover:border-[#00D9FF] text-[10px] uppercase font-bold text-[#C7CBD3] hover:text-[#00D9FF] flex items-center justify-center gap-1 transition-colors"
              title="Return to Storefront"
            >
              <ExternalLink size={12} />
              <span>Store</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="py-2 px-2 border border-[#2A2A32] hover:border-red-600 text-[10px] uppercase font-bold text-[#9A9AA3] hover:text-red-400 flex items-center justify-center gap-1 transition-colors"
              title="End session"
            >
              <LogOut size={12} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/80 lg:hidden"
        />
      )}

      {/* ====================================================================
          MAIN CONTENT AREA
          ==================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0A0A0D]">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 bg-[#15151B]/95 backdrop-blur border-b border-[#2A2A32] px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-[#9A9AA3] hover:text-white border border-[#2A2A32]"
            >
              <Menu size={18} />
            </button>
            <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'products' && 'Product Catalogue Management'}
              {activeTab === 'categories' && 'Category Taxonomy'}
              {activeTab === 'orders' && 'Customer Order Management'}
              {activeTab === 'customers' && 'Customer Dossiers'}
              {activeTab === 'analytics' && 'Financial & Performance Analytics'}
              {activeTab === 'settings' && 'System Authorization & SQL Migration'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadDashboardData}
              disabled={loadingData}
              className="px-3 py-1.5 border border-[#2A2A32] hover:border-[#8B5CF6] text-xs text-[#C7CBD3] flex items-center gap-2 transition-colors cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw size={13} className={loadingData ? 'animate-spin text-[#8B5CF6]' : ''} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>

            {activeTab === 'products' && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#8B5CF6]/20 transition-colors"
              >
                <Plus size={14} />
                <span>Add Piece</span>
              </button>
            )}

            {activeTab === 'categories' && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-1.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} />
                <span>Add Category</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab View Contents */}
        <div className="p-4 sm:p-8 space-y-8 flex-1">
          {/* ================================================================
              VIEW 1: DASHBOARD OVERVIEW
              ================================================================ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Products */}
                <div className="p-5 bg-[#15151B] border border-[#2A2A32] relative overflow-hidden">
                  <div className="flex items-center justify-between text-[#9A9AA3]">
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Total Products</span>
                    <Package size={18} className="text-[#8B5CF6]" />
                  </div>
                  <p className="font-mono-numbers text-2xl sm:text-3xl font-black text-white mt-2">
                    {stats.totalProducts}
                  </p>
                  <p className="text-[11px] text-[#9A9AA3] mt-1">
                    {products.filter((p) => p.is_active).length} published active pieces
                  </p>
                </div>

                {/* Total Orders */}
                <div className="p-5 bg-[#15151B] border border-[#2A2A32] relative overflow-hidden">
                  <div className="flex items-center justify-between text-[#9A9AA3]">
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Total Orders</span>
                    <ShoppingCart size={18} className="text-[#00D9FF]" />
                  </div>
                  <p className="font-mono-numbers text-2xl sm:text-3xl font-black text-white mt-2">
                    {stats.totalOrders}
                  </p>
                  <p className="text-[11px] text-[#9A9AA3] mt-1 font-mono-numbers">
                    {stats.verifiedCount} verified transactions
                  </p>
                </div>

                {/* Payment Gateway Status & Revenue */}
                <div className="p-5 bg-[#15151B] border border-[#2A2A32] relative overflow-hidden">
                  <div className="flex items-center justify-between text-[#9A9AA3]">
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Gateway Status</span>
                    <DollarSign size={18} className="text-amber-400" />
                  </div>
                  <p className="font-display text-sm sm:text-base font-bold text-amber-300 mt-2 uppercase tracking-wide">
                    Payment Gateway Not Connected
                  </p>
                  <p className="text-[11px] text-[#9A9AA3] mt-1 font-mono-numbers">
                    Razorpay integration scheduled for final phase
                  </p>
                </div>

                {/* Pending vs Completed Orders */}
                <div className="p-5 bg-[#15151B] border border-[#2A2A32] relative overflow-hidden">
                  <div className="flex items-center justify-between text-[#9A9AA3]">
                    <span className="text-[10px] uppercase font-semibold tracking-wider">Fulfillment Status</span>
                    <Clock size={18} className="text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-3 mt-2 font-mono-numbers">
                    <span className="text-2xl sm:text-3xl font-black text-amber-400">
                      {stats.pendingOrders}
                    </span>
                    <span className="text-xs text-[#9A9AA3]">pending</span>
                    <span className="text-base font-bold text-emerald-400 ml-auto">
                      {stats.completedOrders} delivered
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9A9AA3] mt-1">
                    Awaiting dispatch or in transit
                  </p>
                </div>
              </div>

              {/* Low Stock Warning Banner if applicable */}
              {stats.lowStockCount > 0 && (
                <div className="p-4 bg-amber-950/30 border border-amber-800/80 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                        Low Stock Alert ({stats.lowStockCount} Piece{stats.lowStockCount === 1 ? '' : 's'})
                      </p>
                      <p className="text-[11px] text-[#C7CBD3]">
                        Some pieces have 5 or fewer items remaining in inventory.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors"
                  >
                    Adjust Stock
                  </button>
                </div>
              )}

              {/* Monthly Sales Chart & Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sales Chart Box */}
                <div className="lg:col-span-8 p-6 bg-[#15151B] border border-[#2A2A32] space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-[#8B5CF6] font-semibold">
                        ORDER VOLUME & FLOW
                      </span>
                      <h3 className="font-display text-base font-bold uppercase text-white mt-0.5">
                        Monthly Sales Analytics
                      </h3>
                    </div>
                    <span className="text-xs font-mono-numbers text-amber-400">
                      Payment Gateway Not Connected
                    </span>
                  </div>

                  {/* SVG Bar Chart with real monthly aggregates */}
                  <div className="h-64 flex items-end gap-3 sm:gap-6 pt-6 pb-2 border-b border-[#2A2A32]">
                    {salesByMonth.map((m, idx) => {
                      const heightPercent = maxMonthRevenue > 0
                        ? Math.max(Math.round((m.revenue / maxMonthRevenue) * 100), m.revenue > 0 ? 8 : 2)
                        : 2;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                          {/* Tooltip on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono-numbers text-white bg-[#0A0A0D] border border-[#2A2A32] px-2 py-1 mb-2 whitespace-nowrap shadow-lg pointer-events-none">
                            ₹{m.revenue.toLocaleString('en-IN')} ({m.ordersCount} ord)
                          </div>

                          {/* Bar */}
                          <div
                            className="w-full max-w-[48px] bg-gradient-to-t from-[#8B5CF6] to-[#00D9FF] rounded-t transition-all duration-500 group-hover:brightness-125"
                            style={{ height: `${heightPercent}%` }}
                          />

                          {/* Month Label */}
                          <span className="text-[10px] font-mono-numbers text-[#9A9AA3] mt-3 uppercase tracking-wider">
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#9A9AA3]">
                    <span>Calculated strictly from orders marked with verified status.</span>
                    <span className="font-mono-numbers text-[#C7CBD3]">
                      Max Month: ₹{maxMonthRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Right Column: Fast Actions & Summary */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
                    <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                      Vault Quick Actions
                    </h4>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setIsProductModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 bg-[#1B1B22] hover:bg-[#8B5CF6] hover:text-white text-[#C7CBD3] text-xs font-semibold uppercase tracking-wider text-left flex items-center justify-between transition-colors border border-[#2A2A32]"
                      >
                        <span className="flex items-center gap-2">
                          <Plus size={14} />
                          <span>Add New Hardware Piece</span>
                        </span>
                        <ChevronRight size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="w-full py-2.5 px-3 bg-[#1B1B22] hover:bg-[#15151B] text-[#C7CBD3] hover:text-white text-xs font-semibold uppercase tracking-wider text-left flex items-center justify-between transition-colors border border-[#2A2A32]"
                      >
                        <span className="flex items-center gap-2">
                          <ShoppingCart size={14} />
                          <span>Review Pending Orders</span>
                        </span>
                        <span className="font-mono-numbers text-[#00D9FF]">
                          {stats.pendingOrders}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('categories')}
                        className="w-full py-2.5 px-3 bg-[#1B1B22] hover:bg-[#15151B] text-[#C7CBD3] hover:text-white text-xs font-semibold uppercase tracking-wider text-left flex items-center justify-between transition-colors border border-[#2A2A32]"
                      >
                        <span className="flex items-center gap-2">
                          <Layers size={14} />
                          <span>Manage Categories</span>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-[#0A0A0D] border border-[#2A2A32] space-y-3">
                    <span className="text-[10px] uppercase font-semibold text-[#8B5CF6] tracking-wider block">
                      SECURITY & ACCESS STATUS
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9A9AA3]">Supabase Live DB</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={12} /> Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9A9AA3]">Row Level Security</span>
                      <span className="text-[#00D9FF] font-bold">Enforced (RLS)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9A9AA3]">Storage Bucket</span>
                      <span className="text-white font-mono-numbers">/products (CDN)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#00D9FF] font-semibold">
                      INCOMING OPERATIONS
                    </span>
                    <h3 className="font-display text-base font-bold uppercase text-white mt-0.5">
                      Recent Orders
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs uppercase font-bold tracking-wider text-[#8B5CF6] hover:text-[#00D9FF] flex items-center gap-1 transition-colors"
                  >
                    <span>View All Orders</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="p-12 text-center text-[#9A9AA3] border border-[#2A2A32] bg-[#0A0A0D]">
                    <ShoppingCart size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs uppercase tracking-wider">No Customer Orders Logged Yet</p>
                    <p className="text-[11px] text-[#9A9AA3]/60 mt-1">
                      New orders placed on the storefront will appear here instantly.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#2A2A32]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0A0A0D] text-[10px] uppercase tracking-wider text-[#9A9AA3] border-b border-[#2A2A32]">
                        <tr>
                          <th className="py-3 px-4">Order #</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Payment</th>
                          <th className="py-3 px-4">Fulfillment</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2A2A32]/60">
                        {orders.slice(0, 6).map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#1A1A22]/40 transition-colors">
                            <td className="py-3 px-4 font-mono-numbers font-bold text-white">
                              #{ord.order_number}
                            </td>
                            <td className="py-3 px-4 text-[#C7CBD3]">
                              <p className="font-semibold text-white">{ord.customer_name || 'Customer'}</p>
                              <p className="text-[10px] text-[#9A9AA3]">{ord.customer_email}</p>
                            </td>
                            <td className="py-3 px-4 text-[#9A9AA3] font-mono-numbers text-[11px]">
                              {new Date(ord.created_at).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                                (ord.payment_status || '').toLowerCase() === 'paid'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                  : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                              }`}>
                                {ord.payment_status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono-numbers text-[11px] text-[#C7CBD3]">
                                {ord.order_status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono-numbers font-bold text-[#00D9FF]">
                              ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setIsOrderDetailOpen(true);
                                }}
                                className="px-2.5 py-1 bg-[#1B1B22] hover:bg-[#8B5CF6] text-white text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 2: PRODUCTS MANAGEMENT
              ================================================================ */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-[#15151B] border border-[#2A2A32]">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9AA3]" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, slug or keyword..."
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white pl-10 pr-4 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-3 py-2.5 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(null);
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap shadow-md shadow-[#8B5CF6]/20 transition-colors"
                  >
                    <Plus size={15} />
                    <span>New Piece</span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-[#15151B] border border-[#2A2A32] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0A0D] text-[10px] uppercase tracking-wider text-[#9A9AA3] border-b border-[#2A2A32]">
                    <tr>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4 text-center">Stock</th>
                      <th className="py-3 px-4 text-center">Live Status</th>
                      <th className="py-3 px-4 text-center">Badges</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A32]/60">
                    {filteredProducts.map((p) => {
                      const primaryImg = Array.isArray(p.images) && p.images[0] ? p.images[0] : '/assets/products/placeholder.svg';
                      const isStockEditing = editingStockId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-[#1A1A22]/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={primaryImg}
                                alt={p.name}
                                className="w-10 h-10 object-cover border border-[#2A2A32] bg-[#0A0A0D] shrink-0"
                              />
                              <div>
                                <p className="font-bold text-white text-xs hover:text-[#00D9FF] transition-colors">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-[#9A9AA3] font-mono-numbers">
                                  {p.slug}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-[#C7CBD3]">
                            {p.category_name || p.category}
                          </td>

                          <td className="py-3 px-4 font-mono-numbers text-xs">
                            <span className="font-bold text-white">₹{Number(p.price).toLocaleString('en-IN')}</span>
                            {p.original_price && p.original_price > p.price && (
                              <span className="ml-1.5 text-[10px] text-[#9A9AA3] line-through">
                                ₹{Number(p.original_price).toLocaleString('en-IN')}
                              </span>
                            )}
                          </td>

                          {/* Editable Stock */}
                          <td className="py-3 px-4 text-center">
                            {isStockEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={tempStockValue}
                                  onChange={(e) => setTempStockValue(e.target.value)}
                                  className="w-16 bg-[#0A0A0D] border border-[#8B5CF6] text-xs text-white text-center py-1 font-mono-numbers"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveStock(p.id)}
                                  className="p-1 text-emerald-400 hover:text-white"
                                  title="Save Stock"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStockId(null)}
                                  className="p-1 text-[#9A9AA3] hover:text-white"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingStockId(p.id);
                                  setTempStockValue(String(p.stock || 0));
                                }}
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer border ${
                                  Number(p.stock) <= 0
                                    ? 'bg-red-950/60 text-red-300 border-red-800'
                                    : Number(p.stock) <= 5
                                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                                    : 'bg-[#0A0A0D] text-white border-[#2A2A32] hover:border-[#8B5CF6]'
                                }`}
                                title="Click to adjust stock"
                              >
                                <span className="font-mono-numbers font-bold text-xs">{p.stock || 0}</span>
                                <Edit2 size={10} className="text-[#9A9AA3]" />
                              </div>
                            )}
                          </td>

                          {/* Live Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(p)}
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                                p.is_active
                                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-[#1B1B22] text-[#9A9AA3] border border-[#2A2A32] hover:text-white'
                              }`}
                            >
                              {p.is_active ? 'Published' : 'Hidden'}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {p.badge && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#8B5CF6]/30 text-[#8B5CF6] border border-[#8B5CF6]/50">
                                  {p.badge}
                                </span>
                              )}
                              {p.is_new_arrival && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40">
                                  NEW
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 bg-[#1B1B22] hover:bg-[#8B5CF6] text-[#C7CBD3] hover:text-white transition-colors"
                                title="Edit Product Details & Images"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductToDelete(p)}
                                className="p-1.5 bg-[#1B1B22] hover:bg-red-700 text-[#9A9AA3] hover:text-white transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 3: CATEGORIES MANAGEMENT
              ================================================================ */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#15151B] border border-[#2A2A32]">
                <p className="text-xs text-[#9A9AA3]">
                  Categories structure your navigation and product discovery filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCategoryModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const prodCount = products.filter(
                    (p) => (p.category_name || p.category || '').toLowerCase() === cat.name.toLowerCase()
                  ).length;

                  return (
                    <div
                      key={cat.id || cat.name}
                      className="p-5 bg-[#15151B] border border-[#2A2A32] flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-display text-base font-bold text-white uppercase">
                            {cat.name}
                          </h4>
                          <span className="font-mono-numbers text-[10px] text-[#00D9FF] bg-[#0A0A0D] px-2 py-0.5 border border-[#2A2A32]">
                            {prodCount} Pieces
                          </span>
                        </div>
                        <p className="font-mono-numbers text-[11px] text-[#9A9AA3] mt-1">
                          /{cat.slug}
                        </p>
                        {cat.description && (
                          <p className="text-xs text-[#9A9AA3] mt-2 line-clamp-2">
                            {cat.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#2A2A32] flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsCategoryModalOpen(true);
                          }}
                          className="px-3 py-1 bg-[#1B1B22] hover:bg-[#8B5CF6] text-white text-[11px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 4: ORDERS MANAGEMENT
              ================================================================ */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Order Search & Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-[#15151B] border border-[#2A2A32]">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9AA3]" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order #, customer name or email..."
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white pl-10 pr-4 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  {['all', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                        orderStatusFilter === st
                          ? 'bg-[#8B5CF6] text-white font-bold'
                          : 'bg-[#0A0A0D] text-[#9A9AA3] hover:text-white border border-[#2A2A32]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-[#15151B] border border-[#2A2A32] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0A0D] text-[10px] uppercase tracking-wider text-[#9A9AA3] border-b border-[#2A2A32]">
                    <tr>
                      <th className="py-3 px-4">Order #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Verified Payment</th>
                      <th className="py-3 px-4">Fulfillment Status</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A32]/60">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#9A9AA3]">
                          No orders matched current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#1A1A22]/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono-numbers font-bold text-white">
                            #{ord.order_number}
                          </td>
                          <td className="py-3.5 px-4 text-[#9A9AA3] font-mono-numbers text-[11px]">
                            {new Date(ord.created_at).toLocaleDateString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white">{ord.customer_name || 'Customer'}</p>
                            <p className="text-[10px] text-[#9A9AA3]">{ord.customer_email}</p>
                          </td>
                          <td className="py-3.5 px-4 font-mono-numbers text-center">
                            {Array.isArray(ord.order_items) ? ord.order_items.length : 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              (ord.payment_status || '').toLowerCase() === 'paid'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                : 'bg-amber-950/60 text-amber-400 border border-amber-800'
                            }`}>
                              {ord.payment_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={ord.order_status || 'Processing'}
                              onChange={(e) => handleQuickOrderStatus(ord.id, e.target.value)}
                              className="bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white px-2 py-1 focus:outline-none"
                            >
                              <option value="Processing">Processing</option>
                              <option value="Paid">Paid</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-numbers font-bold text-[#00D9FF]">
                            ₹{Number(ord.total || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setIsOrderDetailOpen(true);
                              }}
                              className="px-3 py-1 bg-[#1B1B22] hover:bg-[#8B5CF6] text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 5: CUSTOMERS MANAGEMENT
              ================================================================ */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-[#15151B] border border-[#2A2A32]">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9AA3]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by customer name or email..."
                    className="w-full bg-[#0A0A0D] border border-[#2A2A32] focus:border-[#8B5CF6] text-xs text-white pl-10 pr-4 py-2.5 focus:outline-none"
                  />
                </div>
                <span className="font-mono-numbers text-xs text-[#9A9AA3]">
                  {customersList.length} Verified Operatives
                </span>
              </div>

              <div className="bg-[#15151B] border border-[#2A2A32] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0A0A0D] text-[10px] uppercase tracking-wider text-[#9A9AA3] border-b border-[#2A2A32]">
                    <tr>
                      <th className="py-3 px-4">Operative</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-center">Orders</th>
                      <th className="py-3 px-4 text-right">Total Spent</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A32]/60">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#9A9AA3]">
                          No customer dossiers found.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => (
                        <tr key={cust.email} className="hover:bg-[#1A1A22]/40 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            {cust.name}
                          </td>
                          <td className="py-3.5 px-4 text-[#C7CBD3]">
                            <p>{cust.email}</p>
                            {cust.phone && <p className="text-[10px] text-[#9A9AA3] font-mono-numbers">{cust.phone}</p>}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono-numbers font-bold text-white">
                            {cust.orderCount}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-numbers font-bold text-[#00D9FF]">
                            ₹{Number(cust.totalSpent || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setIsCustomerDetailOpen(true);
                              }}
                              className="px-3 py-1 bg-[#1B1B22] hover:bg-[#8B5CF6] text-white text-[11px] font-bold uppercase tracking-wider transition-colors"
                            >
                              Dossier
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 6: ANALYTICS
              ================================================================ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-[#15151B] border border-[#2A2A32]">
                  <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider">Average Order Value (AOV)</span>
                  <p className="font-mono-numbers text-2xl font-bold text-white mt-2">
                    ₹{stats.verifiedCount > 0 ? Math.round(stats.totalRevenue / stats.verifiedCount).toLocaleString('en-IN') : 0}
                  </p>
                  <p className="text-[11px] text-[#9A9AA3] mt-1">Per completed transaction</p>
                </div>

                <div className="p-5 bg-[#15151B] border border-[#2A2A32]">
                  <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider">Fulfillment Rate</span>
                  <p className="font-mono-numbers text-2xl font-bold text-emerald-400 mt-2">
                    {stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 100}%
                  </p>
                  <p className="text-[11px] text-[#9A9AA3] mt-1">Dispatched & delivered</p>
                </div>

                <div className="p-5 bg-[#15151B] border border-[#2A2A32]">
                  <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider">Catalog Health</span>
                  <p className="font-mono-numbers text-2xl font-bold text-[#00D9FF] mt-2">
                    {products.filter((p) => p.is_active).length} / {products.length}
                  </p>
                  <p className="text-[11px] text-[#9A9AA3] mt-1">Active live pieces</p>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  Hardware Distribution by Category
                </h3>
                <div className="space-y-3">
                  {categories.map((c) => {
                    const count = products.filter(
                      (p) => (p.category_name || p.category || '').toLowerCase() === c.name.toLowerCase()
                    ).length;
                    const pct = products.length > 0 ? Math.round((count / products.length) * 100) : 0;

                    return (
                      <div key={c.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-white">{c.name}</span>
                          <span className="font-mono-numbers text-[#9A9AA3]">
                            {count} pieces ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#0A0A0D] overflow-hidden">
                          <div
                            className="h-full bg-[#8B5CF6] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 7: SETTINGS & SQL SECURITY MIGRATION
              ================================================================ */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Account Credentials Card */}
              <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                    Administrator Session Info
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-[#0A0A0D] border border-[#2A2A32]">
                    <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider block">Admin Email</span>
                    <span className="font-bold text-white font-mono-numbers mt-1 block">{user?.email}</span>
                  </div>
                  <div className="p-3 bg-[#0A0A0D] border border-[#2A2A32]">
                    <span className="text-[10px] uppercase text-[#9A9AA3] tracking-wider block">Database Role</span>
                    <span className="font-bold text-[#8B5CF6] uppercase font-mono-numbers mt-1 block">
                      {profile?.role || 'admin'} (RLS Superuser)
                    </span>
                  </div>
                </div>
              </div>

              {/* SQL Migration Script Copy Box */}
              <div className="p-6 bg-[#15151B] border border-[#2A2A32] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#00D9FF] font-semibold">
                      DATABASE HARDENING
                    </span>
                    <h3 className="font-display text-base font-bold uppercase text-white mt-0.5">
                      Supabase SQL Security Migration
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sqlContent = `-- Run in Supabase SQL Editor\nUPDATE public.profiles\nSET role = 'admin'\nWHERE email = '${user?.email || 'YOUR_EMAIL'}';`;
                      navigator.clipboard.writeText(sqlContent);
                      showToast('Copied to Clipboard', 'SQL snippet copied.', 'success');
                    }}
                    className="px-3 py-1.5 bg-[#1B1B22] hover:bg-[#8B5CF6] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>Copy Role SQL</span>
                  </button>
                </div>

                <p className="text-xs text-[#9A9AA3] leading-relaxed">
                  Your migration file is stored in <code>/supabase/migrations/20261031_admin_panel_security.sql</code>. It secures products, categories, orders, customers and image storage with Row Level Security (RLS).
                </p>

                <div className="bg-[#0A0A0D] border border-[#2A2A32] p-4 text-[11px] font-mono-numbers space-y-2">
                  <p className="text-[#C7CBD3]">To promote any newly created account to Admin, run in Supabase SQL Editor:</p>
                  <pre className="text-[#00D9FF] bg-[#15151B] p-3 overflow-x-auto select-all">
                    {`UPDATE public.profiles\nSET role = 'admin'\nWHERE email = '${user?.email || 'YOUR_EMAIL@domain.com'}';`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================
          MODALS
          ==================================================================== */}
      {/* Product Modal (Add / Edit) */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsProductModalOpen(false)}
        onSaved={loadDashboardData}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        category={editingCategory}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaved={loadDashboardData}
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={isOrderDetailOpen}
        order={selectedOrder}
        onClose={() => setIsOrderDetailOpen(false)}
        onUpdated={loadDashboardData}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        isOpen={isCustomerDetailOpen}
        customer={selectedCustomer}
        onClose={() => setIsCustomerDetailOpen(false)}
        onViewOrder={(ord) => {
          setSelectedOrder(ord);
          setIsOrderDetailOpen(true);
        }}
      />

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#15151B] border border-red-900/60 p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 size={20} />
            </div>
            <div className="text-center">
              <h3 className="font-display text-base font-bold uppercase text-white">
                Delete Product Piece?
              </h3>
              <p className="text-xs text-[#9A9AA3] mt-2 leading-relaxed">
                Are you sure you want to permanently delete <strong>{productToDelete.name}</strong> from your catalogue? This action cannot be reversed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 border border-[#2A2A32] text-xs font-semibold text-[#9A9AA3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingProduct}
                onClick={confirmDeleteProduct}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {deletingProduct ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
