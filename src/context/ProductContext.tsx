import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { fetchAllProducts, fetchCategories } from '../services/productService';
import { setRuntimeProductsCache } from '../services/cartService';
import { PRODUCTS, CATEGORIES_DATA } from '../data/products';

interface ProductContextType {
  products: Product[];
  categories: typeof CATEGORIES_DATA;
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  getProduct: (idOrSlug: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categories, setCategories] = useState<typeof CATEGORIES_DATA>(CATEGORIES_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedProducts, fetchedCategories] = await Promise.all([
        fetchAllProducts(force),
        fetchCategories(),
      ]);

      if (fetchedProducts && fetchedProducts.length > 0) {
        setProducts(fetchedProducts);
        setRuntimeProductsCache(fetchedProducts);
      }
      if (fetchedCategories && fetchedCategories.length > 0) {
        setCategories(fetchedCategories as any);
      }
    } catch (err: unknown) {
      console.warn('Error loading products from Supabase, using catalog fallback:', err);
      // Keep local PRODUCTS
      setProducts(PRODUCTS);
      setRuntimeProductsCache(PRODUCTS);
      setCategories(CATEGORIES_DATA);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshProducts = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const getProduct = useCallback(
    (idOrSlug: string) => {
      return products.find((p) => p.slug === idOrSlug || p.id === idOrSlug);
    },
    [products]
  );

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isLoading,
        error,
        refreshProducts,
        getProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
